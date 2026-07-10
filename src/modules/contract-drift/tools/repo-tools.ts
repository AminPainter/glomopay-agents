import { tool } from 'ai';
import { z } from 'zod';
import { RepoAccess } from '../services/repo-access.service';
import { ZodEditVerdict } from './verify-zod-edit';

const MAX_DIFF_CHARS = 60_000;

interface ReadParams {
  path: string;
  maxLines?: number;
}
interface GrepParams {
  pattern: string;
  glob?: string;
  maxMatches?: number;
}
interface VerifyParams {
  filePath: string;
  newContent: string;
}

export interface DriftToolDeps {
  backend: RepoAccess;
  frontend: RepoAccess;
  backendDiff: string;
  verify: (filePath: string, newContent: string) => Promise<ZodEditVerdict>;
}

async function listFrontendSchemas(frontend: RepoAccess): Promise<string[]> {
  const byImport = await frontend.grep(`from ['"]zod['"]`, { maxMatches: 100 });
  const byName = await frontend.listFiles('**/*schema*.ts');
  const set = new Set<string>([
    ...byImport.matches.map((m) => m.file),
    ...byName,
  ]);
  return [...set].slice(0, 100);
}

// AI SDK tool set for the drift agent. Every read goes through the RepoAccess
// egress/redaction filter; the diff is truncated to bound cost.
export function buildDriftTools(deps: DriftToolDeps) {
  return {
    get_backend_diff: tool({
      description:
        'Return the authoritative unified diff of the backend push (changed Rails files). Start here.',
      inputSchema: z.object({}),
      execute: () => ({
        diff: deps.backendDiff.slice(0, MAX_DIFF_CHARS),
        truncated: deps.backendDiff.length > MAX_DIFF_CHARS,
      }),
    }),
    read_backend_file: tool({
      description:
        'Read a backend (Rails) file by repo-relative path. Use to inspect serializers, jbuilder views, controllers, routes, models.',
      inputSchema: z.object({
        path: z.string(),
        maxLines: z.number().int().positive().optional(),
      }),
      execute: ({ path, maxLines }: ReadParams) =>
        deps.backend.readFile(path, maxLines),
    }),
    grep_backend: tool({
      description:
        'Regex search the backend repo. Use to trace routes, controller actions, and serializer usage.',
      inputSchema: z.object({
        pattern: z.string(),
        glob: z.string().optional(),
        maxMatches: z.number().int().positive().optional(),
      }),
      execute: ({ pattern, glob, maxMatches }: GrepParams) =>
        deps.backend.grep(pattern, { glob, maxMatches }),
    }),
    read_frontend_file: tool({
      description: 'Read a frontend (checkout) file by repo-relative path.',
      inputSchema: z.object({
        path: z.string(),
        maxLines: z.number().int().positive().optional(),
      }),
      execute: ({ path, maxLines }: ReadParams) =>
        deps.frontend.readFile(path, maxLines),
    }),
    grep_frontend: tool({
      description:
        'Regex search the frontend repo. Use to find endpoint URL strings, .parse() call sites, and Zod schema definitions.',
      inputSchema: z.object({
        pattern: z.string(),
        glob: z.string().optional(),
        maxMatches: z.number().int().positive().optional(),
      }),
      execute: ({ pattern, glob, maxMatches }: GrepParams) =>
        deps.frontend.grep(pattern, { glob, maxMatches }),
    }),
    list_frontend_schemas: tool({
      description:
        'List candidate frontend files that define Zod schemas (import zod or are named *schema*).',
      inputSchema: z.object({}),
      execute: async () => ({
        files: await listFrontendSchemas(deps.frontend),
      }),
    }),
    validate_zod_schema: tool({
      description:
        'Type-check a proposed full-file edit against the checkout tsconfig (tsc --noEmit). Returns {valid, errors}. Use to self-correct before finalizing.',
      inputSchema: z.object({
        filePath: z.string(),
        newContent: z.string(),
      }),
      execute: ({ filePath, newContent }: VerifyParams) =>
        deps.verify(filePath, newContent),
    }),
  };
}

export type DriftTools = ReturnType<typeof buildDriftTools>;
