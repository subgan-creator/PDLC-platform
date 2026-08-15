import { z } from 'zod';

export const roadmapQuerySchema = z.object({
  groupBy: z.enum(['none', 'area', 'team']).default('none'),
  phase: z.string().optional(),
  health: z.string().optional(),
  productAreaId: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
});
export type RoadmapQueryDto = z.infer<typeof roadmapQuerySchema>;
