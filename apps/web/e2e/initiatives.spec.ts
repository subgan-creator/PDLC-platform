import { expect, test, type Page } from '@playwright/test';
import { authenticateAsPm } from './helpers/auth';

/**
 * Initiative Workspace happy-path specs (Prompt 1). Requires a running API
 * + seeded Postgres — see playwright.config.ts and CLAUDE.md
 * ("docker compose up -d && pnpm db:migrate && pnpm db:seed" first).
 */

test.beforeEach(async ({ page }) => {
  await authenticateAsPm(page);
});

async function createInitiative(page: Page, title: string): Promise<void> {
  await page.goto('/initiatives');
  await page.getByRole('button', { name: 'New initiative' }).click();
  await page.getByRole('dialog', { name: 'New initiative' }).getByLabel('Title').fill(title);
  await page.getByLabel('Problem statement').fill('Customers cannot self-serve this task today.');
  await page.getByRole('button', { name: 'Create initiative' }).click();
  await expect(page).toHaveURL(/\/initiatives\/[^/]+$/);
}

test('create initiative', async ({ page }) => {
  const title = `E2E create ${Date.now()}`;
  await createInitiative(page, title);
  await expect(page.getByLabel('Initiative title')).toHaveValue(title);
});

test('edit inline', async ({ page }) => {
  const original = `E2E edit ${Date.now()}`;
  const updated = `${original} (renamed)`;
  await createInitiative(page, original);

  const titleInput = page.getByLabel('Initiative title');
  await titleInput.fill(updated);
  await titleInput.blur();

  // Reload to prove the PATCH actually persisted, not just local state.
  await page.reload();
  await expect(page.getByLabel('Initiative title')).toHaveValue(updated);
});

test('change health with reason', async ({ page }) => {
  await createInitiative(page, `E2E health ${Date.now()}`);

  await page.getByRole('combobox', { name: 'Health' }).click();
  await page.getByRole('option', { name: 'AMBER' }).click();
  await page
    .getByLabel('Reason (required for non-green health)')
    .fill('Dependency team slipped their date.');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('At risk')).toBeVisible();

  // Reload to prove healthReason was persisted, not just the badge.
  await page.reload();
  await expect(page.getByText('At risk')).toBeVisible();
});

test('drag an initiative on the roadmap', async ({ page }) => {
  await page.goto('/roadmap');
  await page.getByRole('tab', { name: 'Now / Next / Later' }).click();

  const nowColumn = page.locator('#bucket-NOW');
  await expect(nowColumn).toBeVisible();
  const card = nowColumn.locator('a').first();
  await expect(card).toBeVisible();
  const cardTitle = await card.textContent();

  const nextColumn = page.locator('#bucket-NEXT');
  const cardBox = await card.boundingBox();
  const targetBox = await nextColumn.boundingBox();
  if (!cardBox || !targetBox) throw new Error('Could not measure drag source/target.');

  // dnd-kit uses pointer events (not native HTML5 DnD), so this is a manual
  // pointer sequence past its activation-distance constraint, not page.dragTo().
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, cardBox.y + cardBox.height / 2, {
    steps: 10,
  });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 20, { steps: 10 });
  await page.mouse.up();

  await expect(nextColumn.locator('a', { hasText: cardTitle ?? '' })).toBeVisible();
});

test('filter the list and export CSV', async ({ page }) => {
  await page.goto('/initiatives');
  const table = page.getByRole('table', { name: 'Initiatives' });
  await expect(table).toBeVisible();
  const initialRowCount = await table.getByRole('row').count();

  await page.getByLabel('Search').fill('card');
  await expect(async () => {
    const filteredRowCount = await table.getByRole('row').count();
    expect(filteredRowCount).toBeLessThanOrEqual(initialRowCount);
    expect(filteredRowCount).toBeGreaterThan(1); // header row + at least one match
  }).toPass();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('initiatives.csv');
});
