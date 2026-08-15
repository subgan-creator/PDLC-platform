import { z } from 'zod';

export const raciRoleSchema = z.enum(['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED']);

export const addStakeholderSchema = z.object({
  userId: z.string().min(1),
  raciRole: raciRoleSchema,
});
export type AddStakeholderDto = z.infer<typeof addStakeholderSchema>;
