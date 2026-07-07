/**
 * Mail module public entrypoint (A5).
 *
 * Exposes the one email this app sends: the account-verification message. The
 * SMTP transport (mailer.ts) and template (verification-email.ts) are internal.
 */
import { getConfig } from 'backend/src/core/config';
import { getMailer } from './mailer.js';
import { buildVerificationEmail } from './verification-email.js';

/**
 * Send the verification email to `to` with the single-use `verifyUrl`.
 * Throws if SMTP delivery fails (callers decide whether to swallow/retry).
 */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const { smtp } = getConfig();
  const { subject, text, html } = buildVerificationEmail(verifyUrl);
  await getMailer().sendMail({ from: smtp.from, to, subject, text, html });
}
