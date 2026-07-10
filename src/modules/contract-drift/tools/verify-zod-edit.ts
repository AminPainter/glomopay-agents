import { exec } from 'node:child_process';
import { access, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const pexec = promisify(exec);
const TSC_TIMEOUT_MS = 120_000;

export interface ZodEditVerdict {
  valid: boolean;
  errors: string[];
  // true when tsc could not run (e.g. clone has no node_modules) — treated as
  // not-validated by the caller, never as a pass.
  skipped?: boolean;
  reason?: string;
}

// Writes the candidate content into the frontend clone, runs the checkout's own
// tsc --noEmit, then restores the working tree. Non-LLM ground truth for whether
// an edit compiles.
export async function verifyZodEdit(
  frontendDir: string,
  filePath: string,
  newContent: string,
): Promise<ZodEditVerdict> {
  const root = resolve(frontendDir);
  const abs = resolve(root, filePath);
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (!abs.startsWith(rootWithSep)) {
    return { valid: false, errors: ['path escapes repo root'] };
  }

  const localTsc = join(root, 'node_modules', '.bin', 'tsc');
  try {
    await access(localTsc);
  } catch {
    return {
      valid: false,
      skipped: true,
      reason: 'tsc unavailable (clone has no node_modules)',
      errors: [],
    };
  }

  let original: string | null = null;
  try {
    original = await readFile(abs, 'utf8');
  } catch {
    original = null; // file does not yet exist (a create)
  }

  try {
    await writeFile(abs, newContent, 'utf8');
    const tsconfig = join(root, 'tsconfig.json');
    await pexec(`"${localTsc}" --noEmit -p "${tsconfig}"`, {
      cwd: root,
      timeout: TSC_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { valid: true, errors: [] };
  } catch (err) {
    const out = err as { stdout?: string; stderr?: string };
    const combined = `${out.stdout ?? ''}${out.stderr ?? ''}`;
    const errors = combined
      .split('\n')
      .filter((l) => /error TS\d+/.test(l))
      .slice(0, 50);
    return { valid: false, errors: errors.length ? errors : ['tsc failed'] };
  } finally {
    if (original !== null) {
      await writeFile(abs, original, 'utf8').catch(() => undefined);
    } else {
      await unlink(abs).catch(() => undefined);
    }
  }
}
