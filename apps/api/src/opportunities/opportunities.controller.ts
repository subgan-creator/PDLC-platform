import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OpportunitiesRepository } from './opportunities.repository';
import {
  createOpportunitySchema,
  listOpportunitiesQuerySchema,
  promoteOpportunitySchema,
  updateOpportunitySchema,
  type CreateOpportunityDto,
  type ListOpportunitiesQueryDto,
  type PromoteOpportunityDto,
  type UpdateOpportunityDto,
} from './dto/opportunity.dto';

@ApiTags('discovery')
@Controller('discovery/opportunities')
export class OpportunitiesController {
  constructor(private readonly repo: OpportunitiesRepository) {}

  @Get()
  @RequirePermission('discovery', 'READ')
  list(@Query(new ZodValidationPipe(listOpportunitiesQuerySchema)) query: ListOpportunitiesQueryDto) {
    return this.repo.list(query);
  }

  @Get(':id')
  @RequirePermission('discovery', 'READ')
  findById(@Param('id') id: string) {
    return this.repo.findById(id);
  }

  @Post()
  @RequirePermission('discovery', 'CREATE')
  @AuditLog('CREATE', 'Opportunity')
  create(
    @Body(new ZodValidationPipe(createOpportunitySchema)) body: CreateOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('discovery', 'UPDATE')
  @AuditLog('UPDATE', 'Opportunity')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOpportunitySchema)) body: UpdateOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('discovery', 'DELETE')
  @AuditLog('DELETE', 'Opportunity')
  delete(@Param('id') id: string) {
    return this.repo.delete(id);
  }

  @Post(':id/promote')
  @RequirePermission('discovery', 'UPDATE')
  @AuditLog('UPDATE', 'Opportunity')
  promote(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(promoteOpportunitySchema)) body: PromoteOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.promote(id, body, user.userId);
  }
}
