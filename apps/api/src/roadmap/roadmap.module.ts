import { Module } from '@nestjs/common';
import { RoadmapController } from './roadmap.controller';
import { RoadmapRepository } from './roadmap.repository';

@Module({
  controllers: [RoadmapController],
  providers: [RoadmapRepository],
})
export class RoadmapModule {}
