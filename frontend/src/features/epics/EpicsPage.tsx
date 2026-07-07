/**
 * @/features/epics/EpicsPage — epic management (§5, §10): create / list / edit / delete.
 *
 * The team is chosen at CREATION only and is immutable afterward: the edit form shows the
 * team as read-only and updateEpic sends only title/description. Delete is DISABLED (with a
 * tooltip) for epics referenced by tickets; a 409 (EPIC_REFERENCED) is surfaced as a toast.
 */
import { useEffect, useMemo, useState } from 'react';
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
  useCreateEpic,
  useDeleteEpic,
  useEpicReferences,
  useEpics,
  useTeams,
  useUpdateEpic,
  type Epic,
  type Team,
} from './api';
import './epics.css';

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
      <Link to="/teams">Teams</Link>
      <Link to="/epics" className="mng-nav-active" aria-current="page">
        Epics
      </Link>
    </nav>
  );
}

export function EpicsPage(): JSX.Element {
  const teamsQuery = useTeams();
  const teams = teamsQuery.data ?? [];

  const [teamFilter, setTeamFilter] = useState('');
  const epicsQuery = useEpics(teamFilter || undefined);
  const epics = epicsQuery.data ?? [];
  const references = useEpicReferences(epics);

  const createEpic = useCreateEpic();
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();

  const teamName = useMemo(() => {
    const m = new Map(teams.map((t) => [t.id, t.name]));
    return (id: string) => m.get(id) ?? id;
  }, [teams]);

  const [toast, setToast] = useState<ToastState>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [cTeamId, setCTeamId] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cError, setCError] = useState<string | undefined>(undefined);

  const [editing, setEditing] = useState<Epic | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eError, setEError] = useState<string | undefined>(undefined);

  const [deleting, setDeleting] = useState<Epic | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const openCreate = () => {
    setCTeamId(teamFilter || teams[0]?.id || '');
    setCTitle('');
    setCDesc('');
    setCError(undefined);
    setCreateOpen(true);
  };

  const submitCreate = () => {
    if (!cTeamId) {
      setCError('Choose a team.');
      return;
    }
    const title = cTitle.trim();
    if (!title) {
      setCError('Title is required.');
      return;
    }
    setCError(undefined);
    const description = cDesc.trim() ? cDesc.trim() : null;
    createEpic.mutate(
      { teamId: cTeamId, title, description },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setToast({ kind: 'success', message: `Epic "${title}" created.` });
        },
        onError: (e) => setCError(errMessage(e, 'Could not create epic.')),
      },
    );
  };

  const openEdit = (epic: Epic) => {
    setEditing(epic);
    setETitle(epic.title);
    setEDesc(epic.description ?? '');
    setEError(undefined);
  };

  const submitEdit = () => {
    if (!editing) return;
    const title = eTitle.trim();
    if (!title) {
      setEError('Title is required.');
      return;
    }
    setEError(undefined);
    const description = eDesc.trim() ? eDesc.trim() : null;
    updateEpic.mutate(
      { epicId: editing.id, title, description },
      {
        onSuccess: () => {
          setEditing(null);
          setToast({ kind: 'success', message: 'Epic updated.' });
        },
        onError: (e) => setEError(errMessage(e, 'Could not update epic.')),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const title = deleting.title;
    deleteEpic.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        setToast({ kind: 'success', message: `Epic "${title}" deleted.` });
      },
      onError: (e) => {
        setDeleting(null);
        setToast({ kind: 'error', message: errMessage(e, 'Could not delete epic.') });
      },
    });
  };

  const noTeams = !teamsQuery.isLoading && teams.length === 0;

  return (
    <div className="mng-page">
      <FeatureNav />

      <div className="mng-head">
        <h1>Epics</h1>
        <span className="mng-tooltip" title={noTeams ? 'Create a team first.' : 'Create an epic'}>
          <Button disabled={noTeams} onClick={openCreate}>
            New epic
          </Button>
        </span>
      </div>

      <div className="mng-toolbar">
        <Field label="Filter by team">
          <select
            className="mng-select"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {noTeams ? (
        <EmptyState message="No teams yet. Create a team on the Teams screen before adding epics." />
      ) : epicsQuery.isLoading ? (
        <LoadingState label="Loading epics…" />
      ) : epicsQuery.isError ? (
        <ErrorState
          message={errMessage(epicsQuery.error, 'Could not load epics.')}
          onRetry={() => epicsQuery.refetch()}
        />
      ) : epics.length === 0 ? (
        <EmptyState
          message={
            teamFilter
              ? 'This team has no epics yet.'
              : 'No epics yet. Create your first epic and assign it to a team.'
          }
        />
      ) : (
        <div className="mng-card">
          <table className="mng-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Team</th>
                <th>Description</th>
                <th>Modified</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {epics.map((epic) => {
                const ref = references[epic.id];
                const refLoading = ref?.loading ?? true;
                const referenced = ref?.referenced ?? false;
                const deleteDisabled = referenced || refLoading;
                const tooltip = referenced
                  ? 'This epic is referenced by tickets and cannot be deleted.'
                  : refLoading
                    ? 'Checking whether this epic can be deleted…'
                    : 'Delete this epic';
                return (
                  <tr key={epic.id}>
                    <td className="mng-name">{epic.title}</td>
                    <td className="mng-muted">{teamName(epic.teamId)}</td>
                    <td className="mng-muted">{epic.description ?? '—'}</td>
                    <td className="mng-muted">{formatDate(epic.modifiedAt)}</td>
                    <td>
                      <div className="mng-row-actions">
                        <span className="mng-btn-secondary">
                          <Button onClick={() => openEdit(epic)}>Edit</Button>
                        </span>
                        <span className="mng-tooltip mng-btn-danger" title={tooltip}>
                          <Button disabled={deleteDisabled} onClick={() => setDeleting(epic)}>
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

      {/* Create — team chosen here, immutable afterward */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New epic">
        <Field label="Team (cannot be changed later)">
          <select className="mng-select" value={cTeamId} onChange={(e) => setCTeamId(e.target.value)}>
            <option value="" disabled>
              Select a team…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title" error={cError}>
          <Input value={cTitle} onChange={setCTitle} placeholder="e.g. Onboarding flow" />
        </Field>
        <Field label="Description (optional)">
          <textarea
            className="mng-textarea"
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            placeholder="Optional details…"
          />
        </Field>
        <div className="mng-modal-actions">
          <span className="mng-btn-secondary">
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          </span>
          <Button disabled={createEpic.isPending} onClick={submitCreate}>
            {createEpic.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* Edit — team is read-only (immutable) */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit epic">
        <Field label="Team (immutable)">
          <div className="mng-static">{editing ? teamName(editing.teamId) : ''}</div>
        </Field>
        <Field label="Title" error={eError}>
          <Input value={eTitle} onChange={setETitle} />
        </Field>
        <Field label="Description (optional)">
          <textarea
            className="mng-textarea"
            value={eDesc}
            onChange={(e) => setEDesc(e.target.value)}
          />
        </Field>
        <div className="mng-modal-actions">
          <span className="mng-btn-secondary">
            <Button onClick={() => setEditing(null)}>Cancel</Button>
          </span>
          <Button disabled={updateEpic.isPending} onClick={submitEdit}>
            {updateEpic.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Delete epic">
        <p>
          Delete epic <strong>{deleting?.title}</strong>? This cannot be undone.
        </p>
        <div className="mng-modal-actions">
          <span className="mng-btn-secondary">
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
          </span>
          <span className="mng-btn-danger">
            <Button disabled={deleteEpic.isPending} onClick={confirmDelete}>
              {deleteEpic.isPending ? 'Deleting…' : 'Delete'}
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
