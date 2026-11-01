import { describe, expect, it } from 'vitest';
import {
  parseBlockMarkdown,
  parseListMarkdown,
} from './block-markdown.parser.js';

describe('block-markdown.parser', () => {
  it('parses text blocks correctly', () => {
    const result = parseBlockMarkdown({
      type: 'text',
      markdown: '## Heading\nSome markdown paragraph.',
    });
    expect(result.type).toBe('text');
    expect(result.content).toBe('## Heading\nSome markdown paragraph.');
  });

  it('parses checkbox lists with mixed checked and unchecked items', () => {
    const markdown = `
### Weekend Tasks:
- [ ] Buy groceries
- [x] Mow the lawn
- [ ] Call parents
`;
    const result = parseListMarkdown(markdown);
    expect(result.listType).toBe('checkbox');
    expect(result.header).toBe('Weekend Tasks');
    expect(result.content).toHaveLength(3);
    expect(result.content[0].content).toBe('Buy groceries');
    expect(result.content[0].checked).toBe(false);
    expect(result.content[1].content).toBe('Mow the lawn');
    expect(result.content[1].checked).toBe(true);
    expect(result.content[2].content).toBe('Call parents');
    expect(result.content[2].checked).toBe(false);
  });

  it('parses bullet lists', () => {
    const markdown = `
- Item A
* Item B
• Item C
`;
    const result = parseListMarkdown(markdown);
    expect(result.listType).toBe('bullet');
    expect(result.content).toHaveLength(3);
    expect(result.content[0].content).toBe('Item A');
    expect(result.content[1].content).toBe('Item B');
    expect(result.content[2].content).toBe('Item C');
  });

  it('parses ordered lists', () => {
    const markdown = `
1. First step
2. Second step
3. Third step
`;
    const result = parseListMarkdown(markdown);
    expect(result.listType).toBe('ordered');
    expect(result.content).toHaveLength(3);
    expect(result.content[0].content).toBe('First step');
    expect(result.content[1].content).toBe('Second step');
  });

  it('parses list blocks and auto-extracts trailing footers', () => {
    const markdown = `
### Ingredients
- [ ] 2 cups flour
- [ ] 1 cup milk
> 💡 Chef Tip: Let the milk reach room temperature before whisking.
`;
    const result = parseListMarkdown(markdown);
    expect(result.header).toBe('Ingredients');
    expect(result.content).toHaveLength(2);
    expect(result.footer).toBe(
      '> 💡 Chef Tip: Let the milk reach room temperature before whisking.',
    );
  });

  it('handles explicit footer passed to parseBlockMarkdown', () => {
    const result = parseBlockMarkdown({
      type: 'list',
      header: 'Prep Steps',
      footer: '*Note: Cooking time may vary by oven.*',
      markdown: `
1. Preheat oven to 375°F
2. Line baking sheet with parchment paper
`,
    });
    expect(result.type).toBe('list');
    expect(result.header).toBe('Prep Steps');
    expect(result.footer).toBe('*Note: Cooking time may vary by oven.*');
    expect((result.content as Record<string, unknown>).footer).toBe(
      '*Note: Cooking time may vary by oven.*',
    );
  });
});
