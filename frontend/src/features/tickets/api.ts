/**
 * @/features/tickets/api — typed data layer for tickets (REQUIREMENTS §6).
 *
 * Wraps the single foundation HTTP client (`@/lib/api`) with TanStack Query hooks. Domain types
 * and enum constants come from the shared contract package (`@app/shared`, the FE+BE source of
 * truth). No second API client / query client is created (ADR-0008).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@app/shared';
import { TICKET_STATES, TICKET_TYPES, type TicketState, type TicketType } from '@app/shared';
import { api } from '@/lib/api';

export type Ticket = components['schemas']['Ticket'];
export type Team = components['schemas']['Team'];
export type Epic = components['schemas']['Epic'];

/** Editable ticket fields (REQUIREMENTS §6: type, team, epic, title, body, state). */
export interface TicketFormValues {
  teamId: string;
  type: TicketType;
  state: TicketState;
  epicId: string | null;
  title: string;
  body: string;
}

export { TICKET_STATES, TICKET_TYPES };
export type { TicketState, TicketType };

/** Human-readable labels; canonical API values stay machine-readable (REQUIREMENTS §6). */
export const TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  fix: 'Fix',
};

export const STATE_LABELS: Record<TicketState, string> = {
  new: 'New',
  ready_for_implementation: 'Ready for Implementation',
  in_progress: 'In Progress',
  ready_for_acceptance: 'Ready for Acceptance',
  done: 'Done',
};

export const ticketKeys = {
  detail: (id: string) => ['ticket', id] as const,
  teams: () => ['teams'] as const,
  teamEpics: (teamId: string) => ['team-epics', teamId] as const,
};

/** Pull a human-readable message out of the contract Error envelope, else a fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

async function fetchTicket(ticketId: string): Promise<Ticket> {
  const { data, error } = await api.GET('/tickets/{ticketId}', {
    params: { path: { ticketId } },
  });
  if (error || !data) throw new Error(errorMessage(error, 'Failed to load ticket.'));
  return data;
}

async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await api.GET('/teams');
  if (error || !data) throw new Error(errorMessage(error, 'Failed to load teams.'));
  return data;
}

async function fetchTeamEpics(teamId: string): Promise<Epic[]> {
  const { data, error } = await api.GET('/teams/{teamId}/epics', {
    params: { path: { teamId } },
  });
  if (error || !data) throw new Error(errorMessage(error, 'Failed to load epics.'));
  return data;
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => fetchTicket(ticketId),
    enabled: ticketId.length > 0,
  });
}

export function useTeams() {
  return useQuery({ queryKey: ticketKeys.teams(), queryFn: fetchTeams });
}

/** Epics for the selected team; the query re-runs when `teamId` changes (drives the epic dropdown). */
export function useTeamEpics(teamId: string | null) {
  return useQuery({
    queryKey: ticketKeys.teamEpics(teamId ?? ''),
    queryFn: () => fetchTeamEpics(teamId as string),
    enabled: !!teamId,
  });
}

export function useCreateTicket() {
  return useMutation({
    mutationFn: async (values: TicketFormValues): Promise<Ticket> => {
      const { data, error } = await api.POST('/tickets', {
        body: {
          teamId: values.teamId,
          type: values.type,
          state: values.state,
          epicId: values.epicId,
          title: values.title,
          body: values.body,
        },
      });
      if (error || !data) throw new Error(errorMessage(error, 'Failed to create ticket.'));
      return data;
    },
  });
}

export function useUpdateTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: TicketFormValues): Promise<Ticket> => {
      const { data, error } = await api.PATCH('/tickets/{ticketId}', {
        params: { path: { ticketId } },
        body: {
          teamId: values.teamId,
          type: values.type,
          state: values.state,
          epicId: values.epicId,
          title: values.title,
          body: values.body,
        },
      });
      if (error || !data) throw new Error(errorMessage(error, 'Failed to update ticket.'));
      return data;
    },
    onSuccess: (ticket) => {
      qc.setQueryData(ticketKeys.detail(ticketId), ticket);
    },
  });
}

export function useDeleteTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await api.DELETE('/tickets/{ticketId}', {
        params: { path: { ticketId } },
      });
      if (error) throw new Error(errorMessage(error, 'Failed to delete ticket.'));
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: ticketKeys.detail(ticketId) });
    },
  });
}
