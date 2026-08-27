import { expect, test } from '@playwright/test';
import { authenticateAsPm } from './helpers/auth';

/**
 * Discovery Hub happy-path spec (Prompt 2, JTBD 1) — same shape as
 * initiatives.spec.ts. Requires a running API + seeded Postgres (see
 * playwright.config.ts and CLAUDE.md).
 */

test.beforeEach(async ({ page }) => {
  await authenticateAsPm(page);
});

test('capture evidence, cluster into an insight, promote to an opportunity, promote to an initiative', async ({
  page,
}) => {
  const stamp = Date.now();

  await page.goto('/discovery');

  // Sources tab: add a source.
  const sourceName = `E2E source ${stamp}`;
  await page.getByLabel('Name').fill(sourceName);
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect(page.getByRole('cell', { name: sourceName })).toBeVisible();

  // Evidence tab: capture evidence against that source.
  await page.getByRole('tab', { name: 'Evidence' }).click();
  await page.getByRole('combobox', { name: 'Source' }).click();
  await page.getByRole('option', { name: sourceName }).click();
  const evidenceContent = `E2E evidence ${stamp}`;
  await page.getByLabel('What did you see or hear?').fill(evidenceContent);
  await page.getByLabel('Captured by (user id)').fill(process.env.E2E_USER_ID ?? '');
  await page.getByRole('button', { name: 'Add evidence' }).click();
  await expect(page.getByRole('cell', { name: evidenceContent })).toBeVisible();

  // Insights tab: cluster that evidence into an insight.
  await page.getByRole('tab', { name: 'Insights' }).click();
  const insightTitle = `E2E insight ${stamp}`;
  // getByLabel('Title', { exact: true }) — without exact, Playwright's
  // substring accessible-name matching also resolves an unrelated
  // "Select <insight>" checkbox elsewhere on the page (confirmed via
  // direct DOM inspection that the actual for/id label association for
  // the real Title input is unambiguous; this is specifically Playwright's
  // non-exact getByLabel matching, not a real markup bug). Also scoped to
  // the create-insight form as a second layer of safety.
  const createInsightForm = page.locator('form', { hasText: 'Add a new insight' });
  await createInsightForm.getByLabel('Title', { exact: true }).fill(insightTitle);
  await createInsightForm.getByLabel('Summary').fill('Summary of the E2E insight.');
  await createInsightForm.getByText(evidenceContent).click(); // the evidence checkbox
  await createInsightForm.getByRole('button', { name: 'Add insight' }).click();
  // exact: true — the "Select" checkbox column's accessible name ("Select
  // <title>") otherwise substring-matches this locator too.
  await expect(page.getByRole('cell', { name: insightTitle, exact: true })).toBeVisible();

  // Opportunities tab: promote that insight into an opportunity.
  await page.getByRole('tab', { name: 'Opportunities' }).click();
  const opportunityTitle = `E2E opportunity ${stamp}`;
  // See the createInsightForm comment above — same getByLabel(exact:true)
  // reasoning applies here too.
  const createOpportunityForm = page.locator('form', { hasText: 'Add a new opportunity directly' });
  await createOpportunityForm.getByLabel('Title', { exact: true }).fill(opportunityTitle);
  await createOpportunityForm.getByLabel('Problem framing').fill('Framing for the E2E opportunity.');
  await createOpportunityForm.getByText(insightTitle).click(); // the insight checkbox
  await createOpportunityForm.getByRole('button', { name: 'Add opportunity' }).click();
  await expect(page.getByRole('link', { name: opportunityTitle })).toBeVisible();

  // Opportunity detail: promote to an initiative, and confirm the trail
  // shows on the resulting initiative's Overview tab.
  await page.getByRole('link', { name: opportunityTitle }).click();
  await expect(page).toHaveURL(/\/discovery\/opportunities\/[^/]+$/);
  await page.getByRole('button', { name: 'Promote to initiative' }).click();
  await page.getByRole('button', { name: 'Promote', exact: true }).click();

  await expect(page).toHaveURL(/\/initiatives\/[^/]+$/);
  await expect(page.getByLabel('Initiative title')).toHaveValue(opportunityTitle);
  await expect(page.getByText(`Promoted from Opportunity: ${opportunityTitle}`)).toBeVisible();
});
