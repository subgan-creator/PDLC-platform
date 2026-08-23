import { expect, test } from '@playwright/test';
import { authenticateAsPm } from './helpers/auth';

/**
 * Primary happy path for the Phase 0 shell: the app loads, the persistent
 * nav is present, and the signature ⌘K command palette opens and is
 * keyboard-operable end to end. Every later phase adds its own happy-path
 * spec here rather than growing this one — see CLAUDE.md.
 *
 * Needs authenticateAsPm like every other spec — without a dev identity in
 * localStorage, DevIdentityGate blocks the app behind the "Who are you?"
 * picker instead of rendering the nav (see auth/DevIdentityGate.tsx). Found
 * this failing while running the full suite during Phase 2 work — a
 * pre-existing gap, not something Phase 2 touched.
 */
test('app shell loads and the command palette opens with the keyboard', async ({ page }) => {
  await authenticateAsPm(page);
  await page.goto('/');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My Day' })).toBeVisible();

  await page.keyboard.press('Meta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();

  await page.keyboard.type('My Day');
  await page.getByRole('option', { name: 'Go to My Day' }).click();
  await expect(dialog).not.toBeVisible();
});
