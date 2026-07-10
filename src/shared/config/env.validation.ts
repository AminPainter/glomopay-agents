import { z } from 'zod';

export const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_BACKEND_REPO: z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/, 'expected owner/repo'),
  GITHUB_FRONTEND_REPO: z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/, 'expected owner/repo'),
  GITHUB_DEFAULT_BRANCH: z.string().min(1).default('main'),

  REDIS_URL: z.string().min(1),
  DRIFT_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(1),

  WORKSPACE_ROOT: z.string().min(1),
  RAILS_CONTRACT_PATHS: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-opus-4-8'),

  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof envSchema>;

// Passed to ConfigModule.forRoot({ validate }). Fails closed at boot; the error
// names the offending keys only — never their values.
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((i) => i.path.join('.')))];
    throw new Error(
      `Invalid environment configuration. Failing keys: ${keys.join(', ')}`,
    );
  }
  return result.data;
}
