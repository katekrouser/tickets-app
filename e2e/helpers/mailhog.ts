/**
 * Mailhog helper (A14 E2E). In the dev/CI stack, verification emails are captured
 * by Mailhog (SMTP :1025, HTTP API :8025). We poll its API for the message sent to
 * a given address and extract the single-use verification URL from the body.
 */
const MAILHOG_URL = process.env.MAILHOG_URL ?? 'http://localhost:8025';

interface MailhogMessage {
  Content: { Headers: Record<string, string[]>; Body: string };
  Raw: { To: string[] };
}

/** Poll Mailhog until an email to `recipient` arrives; return its decoded body. */
export async function waitForEmailBody(recipient: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const target = recipient.trim().toLowerCase();
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILHOG_URL}/api/v2/messages`);
    if (res.ok) {
      const data = (await res.json()) as { items: MailhogMessage[] };
      const msg = data.items.find((m) =>
        (m.Content.Headers['To'] ?? []).join(',').toLowerCase().includes(target),
      );
      if (msg) return msg.Content.Body.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No verification email for ${recipient} within ${timeoutMs}ms`);
}

/** Extract the /verify-email?token=… URL (or its API form) from an email body. */
export function extractVerifyUrl(body: string): string {
  const match = body.match(/https?:\/\/[^\s"'<>]*verify-email[^\s"'<>]*/i);
  if (!match) throw new Error('No verification URL found in email body');
  return match[0];
}

/** Clear the Mailhog inbox so each test starts clean. */
export async function clearMailbox(): Promise<void> {
  await fetch(`${MAILHOG_URL}/api/v1/messages`, { method: 'DELETE' }).catch(() => undefined);
}
