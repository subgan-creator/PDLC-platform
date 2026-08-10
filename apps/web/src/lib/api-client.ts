import type { ProblemDetails } from '@pdlc/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
  }
}

export interface DevIdentity {
  userId: string;
  tenantId: string;
}

/**
 * Thin fetch wrapper every data hook goes through. In dev-stub auth mode
 * (see apps/api AuthGuard) it attaches the x-dev-* headers from
 * useDevIdentity/localStorage; in OIDC mode it attaches a real bearer
 * token from the auth context instead (TODO once the OIDC client lands).
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  devIdentity?: DevIdentity,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (devIdentity) {
    headers.set('x-dev-user-id', devIdentity.userId);
    headers.set('x-dev-tenant-id', devIdentity.tenantId);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(
      problem ?? { type: 'about:blank', title: res.statusText, status: res.status },
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
