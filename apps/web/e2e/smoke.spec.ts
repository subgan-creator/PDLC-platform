import { expect, test } from '@playwright/test';

/**
 * Primary happy path for the Phase 0 shell: the app loads, the persistent
 * nav is present, and the signature ⌘K command palette opens and is
 * keyboard-operable end to end. Every later phase adds its own happy-path
 * spec here rather than growing this one — see CLAUDE.md.
 */
test('app shell loads and the command palette opens with the keyboard', async ({ page }) => {
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
