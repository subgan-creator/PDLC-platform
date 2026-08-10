import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
}

/** Injects the verified caller into a handler: `@CurrentUser() user: AuthenticatedUser`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.authUser) {
      throw new Error(
        'CurrentUser used on a route without AuthGuard — every non-@Public route must be guarded.',
      );
    }
    return req.authUser;
  },
);
