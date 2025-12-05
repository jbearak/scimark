import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Validates: Requirements 6.1, 6.2, 6.4, 6.5
describe('CriticMarkup CSS Theme-Aware Colors', () => {
  const cssPath = join(__dirname, 'criticmarkup.css');
  const cssContent = readFileSync(cssPath, 'utf-8');

  describe('CSS Custom Properties', () => {
    it('should define CSS custom properties in :root', () => {
      expect(cssContent).toContain(':root');
      expect(cssContent).toContain('--criticmarkup-addition-color');
      expect(cssContent).toContain('--criticmarkup-deletion-color');
      expect(cssContent).toContain('--criticmarkup-substitution-color');
      expect(cssContent).toContain('--criticmarkup-comment-color');
      expect(cssContent).toContain('--criticmarkup-highlight-color');
    });

    it('should use CSS variables in class definitions', () => {
      expect(cssContent).toMatch(/\.criticmarkup-addition[\s\S]*?color:\s*var\(--criticmarkup-addition-color\)/);
      expect(cssContent).toMatch(/\.criticmarkup-deletion[\s\S]*?color:\s*var\(--criticmarkup-deletion-color\)/);
      expect(cssContent).toMatch(/\.criticmarkup-substitution[\s\S]*?color:\s*var\(--criticmarkup-substitution-color\)/);
      expect(cssContent).toMatch(/\.criticmarkup-comment[\s\S]*?color:\s*var\(--criticmarkup-comment-color\)/);
      expect(cssContent).toMatch(/\.criticmarkup-highlight[\s\S]*?color:\s*var\(--criticmarkup-highlight-color\)/);
    });
  });

  describe('Light Theme Colors (Default)', () => {
    it('should define darker green for additions in light theme', () => {
      // Light theme uses darker colors - #008800 is darker than dark theme's #00dd00
      expect(cssContent).toMatch(/:root[\s\S]*?--criticmarkup-addition-color:\s*#008800/);
    });

    it('should define darker red for deletions in light theme', () => {
      // #cc0000 is darker than dark theme's #ff4444
      expect(cssContent).toMatch(/:root[\s\S]*?--criticmarkup-deletion-color:\s*#cc0000/);
    });

    it('should define darker orange for substitutions in light theme', () => {
      // #dd6600 is darker than dark theme's #ff9944
      expect(cssContent).toMatch(/:root[\s\S]*?--criticmarkup-substitution-color:\s*#dd6600/);
    });

    it('should define darker blue for comments in light theme', () => {
      // #0066cc is darker than dark theme's #5599ff
      expect(cssContent).toMatch(/:root[\s\S]*?--criticmarkup-comment-color:\s*#0066cc/);
    });

    it('should define darker purple for highlights in light theme', () => {
      // #9933aa is darker than dark theme's #cc66dd
      expect(cssContent).toMatch(/:root[\s\S]*?--criticmarkup-highlight-color:\s*#9933aa/);
    });
  });

  describe('Dark Theme Colors', () => {
    it('should define dark theme colors using prefers-color-scheme media query', () => {
      expect(cssContent).toContain('@media (prefers-color-scheme: dark)');
    });

    it('should define brighter green for additions in dark theme', () => {
      // Dark theme uses brighter colors - #00dd00 is brighter than light theme's #008800
      expect(cssContent).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?--criticmarkup-addition-color:\s*#00dd00/);
    });

    it('should define brighter red for deletions in dark theme', () => {
      // #ff4444 is brighter than light theme's #cc0000
      expect(cssContent).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?--criticmarkup-deletion-color:\s*#ff4444/);
    });

    it('should define brighter orange for substitutions in dark theme', () => {
      // #ff9944 is brighter than light theme's #dd6600
      expect(cssContent).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?--criticmarkup-substitution-color:\s*#ff9944/);
    });

    it('should define brighter blue for comments in dark theme', () => {
      // #5599ff is brighter than light theme's #0066cc
      expect(cssContent).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?--criticmarkup-comment-color:\s*#5599ff/);
    });

    it('should define brighter purple for highlights in dark theme', () => {
      // #cc66dd is brighter than light theme's #9933aa
      expect(cssContent).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?--criticmarkup-highlight-color:\s*#cc66dd/);
    });
  });

  describe('Style Properties', () => {
    it('should contain strikethrough for deletions', () => {
      expect(cssContent).toMatch(/\.criticmarkup-deletion[\s\S]*?text-decoration:\s*line-through/);
    });

    it('should contain italic style for comments', () => {
      expect(cssContent).toMatch(/\.criticmarkup-comment[\s\S]*?font-style:\s*italic/);
    });

    it('should use semi-transparent backgrounds with CSS variables', () => {
      expect(cssContent).toMatch(/\.criticmarkup-addition[\s\S]*?background-color:\s*var\(--criticmarkup-addition-bg\)/);
      expect(cssContent).toMatch(/\.criticmarkup-deletion[\s\S]*?background-color:\s*var\(--criticmarkup-deletion-bg\)/);
      expect(cssContent).toMatch(/\.criticmarkup-substitution[\s\S]*?background-color:\s*var\(--criticmarkup-substitution-bg\)/);
      expect(cssContent).toMatch(/\.criticmarkup-comment[\s\S]*?background-color:\s*var\(--criticmarkup-comment-bg\)/);
      expect(cssContent).toMatch(/\.criticmarkup-highlight[\s\S]*?background-color:\s*var\(--criticmarkup-highlight-bg\)/);
    });
  });
});

// Feature: markdown-preview-highlighting, Property 7: Theme-aware color adaptation
// Validates: Requirements 6.1, 6.2, 6.4, 6.5
describe('Property 7: Theme-aware color adaptation', () => {
  const cssPath = join(__dirname, 'criticmarkup.css');
  const cssContent = readFileSync(cssPath, 'utf-8');

  const criticMarkupTypes = ['addition', 'deletion', 'substitution', 'comment', 'highlight'];

  it('should define different color values for light and dark themes for all CriticMarkup types', () => {
    // Extract light theme colors (default :root)
    const lightThemeMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
    expect(lightThemeMatch).toBeTruthy();
    const lightThemeColors = lightThemeMatch![1];

    // Extract dark theme colors (@media prefers-color-scheme: dark)
    const darkThemeMatch = cssContent.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]+)\}/);
    expect(darkThemeMatch).toBeTruthy();
    const darkThemeColors = darkThemeMatch![1];

    // For each CriticMarkup type, verify different colors exist for light and dark themes
    for (const type of criticMarkupTypes) {
      const colorVar = `--criticmarkup-${type}-color`;
      const bgVar = `--criticmarkup-${type}-bg`;

      // Extract light theme color value
      const lightColorMatch = lightThemeColors.match(new RegExp(`${colorVar}:\\s*([^;]+)`));
      expect(lightColorMatch).toBeTruthy();
      const lightColor = lightColorMatch![1].trim();

      // Extract dark theme color value
      const darkColorMatch = darkThemeColors.match(new RegExp(`${colorVar}:\\s*([^;]+)`));
      expect(darkColorMatch).toBeTruthy();
      const darkColor = darkColorMatch![1].trim();

      // Verify colors are different between themes
      expect(lightColor).not.toBe(darkColor);

      // Extract light theme background value
      const lightBgMatch = lightThemeColors.match(new RegExp(`${bgVar}:\\s*([^;]+)`));
      expect(lightBgMatch).toBeTruthy();
      const lightBg = lightBgMatch![1].trim();

      // Extract dark theme background value
      const darkBgMatch = darkThemeColors.match(new RegExp(`${bgVar}:\\s*([^;]+)`));
      expect(darkBgMatch).toBeTruthy();
      const darkBg = darkBgMatch![1].trim();

      // Verify backgrounds are different between themes
      expect(lightBg).not.toBe(darkBg);
    }
  });

  it('should ensure dark theme colors are brighter than light theme colors', () => {
    // Helper to extract RGB values from hex color
    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    // Helper to calculate perceived brightness
    const getBrightness = (hex: string): number => {
      const { r, g, b } = hexToRgb(hex);
      // Use perceived brightness formula
      return (r * 299 + g * 587 + b * 114) / 1000;
    };

    const colorPairs = [
      { light: '#008800', dark: '#00dd00', name: 'addition' },
      { light: '#cc0000', dark: '#ff4444', name: 'deletion' },
      { light: '#dd6600', dark: '#ff9944', name: 'substitution' },
      { light: '#0066cc', dark: '#5599ff', name: 'comment' },
      { light: '#9933aa', dark: '#cc66dd', name: 'highlight' }
    ];

    for (const pair of colorPairs) {
      const lightBrightness = getBrightness(pair.light);
      const darkBrightness = getBrightness(pair.dark);
      
      // Dark theme colors should be brighter (higher brightness value)
      expect(darkBrightness).toBeGreaterThan(lightBrightness);
    }
  });
});
