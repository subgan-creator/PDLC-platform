import { z } from 'zod';

/**
 * Mirrors the inline `outcomeMetricInputSchema` in
 * `initiatives/dto/initiative.dto.ts` (outcome metrics could previously only
 * be set at initiative-creation time). This is the same shape, exposed as
 * its own create/update pair so metrics can be added to an initiative that
 * already exists — the gap a real user hit: the Outcomes tab had a table
 * and an empty-state message, but no way to actually add a row.
 */
export const createOutcomeMetricSchema = z.object({
  metricName: z.string().min(1),
  baseline: z.number().nullable().default(null),
  target: z.number(),
  current: z.number().nullable().default(null),
  unit: z.string().min(1),
  source: z.string().default(''),
});
export type CreateOutcomeMetricDto = z.infer<typeof createOutcomeMetricSchema>;

export const updateOutcomeMetricSchema = createOutcomeMetricSchema.partial();
export type UpdateOutcomeMetricDto = z.infer<typeof updateOutcomeMetricSchema>;
