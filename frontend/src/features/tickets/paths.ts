/**
 * @/features/tickets/paths — ticket route-constants (ADR-0008, resolves I-6).
 *
 * The single source of truth for ticket URLs. Re-exported from `./routes.tsx` so cross-feature
 * consumers (A12 board) import it as `import { ticketRoutes } from '@/features/tickets/routes'`.
 * Kept in its own module so internal feature components can import it without a cycle through
 * `routes.tsx` (which imports the page components).
 *
 * Signatures are FROZEN by ADR-0008 — do not change without a superseding ADR.
 */
export const ticketRoutes = {
  /** '/tickets/new' */
  create(): string {
    return '/tickets/new';
  },
  /** `/tickets/${id}` */
  detail(id: string): string {
    return `/tickets/${id}`;
  },
  /** `/tickets/${id}/edit` */
  edit(id: string): string {
    return `/tickets/${id}/edit`;
  },
};

/** Where "delete succeeded" / "cancel create" returns the user (A12's primary board screen). */
export const BOARD_PATH = '/board';
