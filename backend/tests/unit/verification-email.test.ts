import { describe, expect, it } from 'vitest';
import { buildVerificationEmail } from 'backend/src/mail/verification-email.js';

/**
 * Verification-email template (REQUIREMENTS §3). The message must carry the
 * single-use verification URL (the only token allowed in a URL, ADR-0004) and
 * communicate the 24h / single-use policy. It must never embed a bearer/JWT.
 */
describe('buildVerificationEmail', () => {
  const url = 'http://localhost:8080/api/auth/verify-email?token=abc123def';
  const email = buildVerificationEmail(url);

  it('has a verification subject', () => {
    expect(email.subject).toMatch(/verify/i);
  });

  it('embeds the exact verification URL in both text and html parts', () => {
    expect(email.text).toContain(url);
    expect(email.html).toContain(url);
  });

  it('states the 24h + single-use policy', () => {
    expect(email.text).toMatch(/24 hours/i);
    expect(email.text.toLowerCase()).toContain('once');
  });

  it('does not embed any bearer/JWT token language', () => {
    expect(email.text.toLowerCase()).not.toContain('bearer');
    expect(email.html.toLowerCase()).not.toContain('bearer');
  });
});
