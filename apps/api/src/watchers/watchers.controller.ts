import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { WatchersRepository } from './watchers.repository';

/** Watch/unwatch is always self-service — no `@AuditLog` (not a sensitive mutation) and no arbitrary userId in the body. */
@ApiTags('watchers')
@Controller('initiatives/:initiativeId/watchers')
export class WatchersController {
  constructor(private readonly repo: WatchersRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post('me')
  @RequirePermission('initiative', 'READ')
  watch(@Param('initiativeId') initiativeId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repo.watch(initiativeId, user.userId);
  }

  @Delete('me')
  @RequirePermission('initiative', 'READ')
  unwatch(@Param('initiativeId') initiativeId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repo.unwatch(initiativeId, user.userId);
  }
}
