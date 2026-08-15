import { Module } from '@nestjs/common';
import { ProductAreasController } from './product-areas.controller';
import { ProductAreasRepository } from './product-areas.repository';

@Module({
  controllers: [ProductAreasController],
  providers: [ProductAreasRepository],
})
export class ProductAreasModule {}
