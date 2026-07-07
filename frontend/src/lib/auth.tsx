/**
 * @/lib/auth — auth context + route guard (ADR-0008 foundation surface).
 *
 * Contract (ADR-0008):
 *   export function useAuth(): { user: AuthUser | null; login(token: string): void; logout(): void }
 *   export function RequireAuth(props: { children: React.ReactNode }): JSX.Element  // redirects if unauthenticated
 *
 * Token storage is NOT the system of record for data (TDR §3 / REQUIREMENTS §9): we persist ONLY the
 * bearer token so a page reload keeps the session; all domain data comes from the API via @/lib/api.
 * The current `user` is derived from the token's JWT claims (`sub` → id, `email`) — no separate store.
 * `AuthUser` shape mirrors ADR-0004: { id, email }.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Verified identity — shape mirrors ADR-0004 `AuthUser`. Backend-agnostic on the FE. */
export interface AuthUser {
  id: string;
  email: string;
}

const TOKEN_STORAGE_KEY = 'tickets.auth.token';

interface AuthContextValue {
  user: AuthUser | null;
  login(token: string): void;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Decode the user identity from a JWT bearer token's payload. Returns null if malformed/expired. */
function decodeUser(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json) as { sub?: string; email?: string; exp?: number };
    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null;
    if (!claims.sub || !claims.email) return null;
    return { id: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The current bearer token from storage, or null when signed out.
 * `@/lib/api` reads this in its request middleware to attach `Authorization: Bearer <token>`.
 * Storage is the single source of the token (the key lives only here); NOT the data system of record.
 */
export function getStoredToken(): string | null {
  return readStoredToken();
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  const login = useCallback((nextToken: string) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    } catch {
      /* storage unavailable — session stays in memory only */
    }
    setToken(nextToken);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user: decodeUser(token), login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}

/** Route guard: renders children only when authenticated, else redirects to /login (ADR-0008). */
export function RequireAuth({ children }: { children: React.ReactNode }): JSX.Element {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
