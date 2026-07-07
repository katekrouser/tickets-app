/**
 * A single Kanban column: a @dnd-kit/core droppable keyed by its `TicketState` (A12).
 * Dropping a card here sets the ticket's state to this column's state.
 */
import { useDroppable } from '@dnd-kit/core';
import type { Ticket } from '../api';
import type { TicketState } from '@app/shared';
import { stateLabel } from '../labels';
import { TicketCard } from './TicketCard';

interface Props {
  state: TicketState;
  tickets: Ticket[];
  onOpen: (id: string) => void;
}

export function Column({ state, tickets, onOpen }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: state });

  return (
    <section
      ref={setNodeRef}
      className={`board-column${isOver ? ' board-column--over' : ''}`}
      aria-label={stateLabel(state)}
    >
      <header className="board-column-header">
        <span className="board-column-title">{stateLabel(state)}</span>
        <span className="board-column-count" aria-label={`${tickets.length} tickets`}>
          {tickets.length}
        </span>
      </header>
      <div className="board-column-body">
        {tickets.length === 0 ? (
          <p className="board-column-empty">No tickets</p>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} onOpen={onOpen} />)
        )}
      </div>
    </section>
  );
}
