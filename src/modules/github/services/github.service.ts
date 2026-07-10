import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Octokit } from '@octokit/rest';
import { GITHUB_CLIENT } from '../github.tokens';
import {
  ChangedFile,
  CompareResult,
  OpenedPr,
  parseRepo,
} from '../interfaces/github.types';

// Octokit (REST API) I/O only. Local git working-copy operations live in
// RepoWorkspaceService.
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(@Inject(GITHUB_CLIENT) private readonly octokit: Octokit) {}

  // Authoritative changed-file list + unified patches between two commits.
  // Handles push-payload truncation — this is the primary signal the agent reasons over.
  async compareCommits(
    repo: string,
    base: string,
    head: string,
  ): Promise<CompareResult> {
    const { owner, repo: name } = parseRepo(repo);
    const res = await this.octokit.rest.repos.compareCommitsWithBasehead({
      owner,
      repo: name,
      basehead: `${base}...${head}`,
    });
    const files: ChangedFile[] = (res.data.files ?? []).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      previousFilename: f.previous_filename,
      patch: f.patch,
    }));
    return {
      files,
      htmlUrl: res.data.html_url,
      commitShas: (res.data.commits ?? []).map((c) => c.sha),
    };
  }

  async findOpenPrByHead(repo: string, branch: string): Promise<number | null> {
    const { owner, repo: name } = parseRepo(repo);
    const res = await this.octokit.rest.pulls.list({
      owner,
      repo: name,
      state: 'open',
      head: `${owner}:${branch}`,
    });
    return res.data[0]?.number ?? null;
  }

  async openDraftPr(opts: {
    repo: string;
    head: string;
    base: string;
    title: string;
    body: string;
  }): Promise<OpenedPr> {
    const { owner, repo: name } = parseRepo(opts.repo);
    const res = await this.octokit.rest.pulls.create({
      owner,
      repo: name,
      head: opts.head,
      base: opts.base,
      title: opts.title,
      body: opts.body,
      draft: true,
    });
    this.logger.log(`opened draft PR #${res.data.number} on ${opts.repo}`);
    return { number: res.data.number, htmlUrl: res.data.html_url };
  }

  async addLabels(
    repo: string,
    prNumber: number,
    labels: string[],
  ): Promise<void> {
    const { owner, repo: name } = parseRepo(repo);
    await this.octokit.rest.issues.addLabels({
      owner,
      repo: name,
      issue_number: prNumber,
      labels,
    });
  }

  async updatePrBody(
    repo: string,
    prNumber: number,
    body: string,
  ): Promise<void> {
    const { owner, repo: name } = parseRepo(repo);
    await this.octokit.rest.pulls.update({
      owner,
      repo: name,
      pull_number: prNumber,
      body,
    });
  }
}
