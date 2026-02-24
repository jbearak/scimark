import { describe, it, expect } from 'bun:test';
import { renderWithPlugin, SIMPLE_CRITIC_TYPES, buildCriticPattern } from './test-helpers';

// Combined regex for navigation pattern detection
const combinedPattern = /\{\+\+([\s\S]*?)\+\+\}|\{--([\s\S]*?)--\}|\{\~\~([\s\S]*?)\~\~\}|\{>>([\s\S]*?)<<\}|\{==([\s\S]*?)==\}|\~\~([\s\S]*?)\~\~|<!--([\s\S]*?)-->/g;

function findAllPatterns(text: string): Array<{ start: number; end: number; matched: string }> {
  const matches: Array<{ start: number; end: number; matched: string }> = [];
  let match;
  combinedPattern.lastIndex = 0;
  while ((match = combinedPattern.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length, matched: match[0] });
  }
  return matches;
}

// Content variants tested for each CriticMarkup type
const contentVariants = [
  { label: 'empty with newlines', content: '\n\n' },
  { label: 'whitespace only', content: '   \n   ' },
];

// For simple types, also test patterns at various empty-line positions
const emptyLineVariants = [
  { label: 'empty line at start', content: '\ntext after empty line' },
  { label: 'empty line in middle', content: 'first line\n\nthird line' },
  { label: 'empty line at end', content: 'text before empty line\n' },
  { label: 'multiple empty lines', content: 'line 1\n\n\nline 4' },
];

