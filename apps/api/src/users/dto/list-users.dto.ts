import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  primaryPersona: z.string(),
  active: z.boolean(),
});

export type UserResponseDto = z.infer<typeof userResponseSchema>;
