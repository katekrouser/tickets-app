/**
 * @/features/auth/routes — this feature's public route subtree (ADR-0008 route-registry).
 *
 * `@/app/router` auto-discovers this `routes` export via a Vite `import.meta.glob` over the feature
 * folders, so registering these screens requires NO edit to `@/app`. All auth screens are PUBLIC (no
 * `<RequireAuth>`): they are the sign-up / login / verification / resend flows themselves
 * (REQUIREMENTS §3 — the only endpoints/screens exempt from auth). They render inside `<AppShell>`;
 * the header user menu auto-hides when there is no signed-in user.
 */
import type { RouteObject } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { VerifyEmailPage } from './VerifyEmailPage';
import { ResendVerificationPage } from './ResendVerificationPage';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/resend-verification', element: <ResendVerificationPage /> },
];
