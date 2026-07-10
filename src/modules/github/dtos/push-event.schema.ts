import { z } from 'zod';

const commitSchema = z.object({
  id: z.string(),
  added: z.array(z.string()).default([]),
  modified: z.array(z.string()).default([]),
  removed: z.array(z.string()).default([]),
});

// Only the fields we consume. GitHub truncates commit file lists on huge pushes,
// so this is a first-pass signal; the worker re-derives the authoritative list
// via compareCommits(before, after).
export const pushEventSchema = z
  .object({
    ref: z.string(),
    before: z.string(),
    after: z.string(),
    deleted: z.boolean().optional(),
    repository: z.object({ full_name: z.string() }),
    commits: z.array(commitSchema).default([]),
    head_commit: z.object({ id: z.string() }).nullable().optional(),
  })
  .passthrough();

export type PushEvent = z.infer<typeof pushEventSchema>;
