/**
 * BoardPage (A12) — the Kanban board for one selected team (REQUIREMENTS §8).
 *
 * Composition:
 *  - Team selector (URL-backed via `?team=`, so the choice survives a refresh) + filters/search.
 *  - Exactly five columns in fixed workflow order; each column ordered most-recently-modified first.
 *  - @dnd-kit drag between columns → optimistic move + `PATCH /tickets/{id}` state; on failure the
 *    card rolls back to its previous column and an error toast appears.
 *  - Create/open affordances navigate via A13's frozen `ticketRoutes` (ADR-0008); the detail view
 *    itself is owned by A13.
 *
 * Loading/empty/error use A9's shared state primitives. Filtering is client-side + memoized so the
 * board stays smooth at ≥100 tickets and cards (memoized) don't re-render on every keystroke.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { EmptyState, ErrorState, LoadingState, Toast } from '@/components';
// A13's frozen ADR-0008 cross-feature export. Resolved at integration (A13 merges before A12).
import { ticketRoutes } from '@/features/tickets/routes';
import type { TicketState } from '@app/shared';
import { useBoardTickets, useMoveTicket, useTeamEpics, useTeams } from './api';
import { EMPTY_FILTERS, bucketByState, filterTickets, type BoardFilters } from './filters';
import { COLUMN_ORDER } from './labels';
import { BoardToolbar } from './components/BoardToolbar';
import { Column } from './components/Column';
import { CardFace } from './components/TicketCard';
import './board.css';

interface ToastState {
  kind: 'success' | 'error';
  message: string;
}

export function BoardPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const teamsQuery = useTeams();
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);

  // Selected team is URL-backed so a refresh keeps the same board (and DnD persistence is verifiable).
  const teamParam = searchParams.get('team') ?? '';
  const selectedTeamId = teams.some((t) => t.id === teamParam) ? teamParam : teams[0]?.id ?? '';

  useEffect(() => {
    if (teams.length > 0 && !teams.some((t) => t.id === teamParam)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('team', teams[0].id);
          return next;
        },
        { replace: true },
      );
    }
  }, [teams, teamParam, setSearchParams]);

  const selectTeam = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('team', id);
        return next;
      });
    },
    [setSearchParams],
  );

  const ticketsQuery = useBoardTickets(selectedTeamId || undefined);
  const epicsQuery = useTeamEpics(selectedTeamId || undefined);
  const move = useMoveTicket(selectedTeamId);

  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  // Reset filters when switching teams (an epic filter from another team wouldn't match anyway).
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [selectedTeamId]);

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const buckets = useMemo(
    () => bucketByState(filterTickets(tickets, filters)),
    [tickets, filters],
  );

  // ---- Toast (auto-dismiss) ------------------------------------------------
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // ---- Drag and drop -------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) ?? null : null;

  const openTicket = useCallback(
    (id: string) => navigate(ticketRoutes.detail(id)),
    [navigate],
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;
      const toState = over.id as TicketState;
      const fromState = active.data.current?.fromState as TicketState | undefined;
      if (!fromState || fromState === toState) return;
      move.mutate(
        { ticketId: String(active.id), fromState, toState },
        {
          onError: () =>
            showToast({
              kind: 'error',
              message: 'Could not move the ticket — it was returned to its previous column.',
            }),
        },
      );
    },
    [move, showToast],
  );

  const createTicket = useCallback(() => navigate(ticketRoutes.create()), [navigate]);

  // ---- Render --------------------------------------------------------------
  if (teamsQuery.isLoading) {
    return <LoadingState label="Loading teams…" />;
  }
  if (teamsQuery.isError) {
    return (
      <ErrorState
        message={teamsQuery.error?.message ?? 'Failed to load teams.'}
        onRetry={() => teamsQuery.refetch()}
      />
    );
  }
  if (teams.length === 0) {
    return <EmptyState message="No teams yet. Create a team to start tracking tickets." />;
  }

  return (
    <div className="board">
      <BoardToolbar
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={selectTeam}
        epics={epicsQuery.data ?? []}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={createTicket}
      />

      {ticketsQuery.isLoading ? (
        <LoadingState label="Loading board…" />
      ) : ticketsQuery.isError ? (
        <ErrorState
          message={ticketsQuery.error?.message ?? 'Failed to load the board.'}
          onRetry={() => ticketsQuery.refetch()}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="board-columns">
            {COLUMN_ORDER.map((state) => (
              <Column key={state} state={state} tickets={buckets[state]} onOpen={openTicket} />
            ))}
          </div>
          <DragOverlay>
            {activeTicket ? <CardFace ticket={activeTicket} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {toast ? (
        <div className="board-toast-host">
          <Toast kind={toast.kind} message={toast.message} />
        </div>
      ) : null}
    </div>
  );
}
