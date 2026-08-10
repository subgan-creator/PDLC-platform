import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextData {
  requestId: string;
  tenantId: string | null;
  userId: string | null;
}

/**
 * Carries {tenantId, userId, requestId} for the lifetime of a request
 * without threading them through every function signature. Populated by
 * RequestContextMiddleware; read by PrismaService (to set the RLS session
 * variable), AuditInterceptor, and the global exception filter (to stamp
 * requestId onto every ProblemDetails response).
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  static run<T>(data: RequestContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  static current(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  /**
   * Mutates the in-flight request's context. `getStore()` returns the same
   * object reference for the lifetime of the request (AsyncLocalStorage
   * propagates it through the whole async chain — middleware, guards,
   * interceptors, handler), so AuthGuard calls this once it has verified
   * the caller to fill in tenantId/userId without needing to re-wrap
   * anything in a new `run()`.
   */
  static set(patch: Partial<Omit<RequestContextData, 'requestId'>>): void {
    const ctx = this.storage.getStore();
    if (!ctx) {
      throw new Error('RequestContext.set called outside of a request context.');
    }
    Object.assign(ctx, patch);
  }

  static requireTenantId(): string {
    const ctx = this.storage.getStore();
    if (!ctx?.tenantId) {
      throw new Error(
        'RequestContext: no tenantId set — every tenant-scoped repository call must run inside a request.',
      );
    }
    return ctx.tenantId;
  }
}
