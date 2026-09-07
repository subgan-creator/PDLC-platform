import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OutcomeMetricsRepository } from './outcome-metrics.repository';
import {
  createOutcomeMetricSchema,
  updateOutcomeMetricSchema,
  type CreateOutcomeMetricDto,
  type UpdateOutcomeMetricDto,
} from './dto/outcome-metric.dto';

@ApiTags('outcome-metrics')
@Controller('initiatives/:initiativeId/outcome-metrics')
export class OutcomeMetricsController {
  constructor(private readonly repo: OutcomeMetricsRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('CREATE', 'OutcomeMetric')
  create(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(createOutcomeMetricSchema)) body: CreateOutcomeMetricDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(initiativeId, body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'OutcomeMetric')
  update(
    @Param('initiativeId') initiativeId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOutcomeMetricSchema)) body: UpdateOutcomeMetricDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(initiativeId, id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('DELETE', 'OutcomeMetric')
  delete(@Param('initiativeId') initiativeId: string, @Param('id') id: string) {
    return this.repo.delete(initiativeId, id);
  }
}
