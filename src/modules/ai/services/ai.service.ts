import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import {
  generateText,
  streamText,
  Output,
  stepCountIs,
  type ModelMessage,
  type LanguageModel,
  type ToolSet,
} from 'ai';
import { z } from 'zod';

export interface RunAgentOptions<TOOLS extends ToolSet, OUT> {
  system: string;
  prompt?: string;
  messages?: ModelMessage[];
  tools: TOOLS;
  output: z.ZodType<OUT>;
  maxSteps?: number;
  activeTools?: (keyof TOOLS & string)[];
  modelId?: string;
  abortSignal?: AbortSignal;
}

export interface RunAgentResult<OUT> {
  output: OUT;
  steps: number;
  usage: { inputTokens: number; outputTokens: number };
  toolCalls: { name: string; input: unknown }[];
}

// Anthropic (Claude) is the default provider; add others (@ai-sdk/openai, etc.) here.
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
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

  async generate(prompt: string, modelId?: string): Promise<string> {
    const { text } = await generateText({
      model: this.model(modelId),
      prompt,
    });
    return text;
  }

  stream(
    messages: ModelMessage[],
    modelId?: string,
  ): ReturnType<typeof streamText> {
    return streamText({
      model: this.model(modelId),
      messages,
      onError: ({ error }) => this.logger.error('streamText error', error),
    });
  }

  // Bounded tool-loop with a validated structured output. Used by the drift agent.
  async runAgent<TOOLS extends ToolSet, OUT>(
    opts: RunAgentOptions<TOOLS, OUT>,
  ): Promise<RunAgentResult<OUT>> {
    const promptOrMessages = opts.messages
      ? { messages: opts.messages }
      : { prompt: opts.prompt ?? '' };

    const result = await generateText({
      model: this.model(opts.modelId),
      system: opts.system,
      tools: opts.tools,
      activeTools: opts.activeTools,
      stopWhen: stepCountIs(opts.maxSteps ?? 12),
      output: Output.object({ schema: opts.output }),
      abortSignal: opts.abortSignal,
      ...promptOrMessages,
    });

    const toolCalls = result.steps.flatMap((s) =>
      s.toolCalls.map((tc) => ({ name: tc.toolName, input: tc.input })),
    );

    return {
      output: result.output,
      steps: result.steps.length,
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      },
      toolCalls,
    };
  }
}
