/**
 * Ticket domain logic (A7) — REQUIREMENTS §6 (tickets) + §8 (Kanban board query).
 *
 * Pure service functions consumed by the Fastify plugin in ./index.ts. All DB
 * access goes through the frozen singleton `prisma` (ADR-0002); domain outcomes
 * are signalled by throwing DomainError subclasses (ADR-0003) which A4's central
 * error handler maps to the wire ErrorBody.
 *
 * Invariants enforced here (server-side; client validation is insufficient, §6):
 *   - Referenced team must exist; referenced epic (if any) must exist AND belong
 *     to the ticket's team, else `EPIC_TEAM_MISMATCH` (400) — checked on create
 *     AND update (including a team change that orphans the current epic).
 *   - `createdBy` / `createdAt` are server-set (never trusted from the client).
 *   - `modifiedAt` advances ONLY on a real field/state change: we dirty-check and
 *     skip the write entirely for a no-op save (the schema's `@updatedAt` would
 *     otherwise bump it on every `update`). Adding a comment lives in the comments
 *     module (A8) and never calls into this service, so it cannot touch modifiedAt.
 *   - Deleting a ticket cascades to its comments via the FK ON DELETE CASCADE (A3).
 */
import { prisma } from 'backend/src/db';
import { NotFoundError, ValidationError } from 'backend/src/core/errors';
import type { components } from '@app/shared';
import type { Prisma, Ticket } from '@prisma/client';

type TicketCreateInput = components['schemas']['TicketCreateRequest'];
type TicketUpdateInput = components['schemas']['TicketUpdateRequest'];

export interface ListTicketsQuery {
  /** Required — the team whose board to list. */
  teamId: string;
  /** Optional ticket-type filter. */
  type?: components['schemas']['TicketType'];
  /** Optional epic filter. */
  epicId?: string;
  /** Optional case-insensitive substring search over the title. */
  q?: string;
}

/**
 * Reference validation shared by create + update. Confirms the team exists and,
 * when an epic is referenced, that it exists and belongs to the SAME team.
 */
async function validateReferences(teamId: string, epicId: string | null): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', 'Team does not exist.');
  }
  if (epicId !== null) {
    const epic = await prisma.epic.findUnique({
      where: { id: epicId },
      select: { id: true, teamId: true },
    });
    if (!epic) {
      throw new NotFoundError('EPIC_NOT_FOUND', 'Epic does not exist.');
    }
    if (epic.teamId !== teamId) {
      throw new ValidationError('EPIC_TEAM_MISMATCH', "Epic must belong to the ticket's team.");
    }
  }
}

/**
 * Trim per §6 and reject an empty result. Schema `minLength: 1` only guards the
 * raw string, so a whitespace-only title/body (e.g. `" "`) passes validation but
 * is empty after trim — caught here as 400 VALIDATION_ERROR (matching the
 * trim-and-reject pattern in Teams `normalizeName` / Epics `normalizeTitle`).
 */
function normalizeText(raw: string, field: 'Title' | 'Body'): string {
  const value = raw.trim();
  if (value.length === 0) {
    throw new ValidationError(
      'VALIDATION_ERROR',
      `Ticket ${field.toLowerCase()} must not be empty after trimming whitespace.`,
    );
  }
  return value;
}

/** Create a ticket. `createdBy` and timestamps are server-set. */
export async function createTicket(input: TicketCreateInput, authUserId: string): Promise<Ticket> {
  const epicId = input.epicId ?? null;
  await validateReferences(input.teamId, epicId);

  const data: Prisma.TicketUncheckedCreateInput = {
    teamId: input.teamId,
    type: input.type,
    title: normalizeText(input.title, 'Title'), // §6: non-empty after trim
    body: normalizeText(input.body, 'Body'), // §6: required, non-empty
    epicId,
    createdBy: authUserId, // server-set from the authenticated user (§6)
  };
  // `state` is optional in the contract; DB default is `new` when omitted.
  if (input.state) {
    data.state = input.state;
  }

  return prisma.ticket.create({ data });
}

/** Fetch a single ticket with all fields, or 404. */
export async function getTicket(id: string): Promise<Ticket> {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new NotFoundError('TICKET_NOT_FOUND', 'Ticket does not exist.');
  }
  return ticket;
}

/**
 * Partial update. `modifiedAt` advances only when a field actually changes:
 * we compute the changed columns and, on a no-op, return the current row WITHOUT
 * issuing a write (so `@updatedAt` never fires).
 */
export async function updateTicket(id: string, input: TicketUpdateInput): Promise<Ticket> {
  const current = await prisma.ticket.findUnique({ where: { id } });
  if (!current) {
    throw new NotFoundError('TICKET_NOT_FOUND', 'Ticket does not exist.');
  }

  // Effective post-update references. When only the team changes, the *existing*
  // epic must still belong to the new team, else EPIC_TEAM_MISMATCH (§6 rule that
  // a team change requires a compatible epic or clearing it).
  const touchesRefs = 'teamId' in input || 'epicId' in input;
  if (touchesRefs) {
    const effectiveTeamId = input.teamId ?? current.teamId;
    const effectiveEpicId = 'epicId' in input ? (input.epicId ?? null) : current.epicId;
    await validateReferences(effectiveTeamId, effectiveEpicId);
  }

  // Dirty-check: only include columns whose value truly differs.
  const data: Prisma.TicketUncheckedUpdateInput = {};
  if (input.type !== undefined && input.type !== current.type) data.type = input.type;
  if (input.state !== undefined && input.state !== current.state) data.state = input.state;
  // §6: trim-and-reject free text. An absent field is left untouched (no
  // trim, no compare) so the modifiedAt no-op behavior is preserved; a present
  // field is trimmed before the dirty-check so a value that trims to the
  // current stored value is still a no-op.
  if (input.title !== undefined) {
    const title = normalizeText(input.title, 'Title');
    if (title !== current.title) data.title = title;
  }
  if (input.body !== undefined) {
    const body = normalizeText(input.body, 'Body');
    if (body !== current.body) data.body = body;
  }
  if (input.teamId !== undefined && input.teamId !== current.teamId) data.teamId = input.teamId;
  if ('epicId' in input) {
    const nextEpicId = input.epicId ?? null;
    if (nextEpicId !== current.epicId) data.epicId = nextEpicId;
  }

  if (Object.keys(data).length === 0) {
    // No real change → skip the write so modifiedAt is preserved (§6).
    return current;
  }

  return prisma.ticket.update({ where: { id }, data });
}

/** Delete a ticket; its comments are removed by the FK ON DELETE CASCADE (A3). */
export async function deleteTicket(id: string): Promise<void> {
  try {
    await prisma.ticket.delete({ where: { id } });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      throw new NotFoundError('TICKET_NOT_FOUND', 'Ticket does not exist.');
    }
    throw err;
  }
}

/**
 * Board/list query (§8). Filters (type, epicId, q) are AND-combined with the
 * required team filter; `q` is a case-insensitive substring match over the title.
 * Ordered most-recently-modified first. The team filter is backed by the
 * `tickets_team_id_idx` index (A3), keeping the query performant at ≥100 tickets.
 */
export async function listTickets(query: ListTicketsQuery): Promise<Ticket[]> {
  const where: Prisma.TicketWhereInput = { teamId: query.teamId };
  if (query.type) where.type = query.type;
  if (query.epicId) where.epicId = query.epicId;
  if (query.q && query.q.length > 0) {
    where.title = { contains: query.q, mode: 'insensitive' };
  }

  return prisma.ticket.findMany({ where, orderBy: { modifiedAt: 'desc' } });
}
