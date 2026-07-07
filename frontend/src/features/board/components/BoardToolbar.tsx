/**
 * Board toolbar (A12): team selector, type + epic filters, case-insensitive title search, and the
 * "New ticket" affordance. Filters are controlled by BoardPage and AND-combine there.
 */
import { Button, Input } from '@/components';
import { TICKET_TYPES } from '@app/shared';
import type { Team, Epic } from '../api';
import { typeLabel } from '../labels';
import { NO_EPIC, type BoardFilters } from '../filters';

interface Props {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (id: string) => void;
  epics: Epic[];
  filters: BoardFilters;
  onFiltersChange: (next: BoardFilters) => void;
  onCreate: () => void;
}

export function BoardToolbar({
  teams,
  selectedTeamId,
  onSelectTeam,
  epics,
  filters,
  onFiltersChange,
  onCreate,
}: Props): JSX.Element {
  return (
    <div className="board-toolbar">
      <label className="board-toolbar-field">
        <span className="board-toolbar-label">Team</span>
        <select
          className="board-select"
          value={selectedTeamId}
          onChange={(e) => onSelectTeam(e.target.value)}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="board-toolbar-field">
        <span className="board-toolbar-label">Type</span>
        <select
          className="board-select"
          value={filters.type}
          onChange={(e) =>
            onFiltersChange({ ...filters, type: e.target.value as BoardFilters['type'] })
          }
        >
          <option value="">All types</option>
          {TICKET_TYPES.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>
      </label>

      <label className="board-toolbar-field">
        <span className="board-toolbar-label">Epic</span>
        <select
          className="board-select"
          value={filters.epicId}
          onChange={(e) => onFiltersChange({ ...filters, epicId: e.target.value })}
        >
          <option value="">All epics</option>
          <option value={NO_EPIC}>No epic</option>
          {epics.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.title}
            </option>
          ))}
        </select>
      </label>

      <label className="board-toolbar-field board-toolbar-field--grow">
        <span className="board-toolbar-label">Search</span>
        <Input
          value={filters.q}
          onChange={(v) => onFiltersChange({ ...filters, q: v })}
          placeholder="Search by title…"
        />
      </label>

      <div className="board-toolbar-actions">
        <Button onClick={onCreate}>New ticket</Button>
      </div>
    </div>
  );
}
