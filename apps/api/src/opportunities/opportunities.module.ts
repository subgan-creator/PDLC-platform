import { Module } from '@nestjs/common';
import { InitiativesModule } from '../initiatives/initiatives.module';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesRepository } from './opportunities.repository';

@Module({
  // Needed for OpportunitiesRepository.promote() to call
  // InitiativesRepository.createWithTx() — see that method's comment.
  imports: [InitiativesModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesRepository],
  exports: [OpportunitiesRepository],
})
export class OpportunitiesModule {}
