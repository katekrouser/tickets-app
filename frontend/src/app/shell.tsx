/**
 * @/app/shell — the app layout: header (brand + user menu with Log out) and the routed content area.
 * Feature routes render into <Outlet/>. A9-owned; features never edit this (ADR-0008 forbidden usages).
 */
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

function UserMenu(): JSX.Element | null {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const onLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="user-menu">
      <button
        className="user-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{user.email}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="user-menu-dropdown" role="menu">
          <button className="user-menu-item" type="button" role="menuitem" onClick={onLogout}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          Ticket Tracker
        </Link>
        <UserMenu />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
