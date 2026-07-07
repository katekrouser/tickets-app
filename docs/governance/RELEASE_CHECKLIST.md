# Release Checklist

> Owner: **A2**. Verified by **R3** (DoD) at GATE 4. A release may proceed only when every box is checked with
> evidence linked in [`../quality/evidence/INDEX.md`](../quality/evidence/INDEX.md).

- [ ] All §13 Definition-of-Done boxes PASS (R3 audit on a clean checkout).
- [ ] All quality gates green: A14 (unit/integration/E2E/perf/component/security + coverage + RTM), R0, R1, R2, R3, R4, R5 — zero unaddressed High/Critical.
- [ ] Requirement Traceability Matrix complete — every requirement has automated **and** manual verification.
- [ ] Technology audit clean: no unauthorized/duplicate/unused/deprecated/vulnerable dependency; stack matches the frozen TDR.
- [ ] No committed secrets; `.env.example` only.
- [ ] `docker compose up --build` succeeds from a clean checkout; fresh DB has schema + migration metadata only (no app data).
- [ ] CHANGELOG updated; Release Notes cut; Known Issues current; open P1 tech-debt resolved or explicitly accepted (ADR).
- [ ] All ADRs current; any stack change has a superseding ADR + logged TCR.
- [ ] Evidence repository INDEX confirms every required artifact exists and is linked.
- [ ] Version tag assigned (SemVer); CHANGELOG `[Unreleased]` rolled into the version.
- [ ] **Rollback plan verified** (see `FAILURE_RECOVERY.md`): last-good git tag/image recorded; every migration is reversible via a forward corrective migration (applied migrations never edited); documented `git revert` steps for the release; a change that regresses can be reverted and re-gated.
