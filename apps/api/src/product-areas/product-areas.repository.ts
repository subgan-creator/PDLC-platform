import { Injectable } from '@nestjs/common';
import type { ProductArea } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import type { CreateProductAreaDto } from './dto/product-area.dto';

/**
 * The portfolio parent hook (Prompt 1, "nullable — hook for the Area PO
 * persona"). Deliberately minimal: list + create, no update/delete yet —
 * there's nothing downstream that needs to react to a product area
 * changing shape until Phase 11 (persona expansion) actually builds on it.
 */
@Injectable()
export class ProductAreasRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  list(): Promise<ProductArea[]> {
    return this.withTx((tx) => tx.productArea.findMany({ where: { tenantId: this.tenantId }, orderBy: { name: 'asc' } }));
  }

  create(input: CreateProductAreaDto): Promise<ProductArea> {
    return this.withTx((tx) => tx.productArea.create({ data: { tenantId: this.tenantId, ...input } }));
  }
}
