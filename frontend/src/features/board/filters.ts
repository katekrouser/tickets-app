/**
 * Client-side board filtering + column bucketing (A12) — pure functions, cheap to memoize.
 *
 * Filters AND-combine (REQUIREMENTS §8): a ticket is kept only if it matches EVERY active filter.
 * Title search is a case-insensitive substring match. Bucketing groups the surviving tickets into
 * the five state columns, each ordered most-recently-modified first (ISO-8601 timestamps sort
 * lexicographically == chronologically).
 */
import { COLUMN_ORDER } from './labels';
import type { Ticket } from './api';
import type { TicketState, TicketType } from '@app/shared';

/** Sentinel epic-filter value meaning "tickets with no epic". */
export const NO_EPIC = '__none__';

export interface BoardFilters {
  /** '' = any type. */
  type: TicketType | '';
  /** '' = any epic; NO_EPIC = tickets without an epic; otherwise an epic id. */
  epicId: string;
  /** Case-insensitive title substring. */
  q: string;
}

export const EMPTY_FILTERS: BoardFilters = { type: '', epicId: '', q: '' };

export function filterTickets(tickets: Ticket[], f: BoardFilters): Ticket[] {
  const needle = f.q.trim().toLowerCase();
  return tickets.filter((t) => {
    if (f.type && t.type !== f.type) return false;
    if (f.epicId === NO_EPIC) {
      if (t.epicId != null) return false;
    } else if (f.epicId && t.epicId !== f.epicId) {
      return false;
    }
    if (needle && !t.title.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export type Buckets = Record<TicketState, Ticket[]>;

export function bucketByState(tickets: Ticket[]): Buckets {
  const buckets = Object.fromEntries(COLUMN_ORDER.map((s) => [s, [] as Ticket[]])) as Buckets;
  for (const t of tickets) {
    // A ticket whose state is somehow off-workflow is simply not shown in any column.
    if (buckets[t.state]) buckets[t.state].push(t);
  }
  for (const state of COLUMN_ORDER) {
    buckets[state].sort((a, b) =>
      a.modifiedAt < b.modifiedAt ? 1 : a.modifiedAt > b.modifiedAt ? -1 : 0,
    );
  }
  return buckets;
}
