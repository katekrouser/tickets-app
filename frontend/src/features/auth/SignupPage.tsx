/**
 * SignupPage (`/signup`) — register email + password.
 *
 * - Mirrors server validation client-side (validation.ts); server stays authoritative.
 * - Adds a client-only "confirm password" check (never sent) to catch typos early.
 * - 409 EMAIL_TAKEN → field-level error; other failures → inline error toast.
 * - On 201 shows a success panel telling the user to check their inbox. NO auto-login
 *   (REQUIREMENTS §3) — the account is unverified until the emailed link is used.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorCodes } from '@app/shared';
import { Button, Field, Input, Toast } from '@/components';
import { AuthLayout, stack } from './AuthLayout';
import { validateEmail, validateNewPassword } from './validation';
import { signup } from './service';

export function SignupPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ message: string } | null>(null);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setFormError(undefined);

    const emailErr = validateEmail(email);
    const passwordErr = validateNewPassword(password);
    const confirmErr = password !== confirm ? 'Passwords do not match.' : undefined;
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmError(confirmErr);
    if (emailErr || passwordErr || confirmErr) return;

    setSubmitting(true);
    const result = await signup(email, password);
    setSubmitting(false);

    if (result.ok) {
      setDone({ message: result.value.message });
      return;
    }
    if (result.error.code === errorCodes.EMAIL_TAKEN) {
      setEmailError(result.error.message);
      return;
    }
    setFormError(result.error.message);
  }

  if (done) {
    return (
      <AuthLayout
        title="Check your email"
        footer={
          <>
            <span>
              Already verified? <Link to="/login">Sign in</Link>
            </span>
            <span>
              Didn&apos;t get the email?{' '}
              <Link to={`/resend-verification?email=${encodeURIComponent(email.trim())}`}>
                Resend verification
              </Link>
            </span>
          </>
        }
      >
        <Toast kind="success" message={done.message} />
        <p>
          We sent a verification link to <strong>{email.trim()}</strong>. Open it to activate your
          account, then sign in. You must verify before using the app.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      footer={
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      }
    >
      <form style={stack} onSubmit={onSubmit} noValidate>
        {formError ? <Toast kind="error" message={formError} /> : null}
        <Field label="Email" error={emailError}>
          <Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        </Field>
        <Field label="Password" error={passwordError}>
          <Input
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm password" error={confirmError}>
          <Input
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter your password"
          />
        </Field>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
