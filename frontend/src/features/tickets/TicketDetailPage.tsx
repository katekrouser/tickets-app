/**
 * TicketDetailPage — routing shell for the three ticket screens (REQUIREMENTS §6, §10):
 *   - mode="create"  →  /tickets/new         (blank form)
 *   - mode="view"    →  /tickets/:ticketId   (read-only details + comments)
 *   - mode="edit"    →  /tickets/:ticketId/edit (pre-filled form)
 *
 * Uses the foundation loading/empty/error primitives (@/components) for fetch states.
 */
import { useParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '@/components';
import { TicketForm } from './TicketForm';
import { TicketView } from './TicketView';
import { errorMessage, useTicket } from './api';
import './styles.css';

export function TicketDetailPage({ mode }: { mode: 'create' | 'view' | 'edit' }): JSX.Element {
  const { ticketId } = useParams<{ ticketId: string }>();

  if (mode === 'create') {
    return (
      <section className="ticket-page">
        <h1 className="ticket-page-title">New ticket</h1>
        <TicketForm mode="create" />
      </section>
    );
  }

  if (!ticketId) {
    return <EmptyState message="No ticket specified." />;
  }

  return <ExistingTicket ticketId={ticketId} mode={mode} />;
}

function ExistingTicket({
  ticketId,
  mode,
}: {
  ticketId: string;
  mode: 'view' | 'edit';
}): JSX.Element {
  const ticketQuery = useTicket(ticketId);

  if (ticketQuery.isLoading) return <LoadingState label="Loading ticket…" />;
  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <ErrorState
        message={errorMessage(ticketQuery.error, 'Could not load this ticket.')}
        onRetry={() => void ticketQuery.refetch()}
      />
    );
  }

  const ticket = ticketQuery.data;

  return (
    <section className="ticket-page">
      <h1 className="ticket-page-title">
        {mode === 'edit' ? 'Edit ticket' : 'Ticket details'}
      </h1>
      {mode === 'edit' ? (
        <TicketForm mode="edit" ticket={ticket} />
      ) : (
        <TicketView ticket={ticket} />
      )}
    </section>
  );
}
