import { Injectable, Logger } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

@Injectable()
export class AgentProviderService {
  private readonly logger = new Logger(AgentProviderService.name);

  /**
   * Resolves the configured chat LanguageModel.
   * Prioritizes OpenRouter if OPENROUTER_API_KEY is present,
   * otherwise falls back to direct OpenAI with OPENAI_API_KEY.
   */
  getChatModel(): LanguageModel {
    const provider = process.env.AI_PROVIDER || 'openrouter';
    const modelName =
      process.env.AI_CHAT_MODEL || 'google/gemini-2.5-flash';

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.logger.debug(`Using OpenAI chat model: ${modelName}`);
      return openai.chat(modelName) as unknown as LanguageModel;
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      const openrouter = createOpenRouter({
        apiKey: openrouterKey,
      });
      this.logger.debug(`Using OpenRouter chat model: ${modelName}`);
      return openrouter.chat(modelName) as unknown as LanguageModel;
    }

    // Default fallback: direct OpenAI instance or OpenRouter mock
    const fallbackOpenrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    return fallbackOpenrouter.chat(modelName) as unknown as LanguageModel;
  }
}
