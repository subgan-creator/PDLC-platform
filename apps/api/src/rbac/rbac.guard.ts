import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator';
import { PermissionsRepository } from './permissions.repository';

/**
 * Runs after AuthGuard (registered second in app.module.ts so `req.authUser`
 * is already set). Every route must either be `@Public()` or carry
 * `@RequirePermission()` — a route with neither is a bug, and this guard
 * fails closed (denies) rather than silently allowing it through.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      throw new ForbiddenException(
        'Route is missing @RequirePermission() and is not @Public() — denying by default. See CLAUDE.md.',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.authUser;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request.');
    }

    const allowed = await this.permissions.userHasPermission(user.userId, required);
    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${required.resource}:${required.action}`);
    }
    return true;
  }
}
