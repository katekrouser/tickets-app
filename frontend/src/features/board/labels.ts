/**
 * Board display labels + column ordering (A12).
 *
 * The canonical API enum values live in `@app/shared` (single source of truth). The board renders
 * human-readable labels for them (REQUIREMENTS §6/§8) and lays the five state columns out in the
 * fixed workflow order defined by `TICKET_STATES`.
 */
import { TICKET_STATES, type TicketState, type TicketType } from '@app/shared';

/** The five Kanban columns, in fixed workflow order (REQUIREMENTS §8). */
export const COLUMN_ORDER: readonly TicketState[] = TICKET_STATES;

const STATE_LABELS: Record<TicketState, string> = {
  new: 'New',
  ready_for_implementation: 'Ready for Implementation',
  in_progress: 'In Progress',
  ready_for_acceptance: 'Ready for Acceptance',
  done: 'Done',
};

const TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  fix: 'Fix',
};

export function stateLabel(state: TicketState): string {
  return STATE_LABELS[state] ?? state;
}

export function typeLabel(type: TicketType): string {
  return TYPE_LABELS[type] ?? type;
}
