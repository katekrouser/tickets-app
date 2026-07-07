/**
 * SMTP transport (A5) — nodemailer over configurable SMTP (ADR-0007).
 *
 * Reads ONLY the frozen SMTP_* env values via A4's config loader (never invents
 * env names). A single lazily-created transport is reused for the process. Auth
 * is attached only when SMTP_USER is set, so dev (Mailhog: no auth, port 1025)
 * and prod (e.g. relay1.dataart.com, port 587) both work from the same code.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { getConfig } from 'backend/src/core/config';

let cached: Transporter | undefined;

/** Returns the shared, lazily-initialised SMTP transport. */
export function getMailer(): Transporter {
  if (cached) return cached;
  const { smtp } = getConfig();
  cached = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    // Implicit TLS only on 465; other ports (587 STARTTLS, 1025 Mailhog) start plaintext.
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  return cached;
}
