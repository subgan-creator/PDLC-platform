import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SolutionTreeRepository } from './solution-tree.repository';
import {
  createSolutionTreeNodeSchema,
  updateSolutionTreeNodeSchema,
  type CreateSolutionTreeNodeDto,
  type UpdateSolutionTreeNodeDto,
} from './dto/solution-tree-node.dto';

@ApiTags('discovery')
@Controller('discovery/opportunities/:opportunityId/tree')
export class SolutionTreeController {
  constructor(private readonly repo: SolutionTreeRepository) {}

  @Get()
  @RequirePermission('discovery', 'READ')
  list(@Param('opportunityId') opportunityId: string) {
    return this.repo.list(opportunityId);
  }

  @Post()
  @RequirePermission('discovery', 'CREATE')
  @AuditLog('CREATE', 'OpportunitySolutionTreeNode')
  create(
    @Param('opportunityId') opportunityId: string,
    @Body(new ZodValidationPipe(createSolutionTreeNodeSchema)) body: CreateSolutionTreeNodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(opportunityId, body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('discovery', 'UPDATE')
  @AuditLog('UPDATE', 'OpportunitySolutionTreeNode')
  update(
    @Param('opportunityId') opportunityId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSolutionTreeNodeSchema)) body: UpdateSolutionTreeNodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(opportunityId, id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('discovery', 'DELETE')
  @AuditLog('DELETE', 'OpportunitySolutionTreeNode')
  delete(@Param('opportunityId') opportunityId: string, @Param('id') id: string) {
    return this.repo.delete(opportunityId, id);
  }
}
