import { z } from 'zod';

export const initiativePhaseSchema = z.enum(['DISCOVERY', 'DEFINITION', 'BUILD', 'LAUNCH', 'ADOPT', 'DONE']);
export const healthStatusSchema = z.enum(['GREEN', 'AMBER', 'RED']);
export const confidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const tshirtSizeSchema = z.enum(['XS', 'S', 'M', 'L', 'XL']);
export const roadmapBucketSchema = z.enum(['NOW', 'NEXT', 'LATER']);
export const dataClassificationSchema = z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'MNPI', 'GXP']);

const outcomeMetricInputSchema = z.object({
  metricName: z.string().min(1),
  baseline: z.number().nullable().default(null),
  target: z.number(),
  current: z.number().nullable().default(null),
  unit: z.string().min(1),
  source: z.string().default(''),
});

const hypothesisInputSchema = z.object({
  statement: z.string().min(1),
  confidence: confidenceSchema.default('MEDIUM'),
  validated: z.boolean().nullable().default(null),
});

/**
 * `healthReason` required whenever `health !== 'GREEN'` — enforced here at
 * the Zod boundary (CLAUDE.md: "no exceptions" on input validation), not
 * left to the UI to remember.
 */
export const createInitiativeSchema = z
  .object({
    title: z.string().min(1).max(200),
    problemStatement: z.string().min(1),
    phase: initiativePhaseSchema.default('DISCOVERY'),
    health: healthStatusSchema.default('GREEN'),
    healthReason: z.string().min(1).nullable().default(null),
    confidence: confidenceSchema.default('MEDIUM'),
    tshirtSize: tshirtSizeSchema.default('M'),
    scope: z.string().default(''),
    nonScope: z.string().default(''),
    plannedStart: z.string().datetime().nullable().default(null),
    plannedEnd: z.string().datetime().nullable().default(null),
    ownerId: z.string().min(1),
    businessSponsorId: z.string().nullable().default(null),
    contributingTeams: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    productAreaId: z.string().nullable().default(null),
    dataClassification: dataClassificationSchema.default('INTERNAL'),
    outcomeMetrics: z.array(outcomeMetricInputSchema).default([]),
    hypotheses: z.array(hypothesisInputSchema).default([]),
  })
  .refine((data) => data.health === 'GREEN' || !!data.healthReason, {
    message: 'healthReason is required when health is not GREEN',
    path: ['healthReason'],
  });

export type CreateInitiativeDto = z.infer<typeof createInitiativeSchema>;

/**
 * Every field optional (PATCH semantics) except `version`, which is
 * mandatory — the optimistic-concurrency token the client must echo back
 * from the last read. A stale `version` gets a 409, not a silent overwrite.
 */
export const updateInitiativeSchema = z
  .object({
    version: z.number().int().positive(),
    title: z.string().min(1).max(200).optional(),
    problemStatement: z.string().min(1).optional(),
    phase: initiativePhaseSchema.optional(),
    health: healthStatusSchema.optional(),
    healthReason: z.string().min(1).nullable().optional(),
    confidence: confidenceSchema.optional(),
    tshirtSize: tshirtSizeSchema.optional(),
    scope: z.string().optional(),
    nonScope: z.string().optional(),
    plannedStart: z.string().datetime().nullable().optional(),
    plannedEnd: z.string().datetime().nullable().optional(),
    actualStart: z.string().datetime().nullable().optional(),
    actualEnd: z.string().datetime().nullable().optional(),
    ownerId: z.string().min(1).optional(),
    businessSponsorId: z.string().nullable().optional(),
    contributingTeams: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    productAreaId: z.string().nullable().optional(),
    dataClassification: dataClassificationSchema.optional(),
  })
  .refine((data) => !data.health || data.health === 'GREEN' || !!data.healthReason, {
    message: 'healthReason is required when health is not GREEN',
    path: ['healthReason'],
  });

export type UpdateInitiativeDto = z.infer<typeof updateInitiativeSchema>;

export const repositionInitiativeSchema = z.object({
  version: z.number().int().positive(),
  roadmapBucket: roadmapBucketSchema.nullable(),
  roadmapRank: z.number(),
});

export type RepositionInitiativeDto = z.infer<typeof repositionInitiativeSchema>;

export const bulkUpdateInitiativesSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  patch: z.object({
    phase: initiativePhaseSchema.optional(),
    ownerId: z.string().optional(),
    productAreaId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export type BulkUpdateInitiativesDto = z.infer<typeof bulkUpdateInitiativesSchema>;

export const listInitiativesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  phase: z
    .union([initiativePhaseSchema, z.array(initiativePhaseSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  health: z
    .union([healthStatusSchema, z.array(healthStatusSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  productAreaId: z.string().optional(),
  ownerId: z.string().optional(),
  tag: z.string().optional(),
  roadmapBucket: roadmapBucketSchema.optional(),
  includeArchived: z.coerce.boolean().default(false),
  sort: z.enum(['createdAt', 'title', 'plannedEnd', 'health']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export type ListInitiativesQueryDto = z.infer<typeof listInitiativesQuerySchema>;
