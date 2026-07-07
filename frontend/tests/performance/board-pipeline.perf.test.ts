import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, bucketByState, filterTickets } from '@/features/board/filters';
import type { Ticket } from '@/features/board/api';

/**
 * PERFORMANCE budget for the board's pure data pipeline at scale (REQUIREMENTS §8:
 * "usable with ≥100 tickets"; Risk #11). filterTickets + bucketByState are the hot
 * path re-run on every keystroke/filter/drag, so they must stay well under budget.
 *
 * This is the RUNNABLE half of the performance story (no DOM needed). The full
 * render/interaction budget (mount + drag at ≥100 cards) lives in the DOM-gated
 * suite tests/performance/board-render.perf.test.tsx (execute in CI with jsdom).
 */
const STATES = ['new', 'ready_for_implementation', 'in_progress', 'ready_for_acceptance', 'done'] as const;
const TYPES = ['bug', 'feature', 'fix'] as const;

function makeTickets(n: number): Ticket[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t-${i}`,
    teamId: 'team-1',
    type: TYPES[i % TYPES.length],
    state: STATES[i % STATES.length],
    epicId: i % 4 === 0 ? `epic-${i % 5}` : null,
    title: `Ticket number ${i} — login/logout flow ${i % 7}`,
    body: 'body',
    createdBy: 'u1',
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
    modifiedAt: new Date(Date.now() - i * 500).toISOString(),
  }));
}

describe('board pipeline performance (≥100 tickets)', () => {
  it('filters + buckets 200 tickets in well under 50ms per pass', () => {
    const tickets = makeTickets(200);
    const BUDGET_MS = 50;

    // Warm up (JIT), then measure a representative filter+bucket pass.
    for (let i = 0; i < 3; i++) bucketByState(filterTickets(tickets, EMPTY_FILTERS));

    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      const filtered = filterTickets(tickets, { type: 'bug', epicId: '', q: 'login' });
      bucketByState(filtered);
    }
    const perPass = (performance.now() - start) / 20;

    expect(perPass).toBeLessThan(BUDGET_MS);
  });

  it('bucketing keeps each column ordered most-recently-modified first', () => {
    const buckets = bucketByState(makeTickets(150));
    for (const state of STATES) {
      const col = buckets[state];
      for (let i = 1; i < col.length; i++) {
        expect(col[i - 1].modifiedAt >= col[i].modifiedAt).toBe(true);
      }
    }
  });
});
