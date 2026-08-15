import { Module } from '@nestjs/common';
import { StakeholdersController } from './stakeholders.controller';
import { StakeholdersRepository } from './stakeholders.repository';

@Module({
  controllers: [StakeholdersController],
  providers: [StakeholdersRepository],
})
export class StakeholdersModule {}
