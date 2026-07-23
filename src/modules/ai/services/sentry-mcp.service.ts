import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import { type ToolSet } from 'ai';

const DEFAULT_SENTRY_MCP_URL = 'https://mcp.sentry.dev/mcp';

const READ_ONLY_TOOLS = new Set([
  'find_organizations',
  'find_projects',
  'search_issues',
  'search_events',
  'get_sentry_resource',
]);

@Injectable()
export class SentryMcpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SentryMcpService.name);
  private readonly sentryMcpUrl: string;
  private readonly sentryAuthToken?: string;
  private client?: MCPClient;
  private tools: ToolSet = {};

  constructor(private readonly config: ConfigService) {
    this.sentryMcpUrl =
      this.config.get<string>('SENTRY_MCP_URL') ?? DEFAULT_SENTRY_MCP_URL;
    this.sentryAuthToken = this.config.get<string>('SENTRY_AUTH_TOKEN');
  }

  async onModuleInit(): Promise<void> {
    this.tools = await this.connectAndDiscover();
  }

  getTools(): ToolSet {
    return this.tools;
  }

  private async connectAndDiscover(): Promise<ToolSet> {
    if (!this.sentryAuthToken) {
      this.logger.warn('SENTRY_AUTH_TOKEN not set, Sentry tools disabled.');
      return {};
    }

    try {
      this.client = await createMCPClient({
        transport: {
          type: 'http',
          url: this.sentryMcpUrl,
          headers: { Authorization: `Sentry-Bearer ${this.sentryAuthToken}` },
        },
      });

      const advertised = await this.client.tools();
      const curated = Object.fromEntries(
        Object.entries(advertised).filter(([name]) => READ_ONLY_TOOLS.has(name)),
      );

      const kept = Object.keys(curated);
      const dropped = Object.keys(advertised).filter((name) => !READ_ONLY_TOOLS.has(name));
      this.logger.log(`Sentry MCP connected. Loaded ${kept.length} tools: ${kept.join(', ')}`);
      this.logger.debug(`Sentry MCP tools dropped: ${dropped.join(', ')}`);

      return curated as ToolSet;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Sentry MCP unavailable, continuing without Sentry tools: ${reason}`);
      return {};
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }
}
