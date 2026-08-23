import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InsightsRepository } from './insights.repository';
import {
  createInsightSchema,
  listInsightsQuerySchema,
  updateInsightSchema,
  type CreateInsightDto,
  type ListInsightsQueryDto,
  type UpdateInsightDto,
} from './dto/insight.dto';

@ApiTags('discovery')
@Controller('discovery/insights')
export class InsightsController {
  constructor(private readonly repo: InsightsRepository) {}

  @Get()
  @RequirePermission('discovery', 'READ')
  list(@Query(new ZodValidationPipe(listInsightsQuerySchema)) query: ListInsightsQueryDto) {
    return this.repo.list(query);
  }

  @Post()
  @RequirePermission('discovery', 'CREATE')
  @AuditLog('CREATE', 'Insight')
  create(
    @Body(new ZodValidationPipe(createInsightSchema)) body: CreateInsightDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('discovery', 'UPDATE')
  @AuditLog('UPDATE', 'Insight')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInsightSchema)) body: UpdateInsightDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('discovery', 'DELETE')
  @AuditLog('DELETE', 'Insight')
  delete(@Param('id') id: string) {
    return this.repo.delete(id);
  }
}
