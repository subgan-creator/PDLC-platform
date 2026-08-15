import { z } from 'zod';

export const milestoneStatusSchema = z.enum(['PLANNED', 'DONE', 'MISSED']);

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime(),
  status: milestoneStatusSchema.default('PLANNED'),
  description: z.string().nullable().default(null),
});
export type CreateMilestoneDto = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = createMilestoneSchema.partial();
export type UpdateMilestoneDto = z.infer<typeof updateMilestoneSchema>;
