/**
 * TicketForm — create/edit a ticket (REQUIREMENTS §6).
 *
 * Editable fields: type, team, epic, title, body, state. When the team changes we CLEAR the
 * selected epic and the epic dropdown reloads for the new team (the epics query is keyed by
 * teamId). Backend re-validates all enums/refs (client validation is a convenience only).
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Input, Toast } from '@/components';
import {
  STATE_LABELS,
  TICKET_STATES,
  TICKET_TYPES,
  TYPE_LABELS,
  useCreateTicket,
  useTeamEpics,
  useTeams,
  useUpdateTicket,
  type Ticket,
  type TicketState,
  type TicketType,
} from './api';
import { BOARD_PATH, ticketRoutes } from './paths';

interface TicketFormProps {
  mode: 'create' | 'edit';
  ticket?: Ticket;
}

export function TicketForm({ mode, ticket }: TicketFormProps): JSX.Element {
  const navigate = useNavigate();

  const [type, setType] = useState<TicketType>(ticket?.type ?? 'bug');
  const [teamId, setTeamId] = useState<string>(ticket?.teamId ?? '');
  const [epicId, setEpicId] = useState<string | null>(ticket?.epicId ?? null);
  const [title, setTitle] = useState<string>(ticket?.title ?? '');
  const [body, setBody] = useState<string>(ticket?.body ?? '');
  const [state, setState] = useState<TicketState>(ticket?.state ?? 'new');
  const [submitted, setSubmitted] = useState(false);

  const teamsQuery = useTeams();
  const epicsQuery = useTeamEpics(teamId || null);

  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket(ticket?.id ?? '');
  const activeMutation = mode === 'create' ? createMutation : updateMutation;

  const titleError = submitted && !title.trim() ? 'Title is required.' : undefined;
  const bodyError = submitted && !body.trim() ? 'Body is required.' : undefined;
  const teamError = submitted && !teamId ? 'Team is required.' : undefined;

  /** Team change clears the selected epic; the epic dropdown reloads for the new team. */
  function handleTeamChange(nextTeamId: string): void {
    setTeamId(nextTeamId);
    setEpicId(null);
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setSubmitted(true);
    if (!title.trim() || !body.trim() || !teamId) return;

    const values = {
      teamId,
      type,
      state,
      epicId,
      title: title.trim(),
      body: body.trim(),
    };

    const onSuccess = (saved: Ticket): void => navigate(ticketRoutes.detail(saved.id));

    if (mode === 'create') {
      createMutation.mutate(values, { onSuccess });
    } else {
      updateMutation.mutate(values, { onSuccess });
    }
  }

  function handleCancel(): void {
    if (mode === 'edit' && ticket) navigate(ticketRoutes.detail(ticket.id));
    else navigate(BOARD_PATH);
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit} noValidate>
      <Field label="Type">
        <select
          className="ds-input"
          value={type}
          onChange={(e) => setType(e.target.value as TicketType)}
        >
          {TICKET_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Team" error={teamError}>
        <select
          className="ds-input"
          value={teamId}
          onChange={(e) => handleTeamChange(e.target.value)}
          disabled={teamsQuery.isLoading}
        >
          <option value="">
            {teamsQuery.isLoading ? 'Loading teams…' : 'Select a team…'}
          </option>
          {(teamsQuery.data ?? []).map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Epic (optional)">
        <select
          className="ds-input"
          value={epicId ?? ''}
          onChange={(e) => setEpicId(e.target.value || null)}
          disabled={!teamId || epicsQuery.isLoading}
        >
          <option value="">
            {!teamId
              ? 'Select a team first'
              : epicsQuery.isLoading
                ? 'Loading epics…'
                : 'No epic'}
          </option>
          {(epicsQuery.data ?? []).map((epic) => (
            <option key={epic.id} value={epic.id}>
              {epic.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Title" error={titleError}>
        <Input value={title} onChange={setTitle} placeholder="Short summary" />
      </Field>

      <Field label="Body" error={bodyError}>
        <textarea
          className="ds-input ticket-form-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Describe the ticket (plain text or Markdown)"
        />
      </Field>

      <Field label="State">
        <select
          className="ds-input"
          value={state}
          onChange={(e) => setState(e.target.value as TicketState)}
        >
          {TICKET_STATES.map((s) => (
            <option key={s} value={s}>
              {STATE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <div className="ticket-form-actions">
        <Button type="submit" disabled={activeMutation.isPending}>
          {activeMutation.isPending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create ticket'
              : 'Save changes'}
        </Button>
        <Button type="button" onClick={handleCancel} disabled={activeMutation.isPending}>
          Cancel
        </Button>
      </div>

      {activeMutation.isError ? (
        <Toast kind="error" message={(activeMutation.error as Error).message} />
      ) : null}
    </form>
  );
}
