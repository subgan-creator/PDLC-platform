import { Module } from '@nestjs/common';
import { SolutionTreeController } from './solution-tree.controller';
import { SolutionTreeRepository } from './solution-tree.repository';

@Module({
  controllers: [SolutionTreeController],
  providers: [SolutionTreeRepository],
  exports: [SolutionTreeRepository],
})
export class SolutionTreeModule {}
