import { z } from 'zod';

export const createOpportunitySchema = z.object({
  title: z.string().min(1).max(200),
  problemFraming: z.string().min(1),
  insightIds: z.array(z.string()).default([]),
});
export type CreateOpportunityDto = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = createOpportunitySchema.partial();
export type UpdateOpportunityDto = z.infer<typeof updateOpportunitySchema>;

export const listOpportunitiesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  /** Filter to opportunities not yet promoted, or already promoted. */
  promoted: z.coerce.boolean().optional(),
});
export type ListOpportunitiesQueryDto = z.infer<typeof listOpportunitiesQuerySchema>;

/**
 * Promotion is deliberately minimal input: title/problemStatement/owner are
 * derived from the opportunity itself server-side (see
 * OpportunitiesRepository.promote). The only thing the caller supplies is
 * who the new initiative's owner should be — defaults to the promoting
 * user if omitted.
 */
export const promoteOpportunitySchema = z.object({
  ownerId: z.string().nullable().default(null),
});
export type PromoteOpportunityDto = z.infer<typeof promoteOpportunitySchema>;
