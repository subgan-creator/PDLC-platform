import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsRepository } from './comments.repository';

@Module({
  controllers: [CommentsController],
  providers: [CommentsRepository],
})
export class CommentsModule {}
