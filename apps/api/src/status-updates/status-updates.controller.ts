import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StatusUpdatesRepository } from './status-updates.repository';
import { createStatusUpdateSchema, type CreateStatusUpdateDto } from './dto/status-update.dto';

@ApiTags('status-updates')
@Controller('initiatives/:initiativeId/status-updates')
export class StatusUpdatesController {
  constructor(private readonly repo: StatusUpdatesRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('CREATE', 'StatusUpdate')
  create(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(createStatusUpdateSchema)) body: CreateStatusUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(initiativeId, body, user.userId);
  }
}
