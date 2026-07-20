import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import { type LanguageModel } from 'ai';

// Anthropic (Claude) is the default provider; add others (@ai-sdk/openai, etc.) here.
@Injectable()
export class AiService {
  private readonly anthropic: AnthropicProvider;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    this.anthropic = createAnthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
    this.defaultModel = this.config.get<string>(
      'ANTHROPIC_MODEL',
      'claude-opus-4-8',
    );
  }

  model(modelId?: string): LanguageModel {
    return this.anthropic(modelId ?? this.defaultModel);
  }

  webTools(domain: string) {
    return {
      web_search: this.anthropic.tools.webSearch_20250305({
        maxUses: 5,
        allowedDomains: [domain],
      }),
      web_fetch: this.anthropic.tools.webFetch_20250910({
        maxUses: 5,
        allowedDomains: [domain],
      }),
    };
  }
}
