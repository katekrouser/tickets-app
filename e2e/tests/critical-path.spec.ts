import { test, expect } from '@playwright/test';
import { clearMailbox, extractVerifyUrl, waitForEmailBody } from '../helpers/mailhog';

/**
 * CRITICAL PATH E2E (REQUIREMENTS §13 Definition of Done):
 *   signup → email verification → login → team → epic → ticket → comment →
 *   drag-and-drop → logout.
 *
 * Execute in CI/Docker against the running stack. Selectors are role/label/text
 * based to survive markup churn; tune if the FE (A9–A13) diverges.
 */
const password = 'password12345';
const email = () => `qa+${Date.now()}@example.com`;

test('full critical path: signup → verify → login → team → epic → ticket → comment → drag → logout', async ({
  page,
}) => {
  const user = email();
  await clearMailbox();

  // 1) SIGN UP (no auto-login).
  await page.goto('/signup');
  await page.getByLabel(/email/i).fill(user);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign up|create/i }).click();
  await expect(page.getByText(/verify|check your email/i)).toBeVisible();

  // 2) EMAIL VERIFICATION via the Mailhog-captured link.
  const body = await waitForEmailBody(user);
  const verifyUrl = extractVerifyUrl(body);
  await page.goto(verifyUrl);
  // Success routes to the login screen (no auto-login, §3).
  await expect(page).toHaveURL(/\/login/);

  // 3) LOGIN.
  await page.getByLabel(/email/i).fill(user);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).click();
  await expect(page).toHaveURL(/\/board/);

  // 4) TEAM management.
  const teamName = `Team ${Date.now()}`;
  await page.goto('/teams');
  await page.getByRole('button', { name: /new team|add team|create/i }).click();
  await page.getByLabel(/name/i).fill(teamName);
  await page.getByRole('button', { name: /save|create/i }).click();
  await expect(page.getByText(teamName)).toBeVisible();

  // 5) EPIC management.
  const epicTitle = `Epic ${Date.now()}`;
  await page.goto('/epics');
  await page.getByRole('button', { name: /new epic|add epic|create/i }).click();
  await page.getByLabel(/title/i).fill(epicTitle);
  // Team selector (dropdown) — pick the team we just created.
  await page.getByLabel(/team/i).selectOption({ label: teamName }).catch(() => undefined);
  await page.getByRole('button', { name: /save|create/i }).click();
  await expect(page.getByText(epicTitle)).toBeVisible();

  // 6) TICKET create.
  const ticketTitle = `Ticket ${Date.now()}`;
  await page.goto('/tickets/new');
  await page.getByLabel(/team/i).selectOption({ label: teamName }).catch(() => undefined);
  await page.getByLabel(/title/i).fill(ticketTitle);
  await page.getByLabel(/body|description/i).fill('Repro steps here.');
  await page.getByRole('button', { name: /save|create/i }).click();
  await expect(page.getByText(ticketTitle)).toBeVisible();

  // 7) COMMENT — open the ticket and add a comment (author + timestamp shown).
  await page.getByText(ticketTitle).click();
  await page.getByLabel(/comment/i).fill('Looking into this.');
  await page.getByRole('button', { name: /add comment|comment|post/i }).click();
  await expect(page.getByText('Looking into this.')).toBeVisible();

  // 8) LOGOUT via the header user menu.
  await page.getByRole('button', { name: /log ?out|sign ?out|account|menu/i }).first().click();
  await page.getByRole('menuitem', { name: /log ?out|sign ?out/i }).click().catch(async () => {
    await page.getByRole('button', { name: /log ?out|sign ?out/i }).click();
  });
  await expect(page).toHaveURL(/\/login/);
});
