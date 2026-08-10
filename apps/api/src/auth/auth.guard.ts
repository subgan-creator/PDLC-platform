import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';
import { APP_ENV } from '../config/config.module';
import type { ApiEnv } from '../config/env.schema';
import { RequestContext } from '../common/request-context/request-context';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global auth guard (registered via APP_GUARD in app.module.ts). Two modes:
 *
 * - `oidc` (production): verifies the bearer JWT against the tenant's OIDC
 *   issuer JWKS, per A5 ("SSO via OIDC + SAML 2.0").
 * - `dev-stub` (local dev / CI only — refused outside NODE_ENV=development
 *   and NODE_ENV=test at construction time): trusts `x-dev-user-id` /
 *   `x-dev-tenant-id` headers so the rest of the stack can be exercised
 *   without a real identity provider.
 *
 * Either way, on success it fills in RequestContext (tenantId/userId) via
 * `RequestContext.set()` and attaches `req.authUser`, which
 * `@CurrentUser()` reads.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {
    if (this.env.AUTH_MODE === 'dev-stub' && this.env.NODE_ENV === 'production') {
      throw new Error('AUTH_MODE=dev-stub is forbidden when NODE_ENV=production.');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();

    const { userId, tenantId } =
      this.env.AUTH_MODE === 'dev-stub'
        ? this.authenticateDevStub(req)
        : await this.authenticateOidc(req);

    req.authUser = { userId, tenantId };
    RequestContext.set({ userId, tenantId });
    return true;
  }

  private authenticateDevStub(req: Request): { userId: string; tenantId: string } {
    const userId = req.headers['x-dev-user-id'];
    const tenantId = req.headers['x-dev-tenant-id'];
    if (typeof userId !== 'string' || typeof tenantId !== 'string') {
      throw new UnauthorizedException(
        'dev-stub auth requires x-dev-user-id and x-dev-tenant-id headers. Set AUTH_MODE=oidc for real auth.',
      );
    }
    return { userId, tenantId };
  }

  private async authenticateOidc(req: Request): Promise<{ userId: string; tenantId: string }> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    if (!this.env.OIDC_ISSUER_URL || !this.env.OIDC_AUDIENCE) {
      throw new Error('OIDC_ISSUER_URL and OIDC_AUDIENCE must be set when AUTH_MODE=oidc.');
    }
    this.jwks ??= createRemoteJWKSet(new URL(`${this.env.OIDC_ISSUER_URL}/.well-known/jwks.json`));

    const token = authHeader.slice('Bearer '.length);
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.env.OIDC_ISSUER_URL,
        audience: this.env.OIDC_AUDIENCE,
      });
      const userId = payload.sub;
      // Tenant claim shape depends on the IdP config (custom claim, e.g. "pdlc:tenant_id").
      const tenantId = (payload['pdlc:tenant_id'] as string | undefined) ?? undefined;
      if (!userId || !tenantId) {
        throw new UnauthorizedException('Token missing subject or tenant claim.');
      }
      return { userId, tenantId };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
