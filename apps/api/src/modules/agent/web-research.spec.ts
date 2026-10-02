import { toolFailure } from './call-options.js';
import {
  PAGE_CONTENT_MAX,
  SEARCH_SNIPPET_MAX,
  mapTavilyExtractResult,
  mapTavilySearchResults,
  parsePublicHttpsUrl,
} from './web-research.js';

describe('parsePublicHttpsUrl', () => {
  it('accepts a normal https URL', () => {
    const parsed = parsePublicHttpsUrl('https://docs.tavily.com/docs/search');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.href).toBe('https://docs.tavily.com/docs/search');
    }
  });

  it('rejects non-https URLs', () => {
    expect(parsePublicHttpsUrl('http://example.com').ok).toBe(false);
    expect(parsePublicHttpsUrl('ftp://example.com/file').ok).toBe(false);
  });

  it('rejects URLs with embedded credentials', () => {
    expect(parsePublicHttpsUrl('https://user:pass@example.com').ok).toBe(false);
  });

  it('rejects localhost, private, link-local, and cloud-metadata hosts', () => {
    expect(parsePublicHttpsUrl('https://localhost/path').ok).toBe(false);
    expect(parsePublicHttpsUrl('https://127.0.0.1/').ok).toBe(false);
    expect(parsePublicHttpsUrl('https://10.0.0.8/admin').ok).toBe(false);
    expect(parsePublicHttpsUrl('https://192.168.1.1/').ok).toBe(false);
    expect(parsePublicHttpsUrl('https://172.16.4.1/').ok).toBe(false);
    expect(parsePublicHttpsUrl('https://169.254.169.254/latest/meta-data').ok).toBe(
      false,
    );
    expect(parsePublicHttpsUrl('https://metadata.google.internal/').ok).toBe(
      false,
    );
    expect(parsePublicHttpsUrl('https://[::1]/').ok).toBe(false);
  });
});

describe('mapTavilySearchResults', () => {
  it('keeps at most five public hits and trims over-long snippets', () => {
    const mapped = mapTavilySearchResults('latest gemini docs', {
      results: [
        {
          title: 'Gemini docs',
          url: 'https://ai.google.dev/gemini',
          content: 'A'.repeat(SEARCH_SNIPPET_MAX + 80),
          published_date: 'Tue, 11 Mar 2025 17:00:00 GMT',
        },
        {
          title: 'Private',
          url: 'http://intranet.local/docs',
          content: 'should drop',
        },
        ...Array.from({ length: 6 }, (_, index) => ({
          title: `Hit ${index}`,
          url: `https://example.com/article-${index}`,
          content: 'snippet',
        })),
      ],
    });

    expect(mapped.ok).toBe(true);
    expect(mapped.query).toBe('latest gemini docs');
    expect(mapped.results).toHaveLength(5);
    expect(mapped.results[0]?.snippet.endsWith('…')).toBe(true);
    expect(mapped.results[0]?.snippet.length).toBeLessThanOrEqual(
      SEARCH_SNIPPET_MAX + 1,
    );
    expect(mapped.results[0]?.publishedAt).toBe('Tue, 11 Mar 2025 17:00:00 GMT');
    expect(mapped.results.some((hit) => hit.url.includes('intranet'))).toBe(
      false,
    );
  });
});

describe('mapTavilyExtractResult', () => {
  it('trims over-long page text and flags truncation', () => {
    const mapped = mapTavilyExtractResult('https://example.com/article', {
      results: [
        {
          url: 'https://example.com/article',
          title: 'Example article',
          raw_content: 'B'.repeat(PAGE_CONTENT_MAX + 200),
        },
      ],
    });

    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.title).toBe('Example article');
      expect(mapped.truncated).toBe(true);
      expect(mapped.content.endsWith('…')).toBe(true);
      expect(mapped.content.length).toBeLessThanOrEqual(PAGE_CONTENT_MAX + 1);
    }
  });

  it('surfaces a failed extract as ok: false', () => {
    const mapped = mapTavilyExtractResult('https://example.com/missing', {
      results: [],
      failed_results: [
        {
          url: 'https://example.com/missing',
          error: 'Failed to retrieve content',
        },
      ],
    });

    expect(mapped).toEqual(toolFailure());
  });
});
