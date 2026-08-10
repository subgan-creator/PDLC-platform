import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UsersRepository } from './users.repository';
import { listUsersQuerySchema, type ListUsersQueryDto } from './dto/list-users.dto';

/**
 * Reference endpoint set demonstrating every non-negotiable rule from
 * CLAUDE.md on one small, real surface: Zod input, OpenAPI docs, a
 * permission guard, an audit log on the sensitive read, and a tenant-scoped
 * repository underneath. Later phases' controllers copy this shape.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

  @Get()
  @RequirePermission('user', 'READ')
  @ApiOperation({ summary: "List users in the caller's tenant" })
  @ApiOkResponse({ description: 'A page of users.' })
  async list(@Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQueryDto) {
    return this.usersRepository.list(query);
  }

  @Get('me')
  @RequirePermission('user', 'READ')
  @ApiOperation({ summary: "Get the caller's own user record" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersRepository.findById(user.userId);
  }

  @Get(':id')
  @RequirePermission('user', 'READ')
  @AuditLog('READ_SENSITIVE', 'User')
  @ApiOperation({ summary: 'Get a user by id (audit-logged: PII read)' })
  async findOne(@Param('id') id: string) {
    return this.usersRepository.findById(id);
  }
}
