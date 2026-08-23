import { z } from 'zod';

export const createEvidenceItemSchema = z.object({
  capturedAt: z.string().datetime(),
  capturedBy: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});
export type CreateEvidenceItemDto = z.infer<typeof createEvidenceItemSchema>;

export const updateEvidenceItemSchema = createEvidenceItemSchema.partial();
export type UpdateEvidenceItemDto = z.infer<typeof updateEvidenceItemSchema>;
