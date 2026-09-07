import { Module } from '@nestjs/common';
import { OutcomeMetricsController } from './outcome-metrics.controller';
import { OutcomeMetricsRepository } from './outcome-metrics.repository';

@Module({
  controllers: [OutcomeMetricsController],
  providers: [OutcomeMetricsRepository],
})
export class OutcomeMetricsModule {}
