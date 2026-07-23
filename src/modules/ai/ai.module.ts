import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { SentryMcpService } from './services/sentry-mcp.service';
import { GitHubMcpService } from './services/github-mcp.service';
import { AtlassianMcpService } from './services/atlassian-mcp.service';

@Module({
  providers: [
    AiService,
    SentryMcpService,
    GitHubMcpService,
    AtlassianMcpService,
  ],
  exports: [AiService, SentryMcpService, GitHubMcpService, AtlassianMcpService],
})
export class AiModule {}
