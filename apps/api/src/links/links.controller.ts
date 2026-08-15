import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { LinksRepository } from './links.repository';
import { createLinkSchema, type CreateLinkDto } from './dto/link.dto';

@ApiTags('links')
@Controller('initiatives/:initiativeId/links')
export class LinksController {
  constructor(private readonly repo: LinksRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('CREATE', 'InitiativeLink')
  create(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(createLinkSchema)) body: CreateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(initiativeId, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('DELETE', 'InitiativeLink')
  delete(@Param('initiativeId') initiativeId: string, @Param('id') id: string) {
    return this.repo.delete(initiativeId, id);
  }
}
