/**
 * A draggable Kanban card (A12). Memoized so that dragging/filtering re-renders stay cheap at
 * ≥100 cards — it only re-renders when the ticket or the (stable) onOpen callback changes.
 *
 * The whole card is the drag handle (@dnd-kit/core `useDraggable`). A pointer activation distance
 * on the sensor (see BoardPage) means a plain click opens the ticket instead of starting a drag.
 */
import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Ticket } from '../api';
import { typeLabel } from '../labels';

/** Presentational card face — reused by the drag overlay so the lifted card matches exactly. */
export function CardFace({ ticket, overlay }: { ticket: Ticket; overlay?: boolean }): JSX.Element {
  return (
    <article className={`board-card${overlay ? ' board-card--overlay' : ''}`}>
      <span className={`board-card-type board-card-type--${ticket.type}`}>
        {typeLabel(ticket.type)}
      </span>
      <h3 className="board-card-title">{ticket.title}</h3>
    </article>
  );
}

interface Props {
  ticket: Ticket;
  onOpen: (id: string) => void;
}

function TicketCardImpl({ ticket, onOpen }: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { fromState: ticket.state },
  });

  return (
    <div
      ref={setNodeRef}
      className={`board-card-wrap${isDragging ? ' board-card-wrap--dragging' : ''}`}
      onClick={() => onOpen(ticket.id)}
      aria-label={`Open ticket: ${ticket.title}`}
      {...attributes}
      {...listeners}
    >
      <CardFace ticket={ticket} />
    </div>
  );
}

export const TicketCard = memo(TicketCardImpl);
