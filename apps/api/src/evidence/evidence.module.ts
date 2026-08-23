import { Module } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import { EvidenceRepository } from './evidence.repository';

@Module({
  controllers: [EvidenceController],
  providers: [EvidenceRepository],
  exports: [EvidenceRepository],
})
export class EvidenceModule {}
