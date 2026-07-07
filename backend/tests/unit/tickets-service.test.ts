import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Ticket domain invariants (A7, REQUIREMENTS §6/§8) — the highest-risk business
 * logic in the app. The Prisma singleton (ADR-0002) is mocked so we can assert
 * exactly which writes happen:
 *
 *   - modifiedAt advances ONLY on a real field/state change (a no-op save must
 *     NOT issue an update at all, so @updatedAt never fires);
 *   - epic must belong to the ticket's team (create AND update, incl. a team
 *     change that would orphan the current epic) → EPIC_TEAM_MISMATCH;
 *   - createdBy is server-set from the authenticated user;
 *   - listTickets AND-combines filters and orders most-recently-modified first.
 */
const { prisma } = vi.hoisted(() => ({
  prisma: {
    team: { findUnique: vi.fn() },
    epic: { findUnique: vi.fn() },
    ticket: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('backend/src/db', () => ({ prisma }));

import {
  createTicket,
  updateTicket,
  listTickets,
  deleteTicket,
} from 'backend/src/modules/tickets/service.js';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';

function baseTicket(over: Record<string, unknown> = {}) {
  return {
    id: 'tk-1',
    teamId: TEAM_A,
    type: 'bug',
    state: 'new',
    title: 'Title',
    body: 'Body',
    epicId: null,
    createdBy: 'u-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    modifiedAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.team.findUnique.mockResolvedValue({ id: TEAM_A });
  prisma.epic.findUnique.mockResolvedValue({ id: 'ep-1', teamId: TEAM_A });
});

describe('createTicket', () => {
  it('server-sets createdBy from the authenticated user', async () => {
    prisma.ticket.create.mockResolvedValue(baseTicket());
    await createTicket(
      { teamId: TEAM_A, type: 'bug', title: 'T', body: 'B' } as any,
      'auth-user-42',
    );
    expect(prisma.ticket.create).toHaveBeenCalledOnce();
    const data = prisma.ticket.create.mock.calls[0][0].data;
    expect(data.createdBy).toBe('auth-user-42');
  });

  it('rejects a non-existent team with TEAM_NOT_FOUND (404)', async () => {
    prisma.team.findUnique.mockResolvedValue(null);
    await expect(
      createTicket({ teamId: 'ghost', type: 'bug', title: 'T', body: 'B' } as any, 'u'),
    ).rejects.toMatchObject({ code: 'TEAM_NOT_FOUND', status: 404 });
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('rejects an epic from a different team with EPIC_TEAM_MISMATCH (400)', async () => {
    prisma.epic.findUnique.mockResolvedValue({ id: 'ep-x', teamId: TEAM_B });
    await expect(
      createTicket(
        { teamId: TEAM_A, type: 'bug', title: 'T', body: 'B', epicId: 'ep-x' } as any,
        'u',
      ),
    ).rejects.toMatchObject({ code: 'EPIC_TEAM_MISMATCH', status: 400 });
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });
});

describe('R4-M1 — free-text trim-and-reject (§6, create AND update)', () => {
  it('rejects a whitespace-only title on create → VALIDATION_ERROR (400)', async () => {
    await expect(
      createTicket({ teamId: TEAM_A, type: 'bug', title: '   ', body: 'B' } as any, 'u'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only body on create → VALIDATION_ERROR (400)', async () => {
    await expect(
      createTicket({ teamId: TEAM_A, type: 'bug', title: 'T', body: ' \t\n ' } as any, 'u'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('stores leading/trailing-whitespace title and body TRIMMED on create', async () => {
    prisma.ticket.create.mockResolvedValue(baseTicket());
    await createTicket(
      { teamId: TEAM_A, type: 'bug', title: '  Padded Title  ', body: '\n Padded Body \t' } as any,
      'u',
    );
    const data = prisma.ticket.create.mock.calls[0][0].data;
    expect(data.title).toBe('Padded Title');
    expect(data.body).toBe('Padded Body');
  });

  it('rejects a whitespace-only title on update → VALIDATION_ERROR (400)', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket());
    await expect(updateTicket('tk-1', { title: '   ' } as any)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only body on update → VALIDATION_ERROR (400)', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket());
    await expect(updateTicket('tk-1', { body: ' \t ' } as any)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('stores a leading/trailing-whitespace value TRIMMED on update', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket({ title: 'Old', body: 'Body' }));
    prisma.ticket.update.mockResolvedValue(baseTicket({ title: 'New' }));
    await updateTicket('tk-1', { title: '  New  ' } as any);
    expect(prisma.ticket.update).toHaveBeenCalledOnce();
    // Trimmed before the dirty-check, so the stored value carries no padding.
    expect(prisma.ticket.update.mock.calls[0][0].data).toEqual({ title: 'New' });
  });
});

describe('updateTicket — modifiedAt only advances on a REAL change (§6)', () => {
  it('does NOT write when every submitted value equals the current value', async () => {
    const current = baseTicket({ type: 'bug', state: 'new', title: 'Same', body: 'Same' });
    prisma.ticket.findUnique.mockResolvedValue(current);
    const result = await updateTicket('tk-1', {
      type: 'bug',
      state: 'new',
      title: 'Same',
      body: 'Same',
    } as any);
    // Crown-jewel invariant: no update issued → @updatedAt cannot fire.
    expect(prisma.ticket.update).not.toHaveBeenCalled();
    expect(result).toBe(current);
  });

  it('writes ONLY the fields that truly changed on a real edit', async () => {
    const current = baseTicket({ state: 'new', title: 'Old' });
    prisma.ticket.findUnique.mockResolvedValue(current);
    prisma.ticket.update.mockResolvedValue(baseTicket({ state: 'in_progress', title: 'New' }));
    await updateTicket('tk-1', { state: 'in_progress', title: 'New', type: 'bug' } as any);
    expect(prisma.ticket.update).toHaveBeenCalledOnce();
    const data = prisma.ticket.update.mock.calls[0][0].data;
    // type was unchanged (bug === bug) so it must be omitted from the write.
    expect(data).toEqual({ state: 'in_progress', title: 'New' });
  });

  it('persists a drag-and-drop state change', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket({ state: 'new' }));
    prisma.ticket.update.mockResolvedValue(baseTicket({ state: 'done' }));
    await updateTicket('tk-1', { state: 'done' } as any);
    expect(prisma.ticket.update.mock.calls[0][0].data).toEqual({ state: 'done' });
  });

  it('rejects a team change that orphans the current epic (EPIC_TEAM_MISMATCH)', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket({ teamId: TEAM_A, epicId: 'ep-1' }));
    // Current epic belongs to TEAM_A; moving the ticket to TEAM_B orphans it.
    prisma.epic.findUnique.mockResolvedValue({ id: 'ep-1', teamId: TEAM_A });
    prisma.team.findUnique.mockResolvedValue({ id: TEAM_B });
    await expect(updateTicket('tk-1', { teamId: TEAM_B } as any)).rejects.toMatchObject({
      code: 'EPIC_TEAM_MISMATCH',
    });
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('404s on a missing ticket', async () => {
    prisma.ticket.findUnique.mockResolvedValue(null);
    await expect(updateTicket('ghost', { title: 'x' } as any)).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
      status: 404,
    });
  });
});

describe('listTickets (§8 board query)', () => {
  it('AND-combines team + type + epic + case-insensitive title search, newest-first', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);
    await listTickets({ teamId: TEAM_A, type: 'bug', epicId: 'ep-1', q: 'login' });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith({
      where: {
        teamId: TEAM_A,
        type: 'bug',
        epicId: 'ep-1',
        title: { contains: 'login', mode: 'insensitive' },
      },
      orderBy: { modifiedAt: 'desc' },
    });
  });

  it('omits inactive filters', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);
    await listTickets({ teamId: TEAM_A });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith({
      where: { teamId: TEAM_A },
      orderBy: { modifiedAt: 'desc' },
    });
  });
});

describe('deleteTicket', () => {
  it('maps a missing row (P2025) to TICKET_NOT_FOUND (404)', async () => {
    prisma.ticket.delete.mockRejectedValue({ code: 'P2025' });
    await expect(deleteTicket('ghost')).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
      status: 404,
    });
  });
});
