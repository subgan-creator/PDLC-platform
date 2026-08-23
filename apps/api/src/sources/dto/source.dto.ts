import { z } from 'zod';

export const sourceTypeSchema = z.enum([
  'INTERVIEW',
  'SUPPORT_TICKET',
  'SURVEY',
  'COMPETITIVE',
  'DATA_FINDING',
  'SALES_CALL',
  'OTHER',
]);

export const createSourceSchema = z.object({
  type: sourceTypeSchema,
  name: z.string().min(1).max(200),
  connectorInstanceId: z.string().nullable().default(null),
  externalRef: z.string().nullable().default(null),
});
export type CreateSourceDto = z.infer<typeof createSourceSchema>;

export const updateSourceSchema = createSourceSchema.partial();
export type UpdateSourceDto = z.infer<typeof updateSourceSchema>;
