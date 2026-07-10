import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

const BOT_NAME = 'glomopay-contract-drift-bot';
const BOT_EMAIL = 'contract-drift-bot@glomopay.com';

// simple-git working-copy operations. Clones embed the token in the remote URL;
// that URL is NEVER logged. Callers must cleanup() in a finally.
@Injectable()
export class RepoWorkspaceService {
  private readonly logger = new Logger(RepoWorkspaceService.name);

  constructor(private readonly config: ConfigService) {}

  // Shallow single-commit checkout. `ref` may be a branch name or a commit SHA
  // (GitHub allows fetching reachable SHAs), leaving a detached HEAD.
  async clone(
    repoFullName: string,
    token: string,
    ref: string,
  ): Promise<string> {
    const root = this.config.getOrThrow<string>('WORKSPACE_ROOT');
    const dir = join(root, randomUUID());
    await mkdir(dir, { recursive: true });

    const remote = `https://x-access-token:${token}@github.com/${repoFullName}.git`;
    const git = simpleGit(dir);
    await git.init();
    await git.addRemote('origin', remote);
    await git.fetch(['--depth', '1', 'origin', ref]);
    await git.checkout('FETCH_HEAD');

    this.logger.log(`cloned ${repoFullName}@${ref.slice(0, 12)}`);
    return dir;
  }

  // Create the SHA-keyed branch at the checked-out commit, stage the edited
  // files, commit, and push. The origin remote already carries the token.
  async commitAndPush(
    dir: string,
    branch: string,
    editedFiles: string[],
    message: string,
  ): Promise<void> {
    const git = simpleGit(dir);
    await git.addConfig('user.name', BOT_NAME);
    await git.addConfig('user.email', BOT_EMAIL);
    await git.checkoutLocalBranch(branch);
    await git.add(editedFiles);
    await git.commit(message);
    await git.push(['--set-upstream', 'origin', branch]);
    this.logger.log(`pushed ${editedFiles.length} file(s) to ${branch}`);
  }

  async cleanup(dir: string): Promise<void> {
    await rm(dir, { recursive: true, force: true }).catch((err: unknown) =>
      this.logger.warn(
        `cleanup failed for ${dir}: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}
