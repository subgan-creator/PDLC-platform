import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SourcesRepository } from './sources.repository';
import {
  createSourceSchema,
  updateSourceSchema,
  type CreateSourceDto,
  type UpdateSourceDto,
} from './dto/source.dto';

@ApiTags('discovery')
@Controller('discovery/sources')
export class SourcesController {
  constructor(private readonly repo: SourcesRepository) {}

  @Get()
  @RequirePermission('discovery', 'READ')
  list() {
    return this.repo.list();
  }

  @Post()
  @RequirePermission('discovery', 'CREATE')
  @AuditLog('CREATE', 'Source')
  create(
    @Body(new ZodValidationPipe(createSourceSchema)) body: CreateSourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('discovery', 'UPDATE')
  @AuditLog('UPDATE', 'Source')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSourceSchema)) body: UpdateSourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('discovery', 'DELETE')
  @AuditLog('DELETE', 'Source')
  delete(@Param('id') id: string) {
    return this.repo.delete(id);
  }
}
