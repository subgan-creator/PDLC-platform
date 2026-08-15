import type { Page } from '@playwright/test';

/**
 * Seeds AuthProvider's dev-stub identity into localStorage before any app
 * code runs (see apps/web/src/auth/auth-context.tsx), using the tenant/user
 * global-setup resolved from the real seeded database.
 */
export async function authenticateAsPm(page: Page): Promise<void> {
  const tenantId = process.env.E2E_TENANT_ID;
  const userId = process.env.E2E_USER_ID;
  if (!tenantId || !userId) {
    throw new Error('E2E_TENANT_ID/E2E_USER_ID not set — did global-setup run?');
  }
  await page.addInitScript((identity: string) => {
    window.localStorage.setItem('pdlc.devIdentity', identity);
  }, JSON.stringify({ tenantId, userId }));
}
