import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from '@prisma/client';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  resource: string;
  action: PermissionAction;
}

/**
 * Declares the permission a route requires, e.g.
 * `@RequirePermission('initiative', 'READ')`. RbacGuard reads this
 * metadata and denies with 403 (problem+json) if the caller's roles don't
 * grant it. Every non-@Public endpoint must carry exactly one of these —
 * "no exceptions" per CLAUDE.md.
 */
export const RequirePermission = (resource: string, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);
