import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { EnvService } from '../../config/env.service';

@Injectable()
export class AgentProviderService {
  private readonly logger = new Logger(AgentProviderService.name);

  constructor(private readonly env: EnvService) {}

  /**
   * Resolves the configured chat LanguageModel.
   * Prioritizes OpenRouter if OPENROUTER_API_KEY is present,
   * otherwise falls back to direct OpenAI with OPENAI_API_KEY.
   */
  getChatModel(): LanguageModel {
    const provider = this.env.AI_PROVIDER;
    const modelName = this.env.AI_CHAT_MODEL;

    if (provider === 'openai' && this.env.OPENAI_API_KEY) {
      const openai = createOpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
      this.logger.debug(`Using OpenAI chat model: ${modelName}`);
      return openai.chat(modelName);
    }

    const openrouterKey = this.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      const openrouter = createOpenRouter({
        apiKey: openrouterKey,
      });
      this.logger.debug(`Using OpenRouter chat model: ${modelName}`);
      return openrouter.chat(modelName);
    }

    // Default fallback: direct OpenAI instance or OpenRouter mock
    const fallbackOpenrouter = createOpenRouter({
      apiKey: this.env.OPENROUTER_API_KEY,
    });
    return fallbackOpenrouter.chat(modelName);
  }
}
