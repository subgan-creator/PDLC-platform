import { Module } from '@nestjs/common';
import { StatusUpdatesController } from './status-updates.controller';
import { StatusUpdatesRepository } from './status-updates.repository';

@Module({
  controllers: [StatusUpdatesController],
  providers: [StatusUpdatesRepository],
})
export class StatusUpdatesModule {}
