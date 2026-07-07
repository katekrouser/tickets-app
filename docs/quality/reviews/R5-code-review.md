# R5 — Code Review (read-only, correctness/logic)

- **Reviewer:** R5 (Phase 3, correctness/logic; distinct from R0 architecture, R1 contract, R2 security, R3 DoD, R4 adversarial).
- **Scope:** `backend/` + `frontend/` merged codebase; invariants cross-checked against ADR-0002…0009 and REQUIREMENTS §3–§10.
- **Method:** read every changed module; traced each subtle invariant end-to-end.
- **Verdict:** No High/Critical correctness defects. All six mandated invariants are correctly implemented (see "Invariants verified"). Findings below are Medium/Low quality + edge-case issues routed to owners.

---

## Invariants verified (PASS — no defect)

These were the highest-risk items; each was traced in the actual code and is correct:

1. **`modified_at` not advanced on a no-op ticket save** — `updateTicket` dirty-checks each column against `current` and returns the existing row *without issuing a write* when nothing changed, so Prisma `@updatedAt` never fires. `backend/src/modules/tickets/service.ts:113-128`.
2. **`modified_at` not advanced on comment-add** — the comments module inserts a `comment` row only and never touches the parent ticket. `backend/src/modules/comments/index.ts:100-108`.
3. **Epic-belongs-to-team enforced on create AND edit** — `validateReferences` is called from `createTicket` and from `updateTicket` whenever `teamId` or `epicId` is present, including the team-change-orphans-epic case (`effectiveTeamId`/`effectiveEpicId`). `backend/src/modules/tickets/service.ts:43-60, 65, 106-111`.
4. **409 delete-guards (team/epic)** — both count dependents first and additionally trap the TOCTOU race via P2003/P2014 → 409. `backend/src/modules/teams/index.ts:180-200`, `backend/src/modules/epics/index.ts:177-194`.
5. **Verification token: 24h + single-use + resend-invalidation** — TTL is `24*60*60*1000` (`tokens.ts:14,22`); single-use is race-safe via `updateMany({ where:{ usedAt:null } })` inside a transaction (`service.ts:117-128`); resend deletes prior unused tokens before issuing a new one (`tokens.ts:32-34`, `service.ts:144-145`).
6. **DnD optimistic rollback** — `onMutate` snapshots the cache and applies the optimistic move; `onError` restores the snapshot; `onSuccess` reconciles the single server row. `frontend/src/features/board/api.ts:115-137`.

Note (not a bug): the frontend `verifyEmail` uses `parseAs:'text'`, but openapi-fetch parses **error** bodies as JSON regardless of `parseAs` (`node_modules/openapi-fetch/dist/index.js:244-250`), so `TOKEN_EXPIRED`/`TOKEN_USED`/`TOKEN_INVALID` codes are still surfaced correctly. I initially suspected a code-loss bug here; it does not exist.

---

## Findings (severity-ranked)

### M1 — Concurrent in-flight drags: one move's rollback clobbers another's optimistic state
- **File:** `frontend/src/features/board/api.ts:115-130` (`useMoveTicket` `onMutate`/`onError`)
- **Why wrong:** `onMutate` snapshots the *entire* team ticket list into `context.previous`, and `onError` restores that whole snapshot. If a user drops card A (mutation still in flight due to latency) and then drops card B, B's `onMutate` snapshots a list that already contains A's *unconfirmed* optimistic change. If A then fails, A's `onError` writes back A's older snapshot — which reverts B's optimistic move too (B visibly jumps back to its old column even though B's request may still succeed). It self-heals on B's `onSuccess`, but the intermediate UI is wrong. Whole-list rollback is the classic pitfall for per-item optimistic updates.
- **Owner:** A12 (Board)
- **Suggested fix:** roll back per-ticket instead of whole-list — in `onError`, restore only the single `ticketId`'s prior `{state, modifiedAt}` from context (capture the pre-image of that one card in `onMutate`), leaving other cards untouched. Alternatively serialize moves with a mutation scope/key so only one runs at a time.

### L1 — Ticket create/update/delete never invalidate the board list cache (+ duplicated cache keys)
- **File:** `frontend/src/features/tickets/api.ts:107-124` (create, no `onSuccess`), `126-148` (update sets only `['ticket',id]`), `150-163` (delete removes only `['ticket',id]`)
- **Why wrong:** The tickets feature caches under `ticketKeys` (`['ticket',id]`, `['teams']`, `['team-epics',teamId]`) while the board caches under separate `['board','tickets',teamId]` / `['board','teams']` keys (`frontend/src/features/board/api.ts:29-33`). A create/edit/delete therefore never touches the board's cached list. Freshness relies entirely on TanStack's default `refetchOnMount` when `BoardPage` remounts on navigation — which happens to work here but is implicit and fragile (any future keep-mounted navigation, or a raised `staleTime`, silently shows stale tickets). The two independent `teams` keys also double-fetch the same list and prevent cross-feature invalidation.
- **Owner:** A7/A13 (Tickets feature) with A12 (Board) — align on a shared query-key module.
- **Suggested fix:** on ticket create/update/delete `onSuccess`, `queryClient.invalidateQueries` the board tickets key for the affected team; consolidate `teams`/`epics` keys into one shared `KEYS` module used by both features.

