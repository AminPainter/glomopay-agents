import { Module } from '@nestjs/common';
import { githubClientProvider } from './providers/github-client.provider';
import { GithubService } from './services/github.service';
import { RepoWorkspaceService } from './services/repo-workspace.service';

@Module({
  providers: [githubClientProvider, GithubService, RepoWorkspaceService],
  exports: [GithubService, RepoWorkspaceService],
})
export class GithubModule {}
