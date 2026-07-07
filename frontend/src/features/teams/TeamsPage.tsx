/**
 * @/features/teams/TeamsPage — team management (§4, §10): list / create / rename / delete.
 *
 * Delete is DISABLED (with an explanatory tooltip) for teams that still contain epics or
 * tickets; if a delete somehow still returns 409 (last-write-wins race), the backend's
 * message is surfaced as an error toast.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Modal,
  Toast,
} from '@/components';
import {
  ApiError,
  useCreateTeam,
  useDeleteTeam,
  useRenameTeam,
  useTeamReferences,
  useTeams,
  type Team,
} from './api';
import './teams.css';

type ToastState = { kind: 'success' | 'error'; message: string } | null;

function errMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function FeatureNav(): JSX.Element {
  return (
    <nav className="mng-nav" aria-label="Management sections">
      <Link to="/board">Board</Link>
      <Link to="/teams" className="mng-nav-active" aria-current="page">
        Teams
      </Link>
      <Link to="/epics">Epics</Link>
    </nav>
  );
}

export function TeamsPage(): JSX.Element {
  const teamsQuery = useTeams();
  const teams = teamsQuery.data ?? [];
  const references = useTeamReferences(teams);

  const createTeam = useCreateTeam();
  const renameTeam = useRenameTeam();
  const deleteTeam = useDeleteTeam();

  const [toast, setToast] = useState<ToastState>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState<string | undefined>(undefined);

  const [renaming, setRenaming] = useState<Team | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | undefined>(undefined);

  const [deleting, setDeleting] = useState<Team | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const openCreate = () => {
    setCreateName('');
    setCreateError(undefined);
    setCreateOpen(true);
  };

  const submitCreate = () => {
    const name = createName.trim();
    if (!name) {
      setCreateError('Name is required.');
      return;
    }
    setCreateError(undefined);
    createTeam.mutate(name, {
      onSuccess: () => {
        setCreateOpen(false);
        setToast({ kind: 'success', message: `Team "${name}" created.` });
      },
      onError: (e) => setCreateError(errMessage(e, 'Could not create team.')),
    });
  };

  const openRename = (team: Team) => {
    setRenaming(team);
    setRenameName(team.name);
    setRenameError(undefined);
  };

  const submitRename = () => {
    if (!renaming) return;
    const name = renameName.trim();
    if (!name) {
      setRenameError('Name is required.');
      return;
    }
    setRenameError(undefined);
    renameTeam.mutate(
      { teamId: renaming.id, name },
      {
        onSuccess: () => {
          setRenaming(null);
          setToast({ kind: 'success', message: 'Team renamed.' });
        },
        onError: (e) => setRenameError(errMessage(e, 'Could not rename team.')),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const name = deleting.name;
    deleteTeam.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        setToast({ kind: 'success', message: `Team "${name}" deleted.` });
      },
      onError: (e) => {
        setDeleting(null);
        // 409 (TEAM_HAS_DEPENDENTS) or any other error → clear validation message.
        setToast({ kind: 'error', message: errMessage(e, 'Could not delete team.') });
      },
    });
  };

  return (
    <div className="mng-page">
      <FeatureNav />

      <div className="mng-head">
        <h1>Teams</h1>
        <Button onClick={openCreate}>New team</Button>
      </div>

      {teamsQuery.isLoading ? (
        <LoadingState label="Loading teams…" />
      ) : teamsQuery.isError ? (
        <ErrorState
          message={errMessage(teamsQuery.error, 'Could not load teams.')}
          onRetry={() => teamsQuery.refetch()}
        />
      ) : teams.length === 0 ? (
        <EmptyState message="No teams yet. Create your first team to start organizing tickets." />
      ) : (
        <div className="mng-card">
          <table className="mng-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Modified</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const ref = references[team.id];
                const refLoading = ref?.loading ?? true;
                const referenced = ref?.referenced ?? false;
                const deleteDisabled = referenced || refLoading;
                const tooltip = referenced
                  ? 'This team has tickets or epics and cannot be deleted.'
                  : refLoading
                    ? 'Checking whether this team can be deleted…'
                    : 'Delete this team';
                return (
                  <tr key={team.id}>
                    <td className="mng-name">{team.name}</td>
                    <td className="mng-muted">{formatDate(team.createdAt)}</td>
                    <td className="mng-muted">{formatDate(team.modifiedAt)}</td>
                    <td>
                      <div className="mng-row-actions">
                        <span className="mng-btn-secondary">
                          <Button onClick={() => openRename(team)}>Rename</Button>
                        </span>
                        <span className="mng-tooltip mng-btn-danger" title={tooltip}>
                          <Button disabled={deleteDisabled} onClick={() => setDeleting(team)}>
                            Delete
                          </Button>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New team">
        <Field label="Team name" error={createError}>
          <Input value={createName} onChange={setCreateName} placeholder="e.g. Platform" />
        </Field>
        <div className="mng-modal-actions">
          <span className="mng-btn-secondary">
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          </span>
          <Button
            type="button"
            disabled={createTeam.isPending}
            onClick={submitCreate}
          >
            {createTeam.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* Rename */}
      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title="Rename team">
        <Field label="Team name" error={renameError}>
          <Input value={renameName} onChange={setRenameName} />
        </Field>
        <div className="mng-modal-actions">
          <span className="mng-btn-secondary">
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
          </span>
          <Button disabled={renameTeam.isPending} onClick={submitRename}>
            {renameTeam.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Delete team">
        <p>
          Delete team <strong>{deleting?.name}</strong>? This cannot be undone.
        </p>
        <div className="mng-modal-actions">
          <span className="mng-btn-secondary">
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
          </span>
          <span className="mng-btn-danger">
            <Button disabled={deleteTeam.isPending} onClick={confirmDelete}>
              {deleteTeam.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </span>
        </div>
      </Modal>

      {toast ? (
        <div className="mng-toast-fixed">
          <Toast kind={toast.kind} message={toast.message} />
        </div>
      ) : null}
    </div>
  );
}
