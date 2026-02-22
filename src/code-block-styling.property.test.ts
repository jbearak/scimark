import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { parseFrontmatter, serializeFrontmatter, type Frontmatter } from './frontmatter';

describe('Code Block Styling Property Tests', () => {
  const hexColorArb = fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'), { minLength: 6, maxLength: 6 }).map(arr => arr.join(''));
  const codeBackgroundColorArb = fc.oneof(hexColorArb, fc.constant('none'), fc.constant('transparent'));
  const positiveIntArb = fc.integer({ min: 1, max: 200 });

  it('Property 4: Frontmatter round-trip preservation', () => {
    fc.assert(fc.property(
      codeBackgroundColorArb,
      hexColorArb,
      positiveIntArb,
      (codeBackgroundColor, codeFontColor, codeBlockInset) => {
        const original: Frontmatter = {
          codeBackgroundColor,
          codeFontColor,
          codeBlockInset
        };

        const serialized = serializeFrontmatter(original);
        const { metadata: parsed } = parseFrontmatter(serialized + '\nsome body text');

        expect(parsed.codeBackgroundColor).toBe(original.codeBackgroundColor);
        expect(parsed.codeFontColor).toBe(original.codeFontColor);
        expect(parsed.codeBlockInset).toBe(original.codeBlockInset);
      }
    ), { numRuns: 100 });
  });

  it('Property 5: Invalid frontmatter values are ignored', () => {
    const invalidBackgroundArb = fc.string({ minLength: 1, maxLength: 10 })
      .filter(s => !/^[0-9A-Fa-f]{6}$/.test(s) && s !== 'none' && s !== 'transparent' && !s.includes(':') && !s.includes('\n'));
    const invalidColorArb = fc.string({ minLength: 1, maxLength: 10 })
      .filter(s => !/^[0-9A-Fa-f]{6}$/.test(s) && !s.includes(':') && !s.includes('\n'));
    const invalidInsetArb = fc.oneof(
      fc.integer({ max: 0 }).map(String),
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => !/^\d+$/.test(s) && !s.includes(':') && !s.includes('\n'))
    );

    fc.assert(fc.property(
      invalidBackgroundArb,
      invalidColorArb,
      invalidInsetArb,
      (invalidBackground, invalidColor, invalidInset) => {
        const yaml = `---\ncode-background-color: ${invalidBackground}\ncode-font-color: ${invalidColor}\ncode-block-inset: ${invalidInset}\n---\n`;
        const { metadata } = parseFrontmatter(yaml);

        expect(metadata.codeBackgroundColor).toBeUndefined();
        expect(metadata.codeFontColor).toBeUndefined();
        expect(metadata.codeBlockInset).toBeUndefined();
      }
    ), { numRuns: 100 });
  });

  it('Property 11: Alias round-trip normalization', () => {
    fc.assert(fc.property(
      hexColorArb,
      hexColorArb,
      (backgroundHex, colorHex) => {
        const yaml = `---\ncode-background: ${backgroundHex}\ncode-color: ${colorHex}\n---\n`;
        const { metadata } = parseFrontmatter(yaml);
        const serialized = serializeFrontmatter(metadata);

        expect(serialized).toContain('code-background-color:');
        expect(serialized).toContain('code-font-color:');
        expect(serialized).not.toMatch(/code-background:\s/);
        expect(serialized).not.toMatch(/code-color:\s/);
      }
    ), { numRuns: 100 });
  });
});