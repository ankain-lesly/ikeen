import { tool } from 'ai';
import { z } from 'zod';
import {
  defaultNullable,
  ikeenAgentCallOptionsSchema as baseContextSchema,
  optionalNullable,
  toolFailure,
} from '../call-options.js';
import {
  WEB_SEARCH_TIME_RANGES,
  WEB_SEARCH_TOPICS,
  type WebResearchClient,
} from '../web-research.js';

export function createWebTools({
  webResearch,
}: {
  webResearch: WebResearchClient;
}) {
  const webSearch = tool({
    description:
      'Search the live web for current events, latest articles, prices, releases, or documentation. Use topic "news" plus a recent timeRange for headlines. Leave topic as general for docs and other lookups.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .describe('Concise search query for current or external information'),
      topic: defaultNullable(z.enum(WEB_SEARCH_TOPICS), 'general').describe(
        'Search category. Use news for headlines and recent articles, finance for markets, general for docs and other lookups.',
      ),
      timeRange: optionalNullable(z.enum(WEB_SEARCH_TIME_RANGES)).describe(
        'Limit results to sources published or updated within this window. Prefer week or month for recent articles.',
      ),
    }),
    execute: async ({ query, topic, timeRange }) => {
      try {
        return await webResearch.search({ query, topic, timeRange });
      } catch {
        return toolFailure();
      }
    },
  });

  const readWebPage = tool({
    description:
      'Read a specific public https URL and extract the passages that match the user question. Use after webSearch when snippets are too thin, or when the user pasted a URL.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      url: z
        .string()
        .trim()
        .url()
        .describe('Public https URL of the article or documentation page to read'),
      query: z
        .string()
        .trim()
        .min(1)
        .describe('The user question used to keep the most relevant passages'),
    }),
    execute: async ({ url, query }) => {
      try {
        return await webResearch.extract({ url, query });
      } catch {
        return toolFailure();
      }
    },
  });

  return {
    webSearch,
    readWebPage,
  };
}
