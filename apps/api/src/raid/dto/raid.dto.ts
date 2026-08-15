import { z } from 'zod';

export const raidTypeSchema = z.enum(['RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY']);
export const raidSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const raidStatusSchema = z.enum(['OPEN', 'MITIGATED', 'CLOSED']);

export const createRaidItemSchema = z.object({
  type: raidTypeSchema,
  description: z.string().min(1),
  severity: raidSeveritySchema,
  ownerId: z.string().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  mitigation: z.string().nullable().default(null),
  status: raidStatusSchema.default('OPEN'),
});
export type CreateRaidItemDto = z.infer<typeof createRaidItemSchema>;

export const updateRaidItemSchema = createRaidItemSchema.partial();
export type UpdateRaidItemDto = z.infer<typeof updateRaidItemSchema>;
