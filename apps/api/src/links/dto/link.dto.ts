import { z } from 'zod';

export const linkTargetTypeSchema = z.enum([
  'EXTERNAL_URL',
  'STORY',
  'FIGMA_FRAME',
  'CONFLUENCE_PAGE',
  'JIRA_ISSUE',
  'OTHER',
]);

export const createLinkSchema = z
  .object({
    targetType: linkTargetTypeSchema,
    targetId: z.string().nullable().default(null),
    url: z.string().url().nullable().default(null),
    label: z.string().min(1),
  })
  .refine((data) => data.targetType !== 'EXTERNAL_URL' || !!data.url, {
    message: 'url is required when targetType is EXTERNAL_URL',
    path: ['url'],
  });
export type CreateLinkDto = z.infer<typeof createLinkSchema>;
