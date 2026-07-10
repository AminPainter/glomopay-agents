import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { matchesAny } from '../../../shared/utils/glob';
import { GithubService } from '../../github/services/github.service';
import { RepoWorkspaceService } from '../../github/services/repo-workspace.service';
import { ChangedFile } from '../../github/interfaces/github.types';
import { DRIFT_AGENT } from '../interfaces/drift-agent.port';
import type { DriftAgent } from '../interfaces/drift-agent.port';
import { DriftJobData } from '../interfaces/drift-job.interface';
import { contractPathMatchers } from '../utils/contract-paths';
import { buildPrBody, buildPrTitle } from '../utils/pr-body';

const DRIFT_LABEL = 'contract-drift';

export type ProcessResult = {
  status: 'no-contract-files' | 'no-drift' | 'pr-opened' | 'pr-updated';
  prNumber?: number;
  prUrl?: string;
};

@Injectable()
export class DriftProcessorService {
  private readonly logger = new Logger(DriftProcessorService.name);
  private readonly matchers: RegExp[];

  constructor(
    private readonly config: ConfigService,
    private readonly github: GithubService,
    private readonly workspace: RepoWorkspaceService,
    @Inject(DRIFT_AGENT) private readonly agent: DriftAgent,
  ) {
    this.matchers = contractPathMatchers(this.config);
  }

  // Idempotent: SHA-keyed branch + open-PR check ⇒ at most one open PR per SHA.
  async process(job: DriftJobData): Promise<ProcessResult> {
    const backendRepo = this.config.getOrThrow<string>('GITHUB_BACKEND_REPO');
    const frontendRepo = this.config.getOrThrow<string>('GITHUB_FRONTEND_REPO');
    const defaultBranch = this.config.getOrThrow<string>(
      'GITHUB_DEFAULT_BRANCH',
    );
    const token = this.config.getOrThrow<string>('GITHUB_TOKEN');
    const log = `delivery=${job.deliveryId} after=${job.after.slice(0, 12)}`;

    const branch = `contract-drift/${job.after.slice(0, 12)}`;

    // Authoritative gate: re-derive the changed-file list (handles payload truncation).
    const compare = await this.github.compareCommits(
      backendRepo,
      job.before,
      job.after,
    );
    const relevant = compare.files.filter((f) =>
      matchesAny(f.filename, this.matchers),
    );
    if (relevant.length === 0) {
      this.logger.log(
        `${log} no contract files after authoritative compare — skip`,
      );
      return { status: 'no-contract-files' };
    }

    let backendDir: string | undefined;
    let frontendDir: string | undefined;
    try {
      backendDir = await this.workspace.clone(backendRepo, token, job.after);
      frontendDir = await this.workspace.clone(
        frontendRepo,
        token,
        defaultBranch,
      );

      const report = await this.agent.analyze({
        backendDir,
        frontendDir,
        backendDiff: this.buildBackendDiff(relevant),
        changedFiles: relevant.map((f) => f.filename),
        backendSha: job.after,
      });

      if (!report.driftDetected || report.proposedEdits.length === 0) {
        this.logger.log(
          `${log} no actionable drift (${report.summary}) — no PR`,
        );
        return { status: 'no-drift' };
      }

      const existingPr = await this.github.findOpenPrByHead(
        frontendRepo,
        branch,
      );
      const body = buildPrBody({
        backendRepo,
        backendSha: job.after,
        compareUrl: compare.htmlUrl,
        changedBackendFiles: relevant.map((f) => f.filename),
        report,
      });

      if (existingPr) {
        await this.github.updatePrBody(frontendRepo, existingPr, body);
        this.logger.log(`${log} updated existing PR #${existingPr}`);
        return { status: 'pr-updated', prNumber: existingPr };
      }

      const editedFiles = await this.writeEdits(
        frontendDir,
        report.proposedEdits,
      );
      await this.workspace.commitAndPush(
        frontendDir,
        branch,
        editedFiles,
        `contract-drift: re-sync Zod schemas for ${job.after.slice(0, 12)}`,
      );
      const pr = await this.github.openDraftPr({
        repo: frontendRepo,
        head: branch,
        base: defaultBranch,
        title: buildPrTitle(job.after),
        body,
      });
      await this.github.addLabels(frontendRepo, pr.number, [DRIFT_LABEL]);
      this.logger.log(`${log} opened draft PR #${pr.number}`);
      return { status: 'pr-opened', prNumber: pr.number, prUrl: pr.htmlUrl };
    } finally {
      if (backendDir) await this.workspace.cleanup(backendDir);
      if (frontendDir) await this.workspace.cleanup(frontendDir);
    }
  }

  private buildBackendDiff(files: ChangedFile[]): string {
    return files
      .map((f) => {
        const header = `diff --git a/${f.filename} b/${f.filename}\nstatus: ${f.status}`;
        return f.patch
          ? `${header}\n${f.patch}`
          : `${header}\n(no textual patch)`;
      })
      .join('\n\n');
  }

  private async writeEdits(
    frontendDir: string,
    edits: { filePath: string; newContent: string }[],
  ): Promise<string[]> {
    const written: string[] = [];
    for (const edit of edits) {
      const abs = join(frontendDir, edit.filePath);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, edit.newContent, 'utf8');
      written.push(edit.filePath);
    }
    return written;
  }
}
