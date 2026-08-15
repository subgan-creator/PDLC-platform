import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProductAreasRepository } from './product-areas.repository';
import { createProductAreaSchema, type CreateProductAreaDto } from './dto/product-area.dto';

@ApiTags('product-areas')
@Controller('product-areas')
export class ProductAreasController {
  constructor(private readonly repo: ProductAreasRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  list() {
    return this.repo.list();
  }

  @Post()
  @RequirePermission('initiative', 'CREATE')
  @AuditLog('CREATE', 'ProductArea')
  create(@Body(new ZodValidationPipe(createProductAreaSchema)) body: CreateProductAreaDto) {
    return this.repo.create(body);
  }
}
