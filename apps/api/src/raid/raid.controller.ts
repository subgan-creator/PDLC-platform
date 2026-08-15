import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RaidRepository } from './raid.repository';
import {
  createRaidItemSchema,
  updateRaidItemSchema,
  type CreateRaidItemDto,
  type UpdateRaidItemDto,
} from './dto/raid.dto';

@ApiTags('raid')
@Controller('initiatives/:initiativeId/raid')
export class RaidController {
  constructor(private readonly repo: RaidRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('CREATE', 'RaidItem')
  create(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(createRaidItemSchema)) body: CreateRaidItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(initiativeId, body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'RaidItem')
  update(
    @Param('initiativeId') initiativeId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRaidItemSchema)) body: UpdateRaidItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(initiativeId, id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('DELETE', 'RaidItem')
  delete(@Param('initiativeId') initiativeId: string, @Param('id') id: string) {
    return this.repo.delete(initiativeId, id);
  }
}
