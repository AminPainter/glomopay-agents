import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { globToRegExp, matchesAny } from '../../../shared/utils/glob';
import { redactSecrets } from '../../../shared/utils/redact';

// Hard egress deny list — never send these to the model. Backend secret/config
// files plus spec/seed fixtures (which may carry customer-like data).
const DENY_GLOBS = [
  '**/.env',
  '**/.env.*',
  '**/config/master.key',
  '**/credentials.yml.enc',
  '**/config/credentials/*.yml.enc',
  '**/secrets*',
  '**/*secret*',
  '**/spec/**',
  '**/*_spec.rb',
  '**/test/**',
  '**/*.spec.ts',
  '**/*.test.ts',
  'db/seeds.rb',
  '**/db/seeds/**',
  '**/fixtures/**',
  '**/__fixtures__/**',
];
const DENY_PATTERNS = DENY_GLOBS.map(globToRegExp);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tmp', 'log', 'coverage']);

const DEFAULT_MAX_LINES = 400;
const HARD_MAX_MATCHES = 100;
const MAX_WALK_FILES = 5000;

export interface ReadBudget {
  reads: number;
  readonly maxReads: number;
}

export function makeReadBudget(maxReads = 25): ReadBudget {
  return { reads: 0, maxReads };
}

export interface FileResult {
  content?: string;
  error?: string;
  truncated?: boolean;
}

export interface GrepMatch {
  file: string;
  line: number;
  text: string;
}

// Bound to one clone directory. All returned bytes pass through the egress
// deny filter and secret redaction.
export class RepoAccess {
  constructor(
    readonly label: string,
    private readonly root: string,
    private readonly budget: ReadBudget,
  ) {}

  isDenied(relPath: string): boolean {
    return matchesAny(relPath, DENY_PATTERNS);
  }

  private safeResolve(relPath: string): string | null {
    const abs = resolve(this.root, relPath);
    const rootWithSep = this.root.endsWith(sep) ? this.root : this.root + sep;
    if (abs !== this.root && !abs.startsWith(rootWithSep)) return null;
    return abs;
  }

  async readFile(
    relPath: string,
    maxLines = DEFAULT_MAX_LINES,
  ): Promise<FileResult> {
    if (this.isDenied(relPath))
      return { error: `denied: ${relPath} is not readable` };
    if (this.budget.reads >= this.budget.maxReads) {
      return { error: 'read budget exhausted' };
    }
    const abs = this.safeResolve(relPath);
    if (!abs) return { error: 'denied: path escapes repo root' };

    this.budget.reads++;
    try {
      const raw = await readFile(abs, 'utf8');
      const lines = raw.split('\n');
      const truncated = lines.length > maxLines;
      const body = (truncated ? lines.slice(0, maxLines) : lines).join('\n');
      return { content: redactSecrets(body), truncated };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'read failed' };
    }
  }

  async grep(
    pattern: string,
    opts: { glob?: string; maxMatches?: number } = {},
  ): Promise<{ matches: GrepMatch[]; error?: string; capped?: boolean }> {
    let re: RegExp;
    try {
      re = new RegExp(pattern);
    } catch {
      return { matches: [], error: 'invalid regex' };
    }
    const limit = Math.min(
      opts.maxMatches ?? HARD_MAX_MATCHES,
      HARD_MAX_MATCHES,
    );
    const globRe = opts.glob ? globToRegExp(opts.glob) : null;
    const matches: GrepMatch[] = [];
    let capped = false;

    for await (const rel of this.walk()) {
      if (this.isDenied(rel)) continue;
      if (globRe && !globRe.test(rel)) continue;
      const abs = join(this.root, rel);
      let raw: string;
      try {
        raw = await readFile(abs, 'utf8');
      } catch {
        continue;
      }
      const lines = raw.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          matches.push({
            file: rel,
            line: i + 1,
            text: redactSecrets(lines[i].slice(0, 300)),
          });
          if (matches.length >= limit) {
            capped = true;
            return { matches, capped };
          }
        }
      }
    }
    return { matches, capped };
  }

  async listFiles(glob?: string): Promise<string[]> {
    const globRe = glob ? globToRegExp(glob) : null;
    const out: string[] = [];
    for await (const rel of this.walk()) {
      if (this.isDenied(rel)) continue;
      if (globRe && !globRe.test(rel)) continue;
      out.push(rel);
    }
    return out;
  }

  private async *walk(): AsyncGenerator<string> {
    let visited = 0;
    const stack: string[] = [this.root];
    while (stack.length) {
      const dir = stack.pop()!;
      let entries: import('node:fs').Dirent[];
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const abs = join(dir, e.name);
        if (e.isDirectory()) {
          if (SKIP_DIRS.has(e.name)) continue;
          stack.push(abs);
        } else if (e.isFile()) {
          if (++visited > MAX_WALK_FILES) return;
          yield relative(this.root, abs);
        }
      }
    }
  }

  async exists(relPath: string): Promise<boolean> {
    const abs = this.safeResolve(relPath);
    if (!abs) return false;
    try {
      await stat(abs);
      return true;
    } catch {
      return false;
    }
  }
}
