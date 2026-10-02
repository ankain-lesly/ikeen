import { toolFailure } from './call-options.js';

export const SEARCH_RESULT_MAX = 5;
export const SEARCH_SNIPPET_MAX = 500;
export const PAGE_CONTENT_MAX = 6000;

export const WEB_SEARCH_TOPICS = ['general', 'news', 'finance'] as const;
export const WEB_SEARCH_TIME_RANGES = ['day', 'week', 'month', 'year'] as const;

export type WebSearchTopic = (typeof WEB_SEARCH_TOPICS)[number];
export type WebSearchTimeRange = (typeof WEB_SEARCH_TIME_RANGES)[number];

export type WebSearchHit = {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
};

export type WebSearchSuccess = {
  ok: true;
  query: string;
  results: WebSearchHit[];
};

export type WebPageSuccess = {
  ok: true;
  url: string;
  title: string;
  content: string;
  truncated: boolean;
};

export type WebSearchInput = {
  query: string;
  topic?: WebSearchTopic;
  timeRange?: WebSearchTimeRange;
};

export type WebPageInput = {
  url: string;
  query: string;
};

export type WebResearchFailure = ReturnType<typeof toolFailure>;

export type WebResearchClient = {
  isEnabled(): boolean;
  search(input: WebSearchInput): Promise<WebSearchSuccess | WebResearchFailure>;
  extract(input: WebPageInput): Promise<WebPageSuccess | WebResearchFailure>;
};

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
]);

export type TavilySearchResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    published_date?: string | null;
  }>;
};

export type TavilyExtractResponse = {
  results?: Array<{
    url?: string;
    raw_content?: string;
    title?: string;
  }>;
  failed_results?: Array<{
    url?: string;
    error?: string;
  }>;
};

export function parsePublicHttpsUrl(
  raw: string,
): { ok: true; href: string } | { ok: false } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false };
  }

  if (parsed.username || parsed.password) {
    return { ok: false };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || isBlockedHost(hostname)) {
    return { ok: false };
  }

  return { ok: true, href: parsed.href };
}

export function mapTavilySearchResults(
  query: string,
  payload: TavilySearchResponse,
): WebSearchSuccess {
  const results: WebSearchHit[] = [];

  for (const item of payload.results ?? []) {
    if (results.length >= SEARCH_RESULT_MAX) {
      break;
    }

    const url = item.url ? parsePublicHttpsUrl(item.url) : { ok: false as const };
    if (!url.ok) {
      continue;
    }

    const title = (item.title ?? '').trim() || url.href;
    const snippet = clipText(item.content ?? '', SEARCH_SNIPPET_MAX);
    const publishedAt = item.published_date?.trim() || null;

    results.push({
      title,
      url: url.href,
      snippet,
      publishedAt,
    });
  }

  return { ok: true, query, results };
}

export function mapTavilyExtractResult(
  requestedUrl: string,
  payload: TavilyExtractResponse,
): WebPageSuccess | WebResearchFailure {
  const requested = parsePublicHttpsUrl(requestedUrl);
  if (!requested.ok) {
    return toolFailure();
  }

  const failed = (payload.failed_results ?? []).some(
    (item) => item.url && urlsMatch(item.url, requested.href),
  );
  if (failed) {
    return toolFailure();
  }

  const match =
    (payload.results ?? []).find(
      (item) => item.url && urlsMatch(item.url, requested.href),
    ) ?? payload.results?.[0];

  const raw = match?.raw_content?.trim() ?? '';
  if (!raw) {
    return toolFailure();
  }

  const { text: content, truncated } = clipWithFlag(raw, PAGE_CONTENT_MAX);
  const title =
    (match?.title ?? '').trim() || titleFromContent(requested.href, content);

  return {
    ok: true,
    url: requested.href,
    title,
    content,
    truncated,
  };
}

function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname)) {
    return true;
  }

  if (
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return true;
  }

  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    return true;
  }

  return false;
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}

function isPrivateIPv6(host: string): boolean {
  if (!host.includes(':')) {
    return false;
  }

  const normalized = host.toLowerCase();
  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) {
    return isPrivateIPv4(mapped[1]);
  }

  const firstHextet = Number.parseInt(normalized.split(':', 1)[0] || '0', 16);
  if (Number.isNaN(firstHextet)) {
    return true;
  }

  // fe80::/10 link-local, fc00::/7 unique local
  if ((firstHextet & 0xffc0) === 0xfe80 || (firstHextet & 0xfe00) === 0xfc00) {
    return true;
  }

  return false;
}

function urlsMatch(left: string, right: string): boolean {
  const a = parsePublicHttpsUrl(left);
  const b = parsePublicHttpsUrl(right);
  if (!a.ok || !b.ok) {
    return left.trim() === right.trim();
  }
  return a.href === b.href;
}

function clipText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function clipWithFlag(value: string, max: number): { text: string; truncated: boolean } {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return { text: trimmed, truncated: false };
  }
  return { text: `${trimmed.slice(0, max).trimEnd()}…`, truncated: true };
}

function titleFromContent(url: string, content: string): string {
  const heading = content.match(/^#{1,3}\s+(.+)$/m);
  if (heading?.[1]) {
    return heading[1].trim().slice(0, 200);
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
