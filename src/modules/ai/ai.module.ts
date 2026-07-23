import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { SentryMcpService } from './services/sentry-mcp.service';

@Module({
  providers: [AiService, SentryMcpService],
  exports: [AiService, SentryMcpService],
})
export class AiModule {}
