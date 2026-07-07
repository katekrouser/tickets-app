import { test, expect, type Page } from '@playwright/test';

/**
 * Kanban drag-and-drop E2E (REQUIREMENTS §6/§8, §13):
 *   - dragging a card to another column changes its state and persists via API,
 *   - the change survives a full page refresh,
 *   - a failed persist rolls the card back to its previous column + shows an error.
 *
 * Execute in CI/Docker. Assumes a signed-in session + a board with at least one
 * ticket; uses a storageState/fixture in CI (see e2e helpers / A2 wiring note).
 * @dnd-kit uses pointer sensors, so we drive a stepped pointer drag.
 */

/** Stepped pointer drag from a source card to a target column (dnd-kit friendly). */
async function dragCardToColumn(page: Page, cardText: string, columnName: RegExp): Promise<void> {
  const card = page.getByText(cardText, { exact: false }).first();
  const column = page.getByRole('list', { name: columnName }).or(page.getByTestId(`column-${columnName.source}`)).first();
  const from = await card.boundingBox();
  const to = await column.boundingBox();
  if (!from || !to) throw new Error('card or column not found for drag');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Multiple small moves so dnd-kit's activation constraint fires.
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps + to.width / 2,
      from.y + ((to.y - from.y) * i) / steps + to.height / 2,
    );
  }
  await page.mouse.up();
}

test.describe('board drag-and-drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board');
  });

  test('drag persists the new state and survives a refresh', async ({ page }) => {
    const ticket = 'DnD ticket';
    await dragCardToColumn(page, ticket, /in progress/i);

    // The card now lives in the In Progress column.
    const inProgress = page.getByRole('list', { name: /in progress/i });
    await expect(inProgress.getByText(ticket)).toBeVisible();

    // Persisted: a full reload keeps it there (server is the source of truth).
    await page.reload();
    await expect(page.getByRole('list', { name: /in progress/i }).getByText(ticket)).toBeVisible();
  });

  test('rolls back to the previous column and shows an error when the update fails', async ({
    page,
  }) => {
    const ticket = 'Rollback ticket';
    // Force the PATCH to fail.
    await page.route('**/api/tickets/*', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 500, body: JSON.stringify({ code: 'INTERNAL', message: 'boom' }) })
        : route.continue(),
    );
    await dragCardToColumn(page, ticket, /done/i);

    // UI surfaces an error…
    await expect(page.getByRole('alert').or(page.getByText(/failed|error|could not/i))).toBeVisible();
    // …and the card returns to its original column (not in Done).
    await expect(page.getByRole('list', { name: /done/i }).getByText(ticket)).toHaveCount(0);
  });
});
