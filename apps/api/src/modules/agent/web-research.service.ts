import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../../config/env.service.js';
import { toolFailure } from './call-options.js';
import {
  mapTavilyExtractResult,
  mapTavilySearchResults,
  parsePublicHttpsUrl,
  type TavilyExtractResponse,
  type TavilySearchResponse,
  type WebPageInput,
  type WebPageSuccess,
  type WebResearchClient,
  type WebResearchFailure,
  type WebSearchInput,
  type WebSearchSuccess,
} from './web-research.js';

const TAVILY_API_BASE = 'https://api.tavily.com';

@Injectable()
export class WebResearchService implements WebResearchClient {
  private readonly logger = new Logger(WebResearchService.name);

  constructor(private readonly env: EnvService) {
    if (this.isEnabled()) {
      this.logger.log('Tavily web research enabled');
    } else {
      this.logger.warn(
        'TAVILY_API_KEY is not configured. Web search and page reads will be omitted.',
      );
    }
  }

  isEnabled(): boolean {
    return Boolean(this.env.TAVILY_API_KEY);
  }

  async search(
    input: WebSearchInput,
  ): Promise<WebSearchSuccess | WebResearchFailure> {
    if (!this.isEnabled()) {
      return toolFailure();
    }

    try {
      const payload = await this.post<TavilySearchResponse>('/search', {
        query: input.query,
        search_depth: 'basic',
        chunks_per_source: 1,
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
        include_published_date: true,
        topic: input.topic ?? 'general',
        ...(input.timeRange ? { time_range: input.timeRange } : {}),
      });

      return mapTavilySearchResults(input.query, payload);
    } catch (error) {
      this.logger.warn(
        `Tavily search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return toolFailure();
    }
  }

  async extract(
    input: WebPageInput,
  ): Promise<WebPageSuccess | WebResearchFailure> {
    if (!this.isEnabled()) {
      return toolFailure();
    }

    const parsed = parsePublicHttpsUrl(input.url);
    if (!parsed.ok) {
      return toolFailure();
    }

    try {
      const payload = await this.post<TavilyExtractResponse>('/extract', {
        urls: parsed.href,
        query: input.query,
        chunks_per_source: 5,
        extract_depth: 'basic',
        format: 'markdown',
        timeout: 10,
      });

      return mapTavilyExtractResult(parsed.href, payload);
    } catch (error) {
      this.logger.warn(
        `Tavily extract failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return toolFailure();
    }
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${TAVILY_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.TAVILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Tavily ${path} failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
