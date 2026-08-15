import { Module } from '@nestjs/common';
import { MilestonesController } from './milestones.controller';
import { MilestonesRepository } from './milestones.repository';

@Module({
  controllers: [MilestonesController],
  providers: [MilestonesRepository],
})
export class MilestonesModule {}
