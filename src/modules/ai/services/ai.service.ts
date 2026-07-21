import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import { type LanguageModel } from 'ai';
import { createWebSearchTool } from '../tools/web-search.tool';
import { createWebFetchTool } from '../tools/web-fetch.tool';

@Injectable()
export class AiService {
  private readonly anthropic: AnthropicProvider;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    this.anthropic = createAnthropic({
      apiKey: this.config.getOrThrow<string>('AI_GATEWAY_API_KEY'),
      baseURL: this.config.getOrThrow<string>('AI_GATEWAY_BASE_URL'),
    });
    this.defaultModel = this.config.getOrThrow<string>('AI_GATEWAY_MODEL');
  }

  model(modelId?: string): LanguageModel {
    return this.anthropic(modelId ?? this.defaultModel);
  }

  webTools() {
    const searxngBaseUrl = this.config.getOrThrow<string>('SEARXNG_BASE_URL');
    return {
      webSearch: createWebSearchTool(searxngBaseUrl),
      webFetch: createWebFetchTool(),
    };
  }
}
