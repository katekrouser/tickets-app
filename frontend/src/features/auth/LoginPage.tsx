/**
 * LoginPage (`/login`) — authenticate with local credentials.
 *
 * - Mirrors server validation client-side (validation.ts); the server stays authoritative.
 * - 401 INVALID_CREDENTIALS → inline error toast.
 * - 403 EMAIL_NOT_VERIFIED → surfaces an inline "resend verification email" action
 *   (REQUIREMENTS §3/§10: resend reachable from the login screen).
 * - On success stores the bearer token via `useAuth().login(token)` and navigates to the
 *   originally requested route (or `/`).
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorCodes } from '@app/shared';
import { useAuth } from '@/lib/auth';
import { Button, Field, Input, Toast } from '@/components';
import { AuthLayout, stack } from './AuthLayout';
import { validateEmail, validateLoginPassword } from './validation';
import { login as loginRequest, resendVerification } from './service';

interface FromState {
  from?: { pathname?: string };
}

export function LoginPage(): JSX.Element {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string>();

  // Already signed in → nothing to do here.
  if (user) {
    return <Navigate to="/" replace />;
  }

  const redirectTarget = (location.state as FromState | null)?.from?.pathname ?? '/';

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setFormError(undefined);
    setNeedsVerification(false);
    setResendState('idle');

    const emailErr = validateEmail(email);
    const passwordErr = validateLoginPassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    if (emailErr || passwordErr) return;

    setSubmitting(true);
    const result = await loginRequest(email, password);
    setSubmitting(false);

    if (result.ok) {
      login(result.value.token);
      navigate(redirectTarget, { replace: true });
      return;
    }

    if (result.error.code === errorCodes.EMAIL_NOT_VERIFIED) {
      setNeedsVerification(true);
      setFormError(result.error.message);
      return;
    }
    setFormError(result.error.message);
  }

  async function onResend(): Promise<void> {
    setResendState('sending');
    const result = await resendVerification(email);
    if (result.ok) {
      setResendState('sent');
      setResendMessage(result.value.message);
    } else {
      setResendState('error');
      setResendMessage(result.error.message);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          <span>
            New here? <Link to="/signup">Create an account</Link>
          </span>
          <span>
            Need a verification email? <Link to="/resend-verification">Resend it</Link>
          </span>
        </>
      }
    >
      <form style={stack} onSubmit={onSubmit} noValidate>
        {formError ? <Toast kind="error" message={formError} /> : null}

        {needsVerification ? (
          <div style={stack}>
            {resendState === 'sent' ? (
              <Toast kind="success" message={resendMessage ?? 'Verification email sent.'} />
            ) : null}
            {resendState === 'error' ? (
              <Toast kind="error" message={resendMessage ?? 'Could not send email.'} />
            ) : null}
            <Button
              type="button"
              disabled={resendState === 'sending'}
              onClick={() => {
                void onResend();
              }}
            >
              {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
            </Button>
          </div>
        ) : null}

        <Field label="Email" error={emailError}>
          <Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        </Field>
        <Field label="Password" error={passwordError}>
          <Input type="password" value={password} onChange={setPassword} placeholder="Your password" />
        </Field>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
