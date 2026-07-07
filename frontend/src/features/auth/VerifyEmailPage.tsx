/**
 * VerifyEmailPage (`/verify-email?token=…`) — the email-verification RESULT screen (REQUIREMENTS §10).
 *
 * Reads the single-use token from the query string and confirms it via the API, rendering
 * loading / success / error(expired|used|invalid) states with the shared state components.
 *
 * On success it routes the user to `/login` — with NO auto-login (REQUIREMENTS §3): we never call
 * `useAuth().login()` here. A brief success panel is shown, then we navigate to `/login`; a manual
 * "Continue to sign in" button is also provided.
 *
 * Boundary note (ADR-0009 §12): the emailed link is `${APP_BASE_URL}/api/auth/verify-email?token=…`,
 * and the backend 302-redirects to `${APP_BASE_URL}/login` on success. This SPA screen handles the
 * client-driven verification path (link → `/verify-email?token=…`) so every result state has real UI;
 * either way, success ends on `/login` and no session is created without an explicit sign-in.
 *
 * The pure `VerifyEmailView` presenter (state → markup) is exported so each outcome is renderable
 * in isolation; the page component owns the async state machine + redirect.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { errorCodes } from '@app/shared';
import { Button, ErrorState, LoadingState, Toast } from '@/components';
import { AuthLayout, stack } from './AuthLayout';
import { verifyEmail } from './service';

export type VerifyStatus =
  | { phase: 'verifying' }
  | { phase: 'success' }
  | { phase: 'error'; code?: string; message: string }
  | { phase: 'missing' };

const REDIRECT_DELAY_MS = 2500;

/** Friendly copy per token error code (server message is used when present). */
export function messageForCode(code: string | undefined, serverMessage: string | undefined): string {
  if (serverMessage) return serverMessage;
  switch (code) {
    case errorCodes.TOKEN_EXPIRED:
      return 'This verification link has expired. Request a new one below.';
    case errorCodes.TOKEN_USED:
      return 'This verification link has already been used. Try signing in.';
    default:
      return 'This verification link is invalid.';
  }
}

/** Pure presenter: renders the appropriate panel for a given verification status. */
export function VerifyEmailView(props: {
  status: VerifyStatus;
  onContinue: () => void;
}): JSX.Element {
  const { status, onContinue } = props;

  if (status.phase === 'verifying') {
    return (
      <AuthLayout title="Verifying your email">
        <LoadingState label="Verifying your email…" />
      </AuthLayout>
    );
  }

  if (status.phase === 'success') {
    return (
      <AuthLayout
        title="Email verified"
        footer={
          <span>
            Redirecting to sign in… or <Link to="/login">continue now</Link>.
          </span>
        }
      >
        <div style={stack}>
          <Toast kind="success" message="Your email is verified. You can now sign in." />
          <Button type="button" onClick={onContinue}>
            Continue to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (status.phase === 'missing') {
    return (
      <AuthLayout
        title="Verify your email"
        footer={
          <>
            <span>
              Need a new link? <Link to="/resend-verification">Resend verification</Link>
            </span>
            <span>
              <Link to="/login">Back to sign in</Link>
            </span>
          </>
        }
      >
        <p>
          This page confirms your email from the link we sent you. No verification token was found in
          the URL — open the link from your email, or request a new one below.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verification failed"
      footer={
        <>
          <span>
            <Link to="/resend-verification">Request a new verification email</Link>
          </span>
          <span>
            <Link to="/login">Back to sign in</Link>
          </span>
        </>
      }
    >
      <ErrorState message={status.message} />
    </AuthLayout>
  );
}

export function VerifyEmailPage(): JSX.Element {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [status, setStatus] = useState<VerifyStatus>(() =>
    token ? { phase: 'verifying' } : { phase: 'missing' },
  );
  // Single-use tokens must be spent exactly once — guard against React StrictMode's
  // double-invoked effect (the ref survives the dev-only remount).
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await verifyEmail(token);
      if (cancelled) return;
      if (result.ok) {
        setStatus({ phase: 'success' });
      } else {
        setStatus({
          phase: 'error',
          code: result.error.code,
          message: messageForCode(result.error.code, result.error.message),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // After a successful verification, route to the login screen (no auto-login).
  useEffect(() => {
    if (status.phase !== 'success') return;
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status.phase, navigate]);

  return <VerifyEmailView status={status} onContinue={() => navigate('/login', { replace: true })} />;
}
