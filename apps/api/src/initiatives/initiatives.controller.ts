import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { AuditLog } from '../audit/audit-log.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { toCsv } from '../common/util/csv';
import { InitiativesRepository } from './initiatives.repository';
import {
  bulkUpdateInitiativesSchema,
  createInitiativeSchema,
  listInitiativesQuerySchema,
  repositionInitiativeSchema,
  updateInitiativeSchema,
  type BulkUpdateInitiativesDto,
  type CreateInitiativeDto,
  type ListInitiativesQueryDto,
  type RepositionInitiativeDto,
  type UpdateInitiativeDto,
} from './dto/initiative.dto';

const archiveBodySchema = z.object({ version: z.number().int().positive() });

@ApiTags('initiatives')
@Controller('initiatives')
export class InitiativesController {
  constructor(private readonly repo: InitiativesRepository) {}

  @Get()
  @RequirePermission('initiative', 'READ')
  @ApiOperation({
    summary: 'List initiatives — cursor-paginated, filterable, stays responsive at 2k+ rows',
  })
  list(@Query(new ZodValidationPipe(listInitiativesQuerySchema)) query: ListInitiativesQueryDto) {
    return this.repo.list(query);
  }

  @Get('export')
  @RequirePermission('initiative', 'EXPORT')
  @AuditLog('EXPORT', 'Initiative')
  @ApiOperation({ summary: 'Export the current filtered list as CSV' })
  async export(
    @Query(new ZodValidationPipe(listInitiativesQuerySchema)) query: ListInitiativesQueryDto,
    @Res() res: Response,
  ) {
    const rows = await this.repo.exportRows(query);
    const csv = toCsv(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        phase: r.phase,
        health: r.health,
        confidence: r.confidence,
        tshirtSize: r.tshirtSize,
        ownerId: r.ownerId,
        productAreaId: r.productAreaId,
        plannedStart: r.plannedStart?.toISOString() ?? null,
        plannedEnd: r.plannedEnd?.toISOString() ?? null,
      })),
      [
        'id',
        'title',
        'slug',
        'phase',
        'health',
        'confidence',
        'tshirtSize',
        'ownerId',
        'productAreaId',
        'plannedStart',
        'plannedEnd',
      ],
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="initiatives.csv"');
    res.send(csv);
  }

  @Post()
  @RequirePermission('initiative', 'CREATE')
  @AuditLog('CREATE', 'Initiative')
  @ApiOperation({ summary: 'Create an initiative' })
  create(
    @Body(new ZodValidationPipe(createInitiativeSchema)) body: CreateInitiativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.create(body, user.userId);
  }

  @Post('bulk')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'Initiative')
  @ApiOperation({ summary: 'Bulk-edit phase/owner/area/tags across selected initiatives' })
  bulkUpdate(
    @Body(new ZodValidationPipe(bulkUpdateInitiativesSchema)) body: BulkUpdateInitiativesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.bulkUpdate(body, user.userId);
  }

  @Get(':id')
  @RequirePermission('initiative', 'READ')
  @ApiOperation({ summary: 'Get an initiative with its outcomes and hypotheses' })
  async findOne(@Param('id') id: string) {
    const initiative = await this.repo.findById(id);
    if (!initiative) throw new NotFoundException(`Initiative ${id} not found`);
    return initiative;
  }

  @Patch(':id')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'Initiative')
  @ApiOperation({
    summary: 'Inline-edit an initiative (optimistic concurrency via `version`; 409 on stale write)',
  })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInitiativeSchema)) body: UpdateInitiativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.update(id, body, user.userId);
  }

  @Post(':id/reposition')
  @RequirePermission('initiative', 'UPDATE')
  @AuditLog('UPDATE', 'Initiative')
  @ApiOperation({ summary: 'Move an initiative on the roadmap (drag-to-reprioritize)' })
  reposition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(repositionInitiativeSchema)) body: RepositionInitiativeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.reposition(id, body, user.userId);
  }

  @Delete(':id')
  @RequirePermission('initiative', 'DELETE')
  @AuditLog('DELETE', 'Initiative')
  @ApiOperation({ summary: 'Archive an initiative (soft delete)' })
  archive(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(archiveBodySchema)) body: { version: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repo.archive(id, body.version, user.userId);
  }

  @Get(':id/versions')
  @RequirePermission('initiative', 'READ')
  @ApiOperation({ summary: 'Full version history for the diff viewer' })
  versions(@Param('id') id: string) {
    return this.repo.listVersions(id);
  }

  @Get(':id/versions/:version/diff')
  @RequirePermission('initiative', 'READ')
  @ApiOperation({ summary: 'Field-level diff of a version against its predecessor' })
  versionDiff(@Param('id') id: string, @Param('version') version: string) {
    return this.repo.getVersionDiff(id, Number(version));
  }
}
