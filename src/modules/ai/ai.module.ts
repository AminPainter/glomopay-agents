import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { SentryMcpService } from './services/sentry-mcp.service';
import { GitHubMcpService } from './services/github-mcp.service';

@Module({
  providers: [AiService, SentryMcpService, GitHubMcpService],
  exports: [AiService, SentryMcpService, GitHubMcpService],
})
export class AiModule {}
