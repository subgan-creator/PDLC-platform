import { z } from 'zod';

export const solutionTreeNodeTypeSchema = z.enum(['OUTCOME', 'OPPORTUNITY', 'SOLUTION', 'EXPERIMENT']);

export const createSolutionTreeNodeSchema = z.object({
  parentNodeId: z.string().nullable().default(null),
  nodeType: solutionTreeNodeTypeSchema,
  label: z.string().min(1).max(200),
});
export type CreateSolutionTreeNodeDto = z.infer<typeof createSolutionTreeNodeSchema>;

export const updateSolutionTreeNodeSchema = createSolutionTreeNodeSchema.partial();
export type UpdateSolutionTreeNodeDto = z.infer<typeof updateSolutionTreeNodeSchema>;
