import { apiFetch } from '../lib/api-client';

/** Mirrors apps/api's DevIdentityOption — see dev-tools.controller.ts. */
export interface DevIdentityOption {
  tenantId: string;
  tenantName: string;
  userId: string;
  displayName: string;
  email: string;
  persona: string;
}

/**
 * Public (no auth headers needed) — see the dev-only /dev/identities
 * endpoint, which only responds when the API is running in
 * AUTH_MODE=dev-stub (refused entirely in production).
 */
export function listDevIdentities(): Promise<DevIdentityOption[]> {
  return apiFetch('/dev/identities');
}
