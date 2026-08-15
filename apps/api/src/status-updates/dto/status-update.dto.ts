import { z } from 'zod';

export const createStatusUpdateSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  progress: z.string().min(1),
  next: z.string().default(''),
  risks: z.string().default(''),
  asks: z.string().default(''),
  healthAtTimeOfUpdate: z.enum(['GREEN', 'AMBER', 'RED']),
});
export type CreateStatusUpdateDto = z.infer<typeof createStatusUpdateSchema>;
