import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { MilestonesRepository } from './milestones.repository';
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  type CreateMilestoneDto,
  type UpdateMilestoneDto,
} from './dto/milestone.dto';

@ApiTags('milestones')
@Controller('initiatives/:initiativeId/milestones')
export class MilestonesController {
  constructor(private readonly repo: MilestonesRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('CREATE', 'Milestone')
  create(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(createMilestoneSchema)) body: CreateMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(initiativeId, body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'Milestone')
  update(
    @Param('initiativeId') initiativeId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMilestoneSchema)) body: UpdateMilestoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(initiativeId, id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('DELETE', 'Milestone')
  delete(@Param('initiativeId') initiativeId: string, @Param('id') id: string) {
    return this.repo.delete(initiativeId, id);
  }
}
