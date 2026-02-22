import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { parseInlineArray, normalizeFontStyle } from './frontmatter';

// Feature: header-font-config, Property 1: Inline array parsing equivalence
describe('Property 1: Inline array parsing equivalence', () => {
  it('bracketed and bare comma-separated produce identical results', () => {
    const safeStr = fc.string({ minLength: 1, maxLength: 12 })
      .filter(s => s.trim().length > 0 && !s.includes(',') && !s.includes('[') && !s.includes(']') && /^[a-zA-Z0-9 ]+$/.test(s));
    fc.assert(fc.property(
      fc.array(safeStr, { minLength: 1, maxLength: 6 }),
      (arr) => {
        const trimmed = arr.map(s => s.trim());
        const bracketed = '[' + trimmed.join(', ') + ']';
        const bare = trimmed.join(', ');
        const fromBracketed = parseInlineArray(bracketed);
        const fromBare = parseInlineArray(bare);
        expect(fromBracketed).toEqual(trimmed);
        expect(fromBare).toEqual(trimmed);
      }
    ), { numRuns: 150 });
  });

  it('single value without commas returns one-element array', () => {
    const safeStr = fc.string({ minLength: 1, maxLength: 15 })
      .filter(s => s.trim().length > 0 && !s.includes(',') && /^[a-z ]+$/.test(s));
    fc.assert(fc.property(safeStr, (val) => {
      expect(parseInlineArray(val)).toEqual([val.trim()]);
    }), { numRuns: 100 });
  });
});

// Feature: header-font-config, Property 2: Font style normalization is canonical and idempotent
describe('Property 2: Font style normalization is canonical and idempotent', () => {
  const ALL_PARTS = ['bold', 'italic', 'underline'];

  it('normalizes any permutation to canonical order and is idempotent', () => {
    fc.assert(fc.property(
      fc.subarray(ALL_PARTS, { minLength: 1, maxLength: 3 }),
      fc.shuffledSubarray(ALL_PARTS, { minLength: 0, maxLength: 0 }), // dummy to get shuffling
      (subset) => {
        // Generate all permutations of subset
        const permute = (a: string[]): string[][] => {
          if (a.length <= 1) return [a];
          const result: string[][] = [];
          for (let i = 0; i < a.length; i++) {
            const rest = [...a.slice(0, i), ...a.slice(i + 1)];
            for (const p of permute(rest)) result.push([a[i], ...p]);
          }
          return result;
        };
        const canonical = [...subset].sort((a, b) =>
          ALL_PARTS.indexOf(a) - ALL_PARTS.indexOf(b)
        ).join('-');
        for (const perm of permute(subset)) {
          const input = perm.join('-');
          const result = normalizeFontStyle(input);
          expect(result).toBe(canonical);
          // Idempotence
          expect(normalizeFontStyle(result!)).toBe(canonical);
        }
      }
    ), { numRuns: 100 });
  });

  it('normalizes "normal" to "normal"', () => {
    expect(normalizeFontStyle('normal')).toBe('normal');
    expect(normalizeFontStyle('Normal')).toBe('normal');
    expect(normalizeFontStyle('NORMAL')).toBe('normal');
  });
});

// Feature: header-font-config, Property 3: Invalid font styles are rejected
describe('Property 3: Invalid font styles are rejected', () => {
  it('rejects duplicate parts', () => {
    const part = fc.constantFrom('bold', 'italic', 'underline');
    fc.assert(fc.property(part, (p) => {
      expect(normalizeFontStyle(p + '-' + p)).toBeUndefined();
    }), { numRuns: 50 });
  });

  it('rejects unrecognized parts', () => {
    const badParts = ['heavy', 'light', 'strikethrough', 'bolder', 'oblique', 'none', 'auto', ''];
    for (const bad of badParts) {
      expect(normalizeFontStyle(bad)).toBeUndefined();
      expect(normalizeFontStyle('bold-' + bad)).toBeUndefined();
    }
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(normalizeFontStyle('')).toBeUndefined();
    expect(normalizeFontStyle('  ')).toBeUndefined();
  });
});