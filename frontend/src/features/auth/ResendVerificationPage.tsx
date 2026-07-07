/**
 * ResendVerificationPage (`/resend-verification`) — request a fresh verification email
 * (REQUIREMENTS §3/§10). A new token invalidates prior unused ones (server-side).
 *
 * The server always responds 202 for a well-formed email (whether or not it maps to an existing
 * unverified account — anti-enumeration), so the success copy is intentionally generic. Prefills
 * from `?email=` when the user arrives from sign-up.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Field, Input, Toast } from '@/components';
import { AuthLayout, stack } from './AuthLayout';
import { validateEmail } from './validation';
import { resendVerification } from './service';

export function ResendVerificationPage(): JSX.Element {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(() => params.get('email') ?? '');
  const [emailError, setEmailError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ message: string } | null>(null);
  const [formError, setFormError] = useState<string>();

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setFormError(undefined);

    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    if (emailErr) return;

    setSubmitting(true);
    const result = await resendVerification(email);
    setSubmitting(false);

    if (result.ok) {
      setSent({ message: result.value.message });
    } else {
      setFormError(result.error.message);
    }
  }

  return (
    <AuthLayout
      title="Resend verification email"
      footer={
        <span>
          <Link to="/login">Back to sign in</Link>
        </span>
      }
    >
      {sent ? (
        <div style={stack}>
          <Toast kind="success" message={sent.message} />
          <p>
            If an unverified account exists for <strong>{email.trim()}</strong>, a new verification
            link is on its way. The link expires in 24 hours and replaces any earlier one.
          </p>
        </div>
      ) : (
        <form style={stack} onSubmit={onSubmit} noValidate>
          {formError ? <Toast kind="error" message={formError} /> : null}
          <Field label="Email" error={emailError}>
            <Input type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send verification email'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
