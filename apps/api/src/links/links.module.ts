import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksRepository } from './links.repository';

@Module({
  controllers: [LinksController],
  providers: [LinksRepository],
})
export class LinksModule {}
