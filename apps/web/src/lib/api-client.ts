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
  /** Display-only, for the "Acting as" indicator — the API never reads these, only userId/tenantId. */
  displayName?: string;
  tenantName?: string;
}

/** The only value shapes a query-param object may hold — anything else is a caller bug, not a runtime possibility to guard. */
type QueryValue = string | number | boolean | undefined | null | Array<string | number | boolean>;

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

  // Don't gate empty-body handling on status 204 alone: NestJS's default
  // status for a controller method that returns void (every DELETE
  // endpoint in this app) is 200 with an empty body, not 204 — res.json()
  // throws a SyntaxError ("Unexpected end of JSON input") parsing that.
  // Never caught until Discovery Hub's Solution Tree editing became the
  // first place in the app to actually call a DELETE endpoint from the UI.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * `{ a: [1,2], b: undefined, c: 'x' }` -> `"?a=1&a=2&c=x"` — skips
 * null/undefined/empty so query objects can be built with optional filters
 * directly. Takes `object` (not `Record<string, unknown>`) so a concrete
 * params interface without an index signature — e.g. `ListInitiativesParams`
 * — can be passed straight through without a call-site cast.
 */
export function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as Array<[string, QueryValue]>) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when a mutation failed with the optimistic-concurrency 409 — `error.problem.conflict` is the current record for a merge prompt. */
export function isVersionConflict(error: unknown): error is ApiError {
  return isApiError(error) && error.problem.status === 409;
}
