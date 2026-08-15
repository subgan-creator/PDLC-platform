import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StakeholdersRepository } from './stakeholders.repository';
import {
  addStakeholderSchema,
  raciRoleSchema,
  type AddStakeholderDto,
} from './dto/stakeholder.dto';

@ApiTags('stakeholders')
@Controller('initiatives/:initiativeId/stakeholders')
export class StakeholdersController {
  constructor(private readonly repo: StakeholdersRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'InitiativeStakeholder')
  add(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(addStakeholderSchema)) body: AddStakeholderDto,
  ) {
    return this.repo.add(initiativeId, body);
  }

  @Delete(':userId/:raciRole')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'InitiativeStakeholder')
  remove(
    @Param('initiativeId') initiativeId: string,
    @Param('userId') userId: string,
    @Param('raciRole') raciRole: string,
  ) {
    return this.repo.remove(initiativeId, userId, raciRoleSchema.parse(raciRole));
  }
}
