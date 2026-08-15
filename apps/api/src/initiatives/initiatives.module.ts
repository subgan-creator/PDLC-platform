import { Module } from '@nestjs/common';
import { InitiativesController } from './initiatives.controller';
import { InitiativesRepository } from './initiatives.repository';

@Module({
  controllers: [InitiativesController],
  providers: [InitiativesRepository],
  exports: [InitiativesRepository],
})
export class InitiativesModule {}
