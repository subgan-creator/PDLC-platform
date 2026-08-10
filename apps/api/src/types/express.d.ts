// Augments Express's own global namespace (the pattern @types/express itself
// uses) rather than a specific @types/express-serve-static-core module path,
// which shifts between @types/express major versions.
export {};

declare global {
  namespace Express {
    interface Request {
      /** Set by AuthGuard once the token/dev-stub header is verified. */
      authUser?: { userId: string; tenantId: string };
    }
  }
}
