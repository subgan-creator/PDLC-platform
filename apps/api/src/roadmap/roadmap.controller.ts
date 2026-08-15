import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RoadmapRepository } from './roadmap.repository';
import { roadmapQuerySchema, type RoadmapQueryDto } from './dto/roadmap.dto';

@ApiTags('roadmap')
@Controller('roadmap')
export class RoadmapController {
  constructor(private readonly repo: RoadmapRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  @ApiOperation({
    summary: 'Now/Next/Later + timeline data, optionally grouped by area or team',
  })
  list(@Query(new ZodValidationPipe(roadmapQuerySchema)) query: RoadmapQueryDto) {
    return this.repo.list(query);
  }
}
