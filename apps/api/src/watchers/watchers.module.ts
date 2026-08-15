import { Module } from '@nestjs/common';
import { WatchersController } from './watchers.controller';
import { WatchersRepository } from './watchers.repository';

@Module({
  controllers: [WatchersController],
  providers: [WatchersRepository],
})
export class WatchersModule {}
