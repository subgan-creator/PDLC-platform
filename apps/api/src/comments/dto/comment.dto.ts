import { z } from 'zod';

export const createCommentSchema = z.object({
  parentCommentId: z.string().nullable().default(null),
  body: z.string().min(1),
  mentionedUserIds: z.array(z.string()).default([]),
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  body: z.string().min(1),
  mentionedUserIds: z.array(z.string()).default([]),
});
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
