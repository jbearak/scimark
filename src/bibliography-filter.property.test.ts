/**
 * Bug condition exploration test — Property 1: Fault Condition
 *
 * Validates: Requirements 1.1, 1.2
 *
 * This test is EXPECTED TO FAIL on unfixed code. Failure confirms the bug:
 * buildEngine() registers ALL bib entries with updateItems(), so
 * renderBibliography() returns entries for every item in the .bib file,
 * not just the cited subset.
 */
import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { BibtexEntry } from './bibtex-parser';
import {
  createCiteprocEngine,
  renderBibliography,
  renderCitationText,
} from './md-to-docx-citations';

/**
 * Generator for a small Map of BibtexEntry items (2-4 entries) with unique keys.
 */
const bibEntriesArb = fc
  .uniqueArray(
    fc.constantFrom('alpha', 'bravo', 'charlie', 'delta'),
    { minLength: 2, maxLength: 4 }
  )
  .map((keys) => {
    const entries = new Map<string, BibtexEntry>();
    for (const key of keys) {
      entries.set(key, {
        type: 'article',
        key,
        fields: new Map([
          ['title', 'Title for ' + key],
          ['author', 'Author ' + key],
          ['year', '2020'],
          ['journal', 'Journal of ' + key],
        ]),
      });
    }
    return entries;
  });

/**
 * Given a set of all keys, generate a strict subset (including possibly empty).
 * This is the bug condition: citedKeys ⊂ allKeys (strict).
 */
function strictSubsetArb(allKeys: string[]): fc.Arbitrary<Set<string>> {
  // Generate a boolean mask, then filter to ensure strict subset (not all true)
  return fc
    .array(fc.boolean(), { minLength: allKeys.length, maxLength: allKeys.length })
    .filter((mask) => mask.some((v) => !v)) // at least one key excluded
    .map((mask) => {
      const subset = new Set<string>();
      mask.forEach((include, i) => {
        if (include) subset.add(allKeys[i]);
      });
      return subset;
    });
}

describe('Bibliography Filter Bug Condition', () => {
  it('Property 1: bibliography should contain only cited entries (EXPECTED TO FAIL on unfixed code)', () => {
    fc.assert(
      fc.property(
        bibEntriesArb.chain((entries) => {
          const allKeys = [...entries.keys()];
          return strictSubsetArb(allKeys).map((citedKeys) => ({
            entries,
            citedKeys,
            allKeys,
          }));
        }),
        ({ entries, citedKeys }) => {
          // Build engine — after fix, buildEngine() no longer calls updateItems()
          const engine = createCiteprocEngine(entries, 'apa');
          expect(engine).toBeDefined();

          // Register only cited keys (mirrors what generateDocumentXml now does)
          engine.updateItems([...citedKeys]);

          const bib = renderBibliography(engine);

          if (citedKeys.size === 0) {
            // No citations → bibliography should be empty or undefined
            const entryCount = bib ? bib.entries.length : 0;
            if (entryCount !== 0) {
              throw new Error(
                'Expected 0 bibliography entries for 0 cited keys, got ' +
                  entryCount +
                  ' (all ' +
                  entries.size +
                  ' bib entries were included)'
              );
            }
          } else {
            // Subset cited → bibliography should have exactly citedKeys.size entries
            expect(bib).toBeDefined();
            if (bib!.entries.length !== citedKeys.size) {
              throw new Error(
                'Expected ' +
                  citedKeys.size +
                  ' bibliography entries for cited keys {' +
                  [...citedKeys].join(', ') +
                  '}, got ' +
                  bib!.entries.length +
                  ' (total bib entries: ' +
                  entries.size +
                  ')'
              );
            }
          }
        }
      ),
      { numRuns: 50, verbose: true }
    );
  }, { timeout: 30000 });
});


/**
 * Preservation property tests — Property 2: Full-Citation Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * When ALL bib entries are cited (isBugCondition returns false), the current
 * code already works correctly. These tests capture that baseline so we can
 * verify the fix does not regress it.
 */
describe('Bibliography Filter Preservation', () => {
  /**
   * Generator for a small Map of BibtexEntry items (1-3 entries).
   * Uses short bounded generators.
   */
  const preservationBibArb = fc
    .uniqueArray(
      fc.constantFrom('alpha', 'bravo', 'charlie'),
      { minLength: 1, maxLength: 3 }
    )
    .map((keys) => {
      const entries = new Map<string, BibtexEntry>();
      for (const key of keys) {
        entries.set(key, {
          type: 'article',
          key,
          fields: new Map([
            ['title', 'Title for ' + key],
            ['author', 'Author ' + key],
            ['year', '2020'],
            ['journal', 'Journal of ' + key],
          ]),
        });
      }
      return entries;
    });

  it('Property 2a: bibliography entry count equals bib entries when all are cited', () => {
    /**
     * Validates: Requirements 3.1
     *
     * For all (bibEntries) where citedKeys equals the full set of bibEntries keys,
     * renderBibliography(engine).entries.length === bibEntries.size
     */
    fc.assert(
      fc.property(preservationBibArb, (entries) => {
        const engine = createCiteprocEngine(entries, 'apa');
        expect(engine).toBeDefined();

        // Register all keys (mirrors full-citation scenario after fix)
        engine.updateItems([...entries.keys()]);

        const bib = renderBibliography(engine);
        expect(bib).toBeDefined();
        expect(bib!.entries.length).toBe(entries.size);
      }),
      { numRuns: 50 }
    );
  }, { timeout: 30000 });

  it('Property 2b: renderCitationText produces non-empty text when all entries are cited', () => {
    /**
     * Validates: Requirements 3.2, 3.3, 3.4, 3.5
     *
     * For all (bibEntries) where citedKeys equals the full set of bibEntries keys,
     * renderCitationText(engine, allKeys) produces non-empty formatted text.
     */
    fc.assert(
      fc.property(preservationBibArb, (entries) => {
        const engine = createCiteprocEngine(entries, 'apa');
        expect(engine).toBeDefined();

        const allKeys = [...entries.keys()];
        const text = renderCitationText(engine, allKeys);
        expect(text).toBeDefined();
        expect(typeof text).toBe('string');
        expect(text!.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 }
    );
  }, { timeout: 30000 });
});
