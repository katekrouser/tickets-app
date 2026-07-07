# ADR-0008: Frontend Foundation & Route-Constants Contract

- **Status:** Accepted · **Date:** YYYY-MM-DD
- **Owner:** A9 (foundation surface) + A13 (ticket route constants) · **Producers:** A9, A13
- **Consumers:** A10, A11, A12, A13 (foundation); A12 (ticket route constants from A13)
- **Related:** ADR-0004 (`AuthUser`), ADR-0006 (`@app/shared`), TDR (React Router 6.x, TanStack Query 5.x, openapi-fetch)
- **Resolves:** Interface Readiness Audit **I-5** (foundation surface handoff-only), **I-6** (route-constant symbol), FE side of **I-10**

## Import alias (single-valued)
A9 configures the Vite + tsconfig path alias **`@` → `frontend/src`**. The ONLY import forms are `@/…` (foundation) and, cross-feature, the published route-constants module below. Deep imports into another feature's internals are forbidden.

## A9 foundation surface — exact exported symbols
```ts
// @/lib/api  (A9) — typed HTTP client (openapi-fetch over @app/shared `paths`)
import type { paths } from '@app/shared';
export const api: ReturnType<typeof import('openapi-fetch').default<paths>>;   // api.GET('/teams'), api.POST(...)

// @/lib/auth  (A9)
import type { AuthUser } from 'backend-agnostic';   // shape mirrors ADR-0004 AuthUser {id,email}
export function useAuth(): { user: AuthUser | null; login(token: string): void; logout(): void };
export function RequireAuth(props: { children: React.ReactNode }): JSX.Element;  // redirects if unauthenticated

// @/components  (A9) — design system + shared states (exact export set)
export function Button(p: { onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; children: React.ReactNode }): JSX.Element;
export function Input(p: { value: string; onChange: (v: string) => void; type?: 'text' | 'password' | 'email'; placeholder?: string }): JSX.Element;
export function Field(p: { label: string; error?: string; children: React.ReactNode }): JSX.Element;
export function Modal(p: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }): JSX.Element;
export function Toast(p: { kind: 'success' | 'error'; message: string }): JSX.Element;
export function LoadingState(p: { label?: string }): JSX.Element;
export function EmptyState(p: { message: string }): JSX.Element;
export function ErrorState(p: { message: string; onRetry?: () => void }): JSX.Element;

// @/app/router  (A9) — route composition
import type { RouteObject } from 'react-router-dom';
// A9 composes the app router by importing each feature's `routes` (below). Features never edit @/app.
```

## Route-registry — how a feature contributes routes (exact)
Each feature module exports, from **`@/features/<name>/routes.tsx`**:
```ts
import type { RouteObject } from 'react-router-dom';
export const routes: RouteObject[];   // the feature's route subtree
```
A9's `@/app/router` imports each feature's `routes` and composes them. Features do not call any runtime registrar and do not edit `@/app`.

## Ticket route-constants — A13 → A12 (resolves I-6, single-valued)
A13 additionally exports, from **`@/features/tickets/routes.tsx`**:
```ts
export const ticketRoutes = {
  create(): string;            // '/tickets/new'
  detail(id: string): string;  // `/tickets/${id}`
  edit(id: string): string;    // `/tickets/${id}/edit`
};
```
A12 navigates using it: `import { ticketRoutes } from '@/features/tickets/routes';` then `navigate(ticketRoutes.detail(id))`. No other symbol/path is used for ticket navigation.

## Lifecycle
A9 delivers the foundation surface in **Phase 0** (before A10–A13). A13 delivers `ticketRoutes` in **Phase 1**; A12 imports it (both compile together; `ticketRoutes` is A13's published cross-feature boundary). This ADR is the contract — there is no separate freeze handoff.

## Forbidden usages
- Deep-importing another feature's internals (only `@/features/tickets/routes` `ticketRoutes` + each feature's `routes` are cross-feature-public).
- A feature editing `@/app`, `@/lib`, or `@/components` (A9-owned).
- Instantiating a second API client or auth context (use `@/lib/api`, `@/lib/auth`).
- Hard-coding ticket URLs anywhere; always use `ticketRoutes`.

## Compatibility rules
The foundation export set, the `routes` contribution shape, and `ticketRoutes` are frozen; additions are additive; renames/removals/prop-signature changes require a superseding ADR (MO-ratified, G1-logged).
