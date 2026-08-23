import { z } from 'zod';

export const confidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createInsightSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1),
  evidenceItemIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  confidence: confidenceSchema.default('MEDIUM'),
});
export type CreateInsightDto = z.infer<typeof createInsightSchema>;

export const updateInsightSchema = createInsightSchema.partial();
export type UpdateInsightDto = z.infer<typeof updateInsightSchema>;

export const listInsightsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
});
export type ListInsightsQueryDto = z.infer<typeof listInsightsQuerySchema>;
