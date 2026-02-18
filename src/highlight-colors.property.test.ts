import { describe, test, expect } from 'bun:test';
import fc from 'fast-check';
import {
  extractHighlightRanges,
  extractCommentRanges,
  extractAdditionRanges,
  extractDeletionRanges,
  extractCriticDelimiterRanges,
  extractSubstitutionNewRanges,
  extractAllDecorationRanges,
  VALID_COLOR_IDS,
} from './highlight-colors';

describe('Property 3: Single-Pass Decoration Extraction Equivalence', () => {
  const criticPatternGen = fc.oneof(
    fc.string({ maxLength: 30 }).map(s => `{++${s.replace(/\+\+\}/g, '')}++}`),
    fc.string({ maxLength: 30 }).map(s => `{--${s.replace(/--\}/g, '')}--}`),
    fc.string({ maxLength: 30 }).map(s => `{==${s.replace(/==\}/g, '')}==}`),
    fc.string({ maxLength: 30 }).map(s => `{>>${s.replace(/<<\}/g, '')}<<}`),
    fc.tuple(fc.string({ maxLength: 15 }), fc.string({ maxLength: 15 })).map(
      ([a, b]) => `{~~${a.replace(/~>/g, '').replace(/~~\}/g, '')}~>${b.replace(/~~\}/g, '')}~~}`
    ),
    fc.string({ maxLength: 30 }).map(s => `==${s.replace(/==/g, '')}==`),
    fc.tuple(
      fc.string({ maxLength: 20 }).map(s => s.replace(/==/g, '')),
      fc.constantFrom(...VALID_COLOR_IDS)
    ).map(([s, c]) => `==${s}=={${c}}`),
  );

  const textGen = fc.array(
    fc.oneof(criticPatternGen, fc.string({ maxLength: 50 })),
    { minLength: 1, maxLength: 10 }
  ).map(parts => parts.join(' '));

  const colorGen = fc.constantFrom(...VALID_COLOR_IDS, 'invalid-color');

  test('extractAllDecorationRanges matches individual functions', () => {
    fc.assert(
      fc.property(textGen, colorGen, (text, defaultColor) => {
        const all = extractAllDecorationRanges(text, defaultColor);
        const expectedHighlights = extractHighlightRanges(text, defaultColor);
        const expectedComments = extractCommentRanges(text);
        const expectedAdditions = extractAdditionRanges(text);
        const expectedDeletions = extractDeletionRanges(text);
        const expectedDelimiters = extractCriticDelimiterRanges(text);
        const expectedSubNew = extractSubstitutionNewRanges(text);

        // Compare highlights map
        expect([...all.highlights.entries()].sort((a, b) => a[0].localeCompare(b[0])))
          .toEqual([...expectedHighlights.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        expect(all.comments).toEqual(expectedComments);
        expect(all.additions).toEqual(expectedAdditions);
        expect(all.deletions).toEqual(expectedDeletions);
        expect(all.delimiters).toEqual(expectedDelimiters);
        expect(all.substitutionNew).toEqual(expectedSubNew);
      }),
      { numRuns: 200 }
    );
  });
});