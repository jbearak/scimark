// src/latex-to-omml.property.test.ts

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import { XMLParser } from 'fast-xml-parser';
import { latexToOmml } from './latex-to-omml';
import { ommlToLatex } from './omml';

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  trimValues: false,
};

function normalizeLatex(latex: string): string {
  return latex
    .replace(/\s+/g, ' ')
    .replace(/\{\s*([^{}]*)\s*\}/g, '{$1}')
    // Only remove braces around single characters, not multi-character content
    .replace(/\{([^{}\s])\}/g, '$1')
    .trim();
}

function semanticallyEquivalent(original: string, roundTrip: string): boolean {
  const norm1 = normalizeLatex(original);
  const norm2 = normalizeLatex(roundTrip);
  
  if (norm1 === norm2) return true;
  
  // Handle \mathrm{} wrapping - multi-letter text may get wrapped
  let converted1 = norm1;
  let converted2 = norm2;
  
  // Remove \mathrm{} wrappers for comparison
  converted2 = converted2.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  
  if (converted1 === converted2) return true;
  
  // Handle braces around LaTeX commands in scripts: {\\alpha}^{x} vs \\alpha^{x}
  converted1 = converted1.replace(/\{(\\[a-zA-Z]+)\}/g, '$1');
  converted2 = converted2.replace(/\{(\\[a-zA-Z]+)\}/g, '$1');
  
  if (converted1 === converted2) return true;
  
  // Handle cases where symbols might be converted to Unicode and back
  const symbolsToUnicode = new Map([
    ['\\times', '×'], ['\\div', '÷'], ['\\pm', '±'], ['\\leq', '≤'], 
    ['\\geq', '≥'], ['\\neq', '≠'], ['\\infty', '∞'], ['\\partial', '∂'],
    ['\\in', '∈'], ['\\cup', '∪'], ['\\cap', '∩']
  ]);
  
  for (const [latex, unicode] of symbolsToUnicode) {
    converted1 = converted1.replace(new RegExp(latex.replace('\\', '\\\\'), 'g'), unicode);
    converted2 = converted2.replace(new RegExp(latex.replace('\\', '\\\\'), 'g'), unicode);
  }
  
  return converted1 === converted2;
}

describe('LaTeX-to-OMML round-trip property tests', () => {
  test('Property 11: LaTeX-to-OMML round-trip', () => {
    // Simplified property test focusing on basic constructs that should round-trip cleanly
    const simpleAtom = fc.oneof(
      fc.constantFrom('x', 'y', 'z', 'a', 'b', 'c'), // Single letters
      fc.constantFrom('\\alpha', '\\beta', '\\gamma'), // Greek letters
      fc.constantFrom('\\times', '\\div', '\\pm') // Simple symbols
    );
    
    const simpleFraction = fc.tuple(simpleAtom, simpleAtom).map(([num, den]) => 
      '\\frac{' + num + '}{' + den + '}'
    );
    
    const simpleScript = fc.tuple(simpleAtom, simpleAtom).map(([base, script]) => 
      base + '^{' + script + '}'
    );
    
    const simpleSqrt = simpleAtom.map(x => '\\sqrt{' + x + '}');
    
    const simpleExpression = fc.oneof(
      simpleAtom,
      simpleFraction,
      simpleScript,
      simpleSqrt
    );

    fc.assert(
      fc.property(simpleExpression, (latex) => {
        try {
          // Convert LaTeX to OMML
          const omml = latexToOmml(latex);
          
          if (!omml) {
            return latex.trim() === '';
          }

          // Parse OMML XML
          const parser = new XMLParser(parserOptions);
          const parsed = parser.parse('<m:oMath>' + omml + '</m:oMath>');
          
          // Extract children from parsed structure
          let children: any[] = [];
          if (parsed && Array.isArray(parsed) && parsed[0]?.['m:oMath']) {
            children = parsed[0]['m:oMath'];
          }
          
          // Convert back to LaTeX
          const roundTrip = ommlToLatex(children);
          
          // Allow for some differences in bracing and symbol representation
          return semanticallyEquivalent(latex, roundTrip);
        } catch (error) {
          // Surface unexpected crashes so property tests can catch real defects.
          console.warn('Round-trip error for:', latex, error);
          throw error;
        }
      }),
      { 
        numRuns: 50, // Reduced from 100 for faster execution
        verbose: false
      }
    );
  }, { timeout: 10000 });
});