describe('Edge Case Unit Tests', () => {

  describe('Empty/whitespace patterns — regex and rendering', () => {
    for (const type of SIMPLE_CRITIC_TYPES) {
      for (const variant of contentVariants) {
        const input = buildCriticPattern(type, variant.content);

        it(type.name + ' pattern with ' + variant.label + ' is recognized by regex', () => {
          const matches = findAllPatterns(input);
          expect(matches.length).toBe(1);
          expect(matches[0].matched).toBe(input);
        });

        it(type.name + ' pattern with ' + variant.label + ' renders in preview', () => {
          const output = renderWithPlugin(input);
          expect(output).toContain(type.cssClass);
          expect(output).toContain('<' + type.tag);
        });
      }
    }

    // Substitution variants
    for (const variant of contentVariants) {
      const input = '{~~' + variant.content + '~>' + variant.content + '~~}';

      it('substitution pattern with ' + variant.label + ' is recognized by regex', () => {
        const matches = findAllPatterns(input);
        expect(matches.length).toBe(1);
        expect(matches[0].matched).toBe(input);
      });

      it('substitution pattern with ' + variant.label + ' renders in preview', () => {
        const output = renderWithPlugin(input);
        expect(output).toContain('manuscript-markdown-substitution');
        expect(output).toContain('<del');
        expect(output).toContain('<ins');
      });
    }
  });

  describe('Substitutions with multi-line old and new text', () => {
    it('should recognize substitution with multi-line old and new text', () => {
      const input = '{~~old line 1\nold line 2\nold line 3~>new line 1\nnew line 2\nnew line 3~~}';
      const matches = findAllPatterns(input);
      expect(matches.length).toBe(1);
      expect(matches[0].matched).toBe(input);
    });

    it('should render substitution with multi-line old and new text in preview', () => {
      const input = '{~~old line 1\nold line 2\nold line 3~>new line 1\nnew line 2\nnew line 3~~}';
      const output = renderWithPlugin(input);
      expect(output).toContain('manuscript-markdown-substitution');
      expect(output).toContain('manuscript-markdown-deletion');
      expect(output).toContain('manuscript-markdown-addition');
      for (const word of ['old line 1', 'old line 2', 'old line 3', 'new line 1', 'new line 2', 'new line 3']) {
        expect(output).toContain(word);
      }
    });

    it('should handle substitution with different line counts', () => {
      const input = '{~~short~>much\nlonger\nreplacement\ntext~~}';
      const matches = findAllPatterns(input);
      expect(matches.length).toBe(1);
      expect(matches[0].matched).toBe(input);
    });

    it('should render substitution with different line counts in preview', () => {
      const input = '{~~short~>much\nlonger\nreplacement\ntext~~}';
      const output = renderWithPlugin(input);
      expect(output).toContain('manuscript-markdown-substitution');
      for (const word of ['short', 'much', 'longer', 'replacement', 'text']) {
        expect(output).toContain(word);
      }
    });
  });

  describe('Patterns with empty lines at various positions', () => {
    for (const variant of emptyLineVariants) {
      const input = buildCriticPattern(
        SIMPLE_CRITIC_TYPES.find(t => t.name === (variant.label.includes('multiple') ? 'deletion' : 'addition'))!,
        variant.content,
      );

      it(variant.label + ' is recognized by regex', () => {
        const matches = findAllPatterns(input);
        expect(matches.length).toBe(1);
        expect(matches[0].matched).toBe(input);
      });

      it(variant.label + ' renders in preview', () => {
        const output = renderWithPlugin(input);
        const nonEmpty = variant.content.split('\n').filter(l => l.trim().length > 0);
        for (const line of nonEmpty) {
          expect(output).toContain(line.trim());
        }
      });
    }

    // Substitution-specific: empty lines in old, new, and both
    const subVariants = [
      { label: 'empty lines in old text', old: 'old line 1\n\nold line 3', new: 'new text' },
      { label: 'empty lines in new text', old: 'old text', new: 'new line 1\n\nnew line 3' },
      { label: 'empty lines in both', old: 'old 1\n\nold 3', new: 'new 1\n\nnew 3' },
    ];

    for (const sv of subVariants) {
      const input = '{~~' + sv.old + '~>' + sv.new + '~~}';

      it('substitution with ' + sv.label + ' is recognized by regex', () => {
        const matches = findAllPatterns(input);
        expect(matches.length).toBe(1);
        expect(matches[0].matched).toBe(input);
      });

      it('substitution with ' + sv.label + ' renders in preview', () => {
        const output = renderWithPlugin(input);
        expect(output).toContain('manuscript-markdown-substitution');
        const allText = (sv.old + '\n' + sv.new).split('\n').filter(l => l.trim().length > 0);
        for (const line of allText) {
          expect(output).toContain(line.trim());
        }
      });
    }
  });

  describe('Very long patterns (100+ lines)', () => {
    for (const type of SIMPLE_CRITIC_TYPES) {
      const lineCount = type.name === 'addition' ? 120 : type.name === 'deletion' ? 150 : type.name === 'comment' ? 110 : 130;
      const prefix = type.name;
      const lines = Array.from({ length: lineCount }, (_, i) => prefix + ' line ' + (i + 1));
      const text = lines.join('\n');
      const input = buildCriticPattern(type, text);

      it(type.name + ' pattern with ' + lineCount + ' lines is recognized by regex', () => {
        const matches = findAllPatterns(input);
        expect(matches.length).toBe(1);
        expect(matches[0].matched).toBe(input);
      });

      it(type.name + ' pattern with ' + lineCount + ' lines renders in preview', () => {
        const output = renderWithPlugin(input);
        expect(output).toContain(type.cssClass);
        expect(output).toContain(prefix + ' line 1');
        expect(output).toContain(prefix + ' line ' + Math.ceil(lineCount / 2));
        expect(output).toContain(prefix + ' line ' + lineCount);
      });
    }

    // Substitution 100+ lines
    it('substitution pattern with 100+ lines is recognized by regex', () => {
      const oldLines = Array.from({ length: 105 }, (_, i) => 'old line ' + (i + 1));
      const newLines = Array.from({ length: 115 }, (_, i) => 'new line ' + (i + 1));
      const input = '{~~' + oldLines.join('\n') + '~>' + newLines.join('\n') + '~~}';
      const matches = findAllPatterns(input);
      expect(matches.length).toBe(1);
      expect(matches[0].matched).toBe(input);
    });

    it('substitution pattern with 100+ lines renders in preview', () => {
      const oldLines = Array.from({ length: 105 }, (_, i) => 'old line ' + (i + 1));
      const newLines = Array.from({ length: 115 }, (_, i) => 'new line ' + (i + 1));
      const input = '{~~' + oldLines.join('\n') + '~>' + newLines.join('\n') + '~~}';
      const output = renderWithPlugin(input);
      expect(output).toContain('manuscript-markdown-substitution');
      expect(output).toContain('old line 1');
      expect(output).toContain('old line 105');
      expect(output).toContain('new line 1');
      expect(output).toContain('new line 115');
    });
  });
});
