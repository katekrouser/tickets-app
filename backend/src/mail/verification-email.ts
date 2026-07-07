/**
 * Verification email template (A5).
 *
 * Builds the subject/text/html for the account-verification message. The only
 * link in the message is the single-use verification URL (the sole token
 * permitted to travel in a URL — REQUIREMENTS §9, ADR-0004). No bearer/JWT is
 * ever placed here.
 */

export interface VerificationEmailContent {
  subject: string;
  text: string;
  html: string;
}

/** Compose the verification email for the given absolute verification URL. */
export function buildVerificationEmail(verifyUrl: string): VerificationEmailContent {
  const subject = 'Verify your email — Hackathon Ticket Tracker';

  const text = [
    'Welcome to the Hackathon Ticket Tracker.',
    '',
    'Please confirm your email address by opening the link below.',
    'This link is valid for 24 hours and can be used only once:',
    '',
    verifyUrl,
    '',
    'If you did not create an account, you can safely ignore this message.',
  ].join('\n');

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1a1a1a">',
    '<h2 style="margin:0 0 12px">Verify your email</h2>',
    '<p>Welcome to the Hackathon Ticket Tracker. Please confirm your email address to activate your account.</p>',
    `<p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p>`,
    '<p style="font-size:13px;color:#555">This link is valid for 24 hours and can be used only once.</p>',
    `<p style="font-size:13px;color:#555">If the button does not work, copy this URL into your browser:<br><span style="word-break:break-all">${verifyUrl}</span></p>`,
    '<p style="font-size:13px;color:#555">If you did not create an account, you can safely ignore this message.</p>',
    '</div>',
  ].join('');

  return { subject, text, html };
}
