import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { ActivityRepository } from './activity.repository';

@ApiTags('activity')
@Controller('initiatives/:initiativeId/activity')
export class ActivityController {
  constructor(private readonly repo: ActivityRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  forInitiative(@Param('initiativeId') initiativeId: string) {
    return this.repo.forInitiative(initiativeId);
  }
}
