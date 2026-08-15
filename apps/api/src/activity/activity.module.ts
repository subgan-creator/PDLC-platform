import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityRepository } from './activity.repository';

@Module({
  controllers: [ActivityController],
  providers: [ActivityRepository],
})
export class ActivityModule {}
