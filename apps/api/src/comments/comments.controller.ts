import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CommentsRepository } from './comments.repository';
import {
  createCommentSchema,
  updateCommentSchema,
  type CreateCommentDto,
  type UpdateCommentDto,
} from './dto/comment.dto';

@ApiTags('comments')
@Controller('initiatives/:initiativeId/comments')
export class CommentsController {
  constructor(private readonly repo: CommentsRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list(@Param('initiativeId') initiativeId: string) {
    return this.repo.list(initiativeId);
  }

  @Post()
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('CREATE', 'InitiativeComment')
  create(
    @Param('initiativeId') initiativeId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(initiativeId, body, user.userId);
  }

  @Patch(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'InitiativeComment')
  update(
    @Param('initiativeId') initiativeId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(initiativeId, id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('DELETE', 'InitiativeComment')
  delete(
    @Param('initiativeId') initiativeId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.softDelete(initiativeId, id, user.userId);
  }
}
