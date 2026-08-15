import { z } from 'zod';

export const createProductAreaSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  businessLineId: z.string().nullable().default(null),
});
export type CreateProductAreaDto = z.infer<typeof createProductAreaSchema>;
