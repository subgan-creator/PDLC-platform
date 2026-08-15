import { Module } from '@nestjs/common';
import { RaidController } from './raid.controller';
import { RaidRepository } from './raid.repository';

@Module({
  controllers: [RaidController],
  providers: [RaidRepository],
})
export class RaidModule {}
