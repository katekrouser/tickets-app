/**
 * TicketView — read-only ticket details (REQUIREMENTS §6) + comments panel (§7).
 *
 * Shows ALL fields. created_by / created_at / modified_at are read-only. Offers Edit (→ edit route)
 * and Delete (explicit confirmation modal; on success returns to the board). Team/epic ids are
 * resolved to human names when available, falling back to the raw id.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Toast } from '@/components';
import { CommentsPanel } from '@/features/comments';
import {
  STATE_LABELS,
  TYPE_LABELS,
  useDeleteTicket,
  useTeamEpics,
  useTeams,
  type Ticket,
} from './api';
import { BOARD_PATH, ticketRoutes } from './paths';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function TicketView({ ticket }: { ticket: Ticket }): JSX.Element {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const teamsQuery = useTeams();
  const epicsQuery = useTeamEpics(ticket.teamId);
  const deleteMutation = useDeleteTicket(ticket.id);

  const teamName =
    teamsQuery.data?.find((t) => t.id === ticket.teamId)?.name ?? ticket.teamId;
  const epicTitle = ticket.epicId
    ? (epicsQuery.data?.find((e) => e.id === ticket.epicId)?.title ?? ticket.epicId)
    : 'None';

  function handleDelete(): void {
    deleteMutation.mutate(undefined, {
      onSuccess: () => navigate(BOARD_PATH),
    });
  }

  return (
    <>
      <div className="ticket-view">
        <div className="ticket-view-actions">
          <Button onClick={() => navigate(ticketRoutes.edit(ticket.id))}>Edit</Button>
          <Button onClick={() => setConfirmOpen(true)}>Delete</Button>
        </div>

        <dl className="ticket-fields">
          <dt>ID</dt>
          <dd>{ticket.id}</dd>

          <dt>Title</dt>
          <dd>{ticket.title}</dd>

          <dt>Type</dt>
          <dd>{TYPE_LABELS[ticket.type]}</dd>

          <dt>State</dt>
          <dd>{STATE_LABELS[ticket.state]}</dd>

          <dt>Team</dt>
          <dd>{teamName}</dd>

          <dt>Epic</dt>
          <dd>{epicTitle}</dd>

          <dt>Body</dt>
          <dd className="ticket-body">{ticket.body}</dd>

          <dt>Created by</dt>
          <dd>{ticket.createdBy}</dd>

          <dt>Created at</dt>
          <dd>{formatTimestamp(ticket.createdAt)}</dd>

          <dt>Modified at</dt>
          <dd>{formatTimestamp(ticket.modifiedAt)}</dd>
        </dl>

        <CommentsPanel ticketId={ticket.id} />
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete ticket">
        <p>
          Delete "{ticket.title}"? This permanently removes the ticket and all of its comments.
        </p>
        {deleteMutation.isError ? (
          <Toast kind="error" message={(deleteMutation.error as Error).message} />
        ) : null}
        <div className="ticket-form-actions">
          <Button onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
          <Button
            type="button"
            onClick={() => setConfirmOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