### L2 — Team/Epic PATCH bumps `modified_at` on a no-op save (inconsistent with the ticket no-op rule)
- **File:** `backend/src/modules/teams/index.ts:150-165` (`updateTeam`), `backend/src/modules/epics/index.ts:143-162` (`updateEpic`)
- **Why wrong:** Unlike tickets, these handlers call `prisma.*.update(...)` unconditionally, so renaming a team to its current name, or PATCHing an epic with unchanged (or empty) fields, still fires Prisma `@updatedAt` and advances `modifiedAt` with no real change. REQUIREMENTS pins the no-op-preservation rule explicitly only for tickets (§6), so this is not a spec violation, but it is a behavioral inconsistency across the three entities and could surprise anyone relying on `modifiedAt` as a change marker. `updateEpic` with an empty body (`data === {}`) also issues a pointless write.
- **Owner:** A6 (Teams) / A15 (Epics)
- **Suggested fix:** apply the same dirty-check pattern used in tickets — fetch current, build `data` only for genuinely changed fields, and skip the write (return current) when nothing changed.

### L3 — `updateTicket` runs `validateReferences` (2 DB round-trips) even for a no-op save
- **File:** `backend/src/modules/tickets/service.ts:106-111` then `125-128`
- **Why wrong:** The form always sends `teamId` and `epicId`, so `touchesRefs` is always true and `validateReferences` (a team `findUnique` + an epic `findUnique`) runs on *every* "Save changes" — including saves where the dirty-check at line 125 then finds nothing changed and skips the write. Correctness is fine (`modifiedAt` is preserved), but it is two wasted queries per no-op edit. Not a hot path, so Low.
- **Owner:** A7 (Tickets)
- **Suggested fix:** compute the `data` dirty-set first; only call `validateReferences` when `data.teamId`/`data.epicId` are actually part of the change set.

### L4 — `VerifyEmailPage` effect guard won't re-verify if the `token` query param changes in place
- **File:** `frontend/src/features/auth/VerifyEmailPage.tsx:134-156`
- **Why wrong:** `startedRef` is set true on first run and never reset, while the effect depends on `[token]`. If `token` changed without a component remount, the new token would never be verified (effect early-returns on `startedRef.current`). In practice the token doesn't change in place (a new link is a fresh navigation/mount), so impact is negligible — but the guard and the dependency array disagree about intent. The StrictMode double-invoke protection itself is correct and necessary for single-use tokens.
- **Owner:** A11 (Auth screens)
- **Suggested fix:** reset `startedRef.current = false` in the effect cleanup, or drop `startedRef` and rely on the `cancelled` flag plus the single-use server guard (the server already 400s a re-spent token).

### L5 — Comment: whitespace-body check precedes ticket-existence check (status-code ordering)
- **File:** `backend/src/modules/comments/index.ts:96-100`
- **Why wrong:** Posting a whitespace-only body to a *non-existent* ticket returns `400 COMMENT_BODY_REQUIRED` instead of `404 TICKET_NOT_FOUND`. Harmless (both are error paths and Ajv already rejects empty bodies), but the resource-existence check conventionally comes first. Info/Low.
- **Owner:** A8 (Comments)
- **Suggested fix:** call `assertTicketExists(ticketId)` before the whitespace guard.

---

## Notes / non-issues reviewed and cleared
- `bucketByState` sorts by ISO-8601 string compare — valid because every timestamp (incl. the optimistic `new Date().toISOString()`) is same-format UTC (`frontend/src/features/board/filters.ts:49-53`, `board/api.ts:118`).
- `verifyEmail` service treats "no error envelope" as success and follows the backend 302→`/login`; correct given fetch's default `redirect:'follow'` and openapi-fetch's 204/empty handling.
- Transaction in `verifyEmail` checks expiry pre-transaction only, but the sub-ms gap against a 24h TTL is immaterial; single-use is fully race-safe via the `usedAt:null` guard.
- `deleteTicket`/team/epic P2025→404 and P2003/P2014→409 mappings are correct.
- `getMailer` caches a single transport (no per-send leak); config fail-fast in `loadConfig` is sound.
- `decodeUser` trusting JWT `exp` client-side is expected (server is authoritative) — deferred to R2, not a correctness bug.
</content>
</invoke>
