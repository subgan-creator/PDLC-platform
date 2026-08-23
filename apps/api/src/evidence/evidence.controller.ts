import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EvidenceRepository } from './evidence.repository';
import {
  createEvidenceItemSchema,
  updateEvidenceItemSchema,
  type CreateEvidenceItemDto,
  type UpdateEvidenceItemDto,
} from './dto/evidence.dto';

@ApiTags('discovery')
@Controller('discovery/sources/:sourceId/evidence')
export class EvidenceController {
  constructor(private readonly repo: EvidenceRepository) {}

  @Get()
  @RequirePermission('discovery', 'READ')
  list(@Param('sourceId') sourceId: string) {
    return this.repo.list(sourceId);
  }

  @Post()
  @RequirePermission('discovery', 'CREATE')
  @AuditLog('CREATE', 'EvidenceItem')
  create(
    @Param('sourceId') sourceId: string,
    @Body(new ZodValidationPipe(createEvidenceItemSchema)) body: CreateEvidenceItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(sourceId, body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('discovery', 'UPDATE')
  @AuditLog('UPDATE', 'EvidenceItem')
  update(
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEvidenceItemSchema)) body: UpdateEvidenceItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(sourceId, id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('discovery', 'DELETE')
  @AuditLog('DELETE', 'EvidenceItem')
  delete(@Param('sourceId') sourceId: string, @Param('id') id: string) {
    return this.repo.delete(sourceId, id);
  }
}
