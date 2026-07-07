import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, NO_EPIC, bucketByState, filterTickets } from './filters';
import type { Ticket } from './api';

function ticket(p: Partial<Ticket> & Pick<Ticket, 'id'>): Ticket {
  return {
    teamId: 't1',
    type: 'bug',
    state: 'new',
    epicId: null,
    title: 'Untitled',
    body: 'body',
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    ...p,
  };
}

describe('filterTickets (AND-combined, case-insensitive title search)', () => {
  const tickets = [
    ticket({ id: '1', type: 'bug', epicId: 'e1', title: 'Login crashes' }),
    ticket({ id: '2', type: 'feature', epicId: 'e1', title: 'Add LOGIN button' }),
    ticket({ id: '3', type: 'bug', epicId: 'e2', title: 'Logout broken' }),
    ticket({ id: '4', type: 'bug', epicId: null, title: 'Nav flicker' }),
  ];

  it('returns everything with empty filters', () => {
    expect(filterTickets(tickets, EMPTY_FILTERS).map((t) => t.id)).toEqual(['1', '2', '3', '4']);
  });

  it('matches title case-insensitively (substring)', () => {
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, q: 'login' }).map((t) => t.id)).toEqual([
      '1',
      '2',
    ]);
  });

  it('AND-combines type + epic + search', () => {
    const out = filterTickets(tickets, { type: 'bug', epicId: 'e1', q: 'login' });
    expect(out.map((t) => t.id)).toEqual(['1']);
  });

  it('supports the "no epic" sentinel', () => {
    expect(filterTickets(tickets, { ...EMPTY_FILTERS, epicId: NO_EPIC }).map((t) => t.id)).toEqual([
      '4',
    ]);
  });
});

describe('bucketByState (five columns, most-recently-modified first)', () => {
  it('groups into all five columns and orders each newest-first', () => {
    const tickets = [
      ticket({ id: 'a', state: 'new', modifiedAt: '2026-01-01T00:00:00.000Z' }),
      ticket({ id: 'b', state: 'new', modifiedAt: '2026-03-01T00:00:00.000Z' }),
      ticket({ id: 'c', state: 'new', modifiedAt: '2026-02-01T00:00:00.000Z' }),
      ticket({ id: 'd', state: 'done' }),
    ];
    const buckets = bucketByState(tickets);
    expect(Object.keys(buckets)).toEqual([
      'new',
      'ready_for_implementation',
      'in_progress',
      'ready_for_acceptance',
      'done',
    ]);
    expect(buckets.new.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(buckets.done.map((t) => t.id)).toEqual(['d']);
    expect(buckets.in_progress).toEqual([]);
  });
});
