import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import { convertMdToDocx, parseMd, type MdRun, type MdToken } from './md-to-docx';
import { convertDocx } from './converter';

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function normalizeLatexForSig(latex: string): string {
  return latex
    .replace(/\s+/g, '')
    .replace(/\{\s*([^{}]*)\s*\}/g, '{$1}')
    .replace(/\{([^{}\s])\}/g, '$1')
    .replace(/\{([a-zA-Z]+_[a-zA-Z0-9]+)\}/g, '$1')
    .replace(/\\begin\{equation\}/g, '')
    .replace(/\\end\{equation\}/g, '')
    .trim();
}
function normalizeMathSegmentsInText(text: string): string {
  const normalizedDisplay = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => '$$' + normalizeLatexForSig(inner));
  return normalizedDisplay.replace(/\$([^$\n]+)\$/g, (_m, inner) => '$' + normalizeLatexForSig(inner));
}

function runText(runs: MdRun[]): string {
  const raw = runs
    .map(r => {
      if (r.type === 'softbreak') return '\n';
      if (r.type === 'text') return r.text;
      if (r.type === 'critic_add' || r.type === 'critic_del' || r.type === 'critic_highlight' || r.type === 'critic_comment') return r.text;
      if (r.type === 'critic_sub') return (r.text || '') + '=>' + (r.newText || '');
      if (r.type === 'citation') {
        const keys = r.keys || [];
        const locators = keys.map(k => r.locators?.get(k) || '').join(',');
        return 'cite:' + keys.join(';') + '|' + locators;
      }
      if (r.type === 'math') return (r.display ? '$$' : '$') + normalizeLatexForSig(r.text) + (r.display ? '$$' : '$');
      return r.text || '';
    })
    .join('');
  return normalizeMathSegmentsInText(raw)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function tokenSignature(tokens: MdToken[]): string[] {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  return tokens.map(t => {
    if (t.type === 'table') {
      const rows = (t.rows || []).map(r => r.cells.map(c => norm(runText(c.runs))).join('|')).join('||');
      return 'table:' + rows;
    }
    const base = [t.type, String(t.level || 0), t.ordered ? '1' : '0', t.taskChecked === undefined ? 'n' : (t.taskChecked ? '1' : '0'), t.alertType || '-', t.language || '-'].join(':');
    return base + ':' + norm(runText(t.runs));
  });
}

function isMathLikeToken(token: MdToken): boolean {
  if (token.type === 'math') return true;
  if (token.type === 'paragraph') {
    const text = runText(token.runs);
    return text.includes('$') || text.includes('\\begin{') || text.includes('\\end{');
  }
  return false;
}

function tokenSignatureWithoutMathLike(tokens: MdToken[]): string[] {
  return tokenSignature(tokens.filter(t => !isMathLikeToken(t)));
}

function paragraphFromPieces(pieces: string[]): string {
  return pieces.join(' ');
}

const wordArb = fc.constantFrom('alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'lambda');
const sentenceArb = fc.array(wordArb, { minLength: 2, maxLength: 6 }).map(parts => parts.join(' '));
const paragraphArb = fc.array(sentenceArb, { minLength: 1, maxLength: 2 }).map(paragraphFromPieces);

const headingArb = fc.tuple(fc.integer({ min: 1, max: 3 }), sentenceArb).map(([lvl, s]) => '#'.repeat(lvl) + ' ' + s);
const bulletArb = fc.array(sentenceArb, { minLength: 1, maxLength: 3 }).map(items => items.map(i => '- ' + i).join('\n'));
const orderedArb = fc.array(sentenceArb, { minLength: 1, maxLength: 3 }).map(items => items.map(i => '1. ' + i).join('\n'));
const codeArb = fc.tuple(fc.constantFrom('', 'js', 'ts', 'python'), sentenceArb).map(([lang, s]) => '```' + lang + '\n' + s + '\n```');
const quoteArb = sentenceArb.map(s => '> ' + s);
const alertArb = fc.tuple(fc.constantFrom('NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'), sentenceArb).map(([t, s]) => '> [!' + t + ']\n> ' + s);
const alertPlusParaArb = fc.tuple(
  fc.constantFrom('NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'),
  sentenceArb,
  sentenceArb,
  fc.constantFrom('\n', '\n\n'),
).map(([t, alertBody, para, sep]) => '> [!' + t + ']\n> ' + alertBody + sep + para);

const blockArb = fc.oneof(
  paragraphArb,
  headingArb,
  bulletArb,
  orderedArb,
  codeArb,
  quoteArb,
  alertArb,
  alertPlusParaArb,
);
const documentArb = fc.array(blockArb, { minLength: 2, maxLength: 8 }).map(parts => parts.join('\n\n'));

const sampleBibtex = [
  '@article{smith2020,',
  '  author = {Smith, John},',
  '  title = {Effects of Something},',
  '  year = {2020},',
  '}',
  '@article{jones2021,',
  '  author = {Jones, Amy},',
  '  title = {More Effects},',
  '  year = {2021},',
  '}',
  '@article{lee2019,',
  '  author = {Lee, Kai},',
  '  title = {Prior Work},',
  '  year = {2019},',
  '}',
].join('\n');

const citeKeyArb = fc.constantFrom('smith2020', 'jones2021', 'lee2019');
const inlineMathArb = fc.constantFrom(
  '$x$',
  '$x^2$',
  '$\\frac{a}{b}$',
  '$\\alpha + \\beta$',
  '$\\sum_{i=1}^{n} x_i$',
);
const inlineCodeArb = fc.constantFrom(
  '`x <- 1`',
  '`const x = 1;`',
  '`\\frac{a}{b}`',
  '`model <- lm(y ~ x)`',
);
const inlineCitationArb = fc.oneof(
  citeKeyArb.map(k => '[@' + k + ']'),
  citeKeyArb.map(k => '[@' + k + ', p. 12]'),
  fc.tuple(citeKeyArb, citeKeyArb).filter(([a, b]) => a !== b).map(([a, b]) => '[@' + a + '; @' + b + ']'),
);
const inlineAtomArb = fc.oneof(
  sentenceArb,
  inlineMathArb,
  inlineCodeArb,
  inlineCitationArb,
  sentenceArb.map(s => '**' + s + '**'),
  sentenceArb.map(s => '*' + s + '*'),
);
const richInlineParagraphArb = fc.array(inlineAtomArb, { minLength: 3, maxLength: 8 }).map(parts => parts.join(' '));

const codeFenceLangArb = fc.constantFrom('', 'python', 'r', 'stata', 'js', 'ts', 'bash');
const codeFenceBodyArb = fc.array(
  fc.constantFrom(
    'x <- 1',
    'display("hello")',
    'const y = x + 1;',
    'print(alpha + beta)',
    '# not-a-citation [@smith2020]',
    '\\frac{a}{b}',
  ),
  { minLength: 1, maxLength: 5 },
).map(lines => lines.join('\n'));
const codeFenceBlockArb = fc.tuple(codeFenceLangArb, codeFenceBodyArb).map(
  ([lang, body]) => '```' + lang + '\n' + body + '\n```',
);
const displayMathBlockArb = fc.constantFrom(
  '$$\nx^2 + y^2 = z^2\n$$',
  '$$\n\\frac{a}{b}\n$$',
  '$$\n\\sum_{i=1}^{n} x_i\n$$',
);
const richBlockArb = fc.oneof(
  richInlineParagraphArb,
  headingArb,
  bulletArb,
  orderedArb,
  quoteArb,
  alertArb,
  alertPlusParaArb,
  codeFenceBlockArb,
  displayMathBlockArb,
);
const richDocumentArb = fc.array(richBlockArb, { minLength: 3, maxLength: 10 }).map(parts => parts.join('\n\n'));

const equationCaseArb = fc.oneof(
  fc.constant({ block: '\\begin{equation}\nE = mc^2\n\\end{equation}', mustContain: ['$$', 'E', 'm', 'c'] }),
  fc.constant({ block: '\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}', mustContain: ['$$', 'a', 'b', 'c', 'd'] }),
  fc.constant({ block: '\\begin{cases}\nx & x > 0 \\\\\n0 & x \\le 0\n\\end{cases}', mustContain: ['$$', 'x', '0'] }),
);

describe('Feature: md-to-docx-conversion', () => {
  it('Property: spec feature combinations preserve markdown semantics in md->docx->md roundtrip', async () => {
    await fc.assert(
      fc.asyncProperty(documentArb, async markdown => {
        const { docx } = await convertMdToDocx(markdown);
        const rt = await convertDocx(docx);
        const originalSig = tokenSignature(parseMd(markdown));
        const roundTripSig = tokenSignature(parseMd(stripFrontmatter(rt.markdown)));
        expect(roundTripSig).toEqual(originalSig);
      }),
      { numRuns: 120, verbose: true },
    );
  }, { timeout: 120000 });

  it('Property: inline combinations (math + code + citations + formatting) preserve semantics in roundtrip', async () => {
    await fc.assert(
      fc.asyncProperty(richInlineParagraphArb, async paragraph => {
        const markdown = [
          '# Inline combinations',
          '',
          paragraph,
          '',
          paragraph + ' ' + '$x^2$' + ' ' + '`const z = 3;`' + ' ' + '[@smith2020, p. 4]',
        ].join('\n');
        const { docx, warnings } = await convertMdToDocx(markdown, { bibtex: sampleBibtex });
        expect(warnings).toEqual([]);
        const rt = await convertDocx(docx);
        const originalSig = tokenSignature(parseMd(markdown));
        const roundTripSig = tokenSignature(parseMd(stripFrontmatter(rt.markdown)));
        expect(roundTripSig).toEqual(originalSig);
      }),
      { numRuns: 120, verbose: true },
    );
  }, { timeout: 120000 });

  it('Property: mixed block combinations (code fences, display math, inline citations) preserve semantics in roundtrip', async () => {
    await fc.assert(
      fc.asyncProperty(richDocumentArb, async markdown => {
        const { docx, warnings } = await convertMdToDocx(markdown, { bibtex: sampleBibtex });
        expect(warnings).toEqual([]);
        const rt = await convertDocx(docx);
        const rtBody = stripFrontmatter(rt.markdown);
        const originalNonMath = tokenSignatureWithoutMathLike(parseMd(markdown));
        const roundTripNonMath = tokenSignatureWithoutMathLike(parseMd(rtBody));
        expect(roundTripNonMath).toEqual(originalNonMath);
      }),
      { numRuns: 160, verbose: true },
    );
  }, { timeout: 150000 });

  it('Property: equation environments roundtrip alongside other features without corrupting surrounding structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        equationCaseArb,
        richInlineParagraphArb,
        bulletArb,
        async (eqCase, paragraph, bullets) => {
          const markdown = [
            '# Equation mix',
            '',
            paragraph,
            '',
            eqCase.block,
            '',
            '> [!NOTE]',
            '> alpha alpha',
            '',
            bullets,
          ].join('\n');

          const { docx, warnings } = await convertMdToDocx(markdown, { bibtex: sampleBibtex });
          expect(warnings).toEqual([]);
          const rt = await convertDocx(docx);
          const rtBody = stripFrontmatter(rt.markdown);

          for (const fragment of eqCase.mustContain) {
            expect(rtBody).toContain(fragment);
          }

          const originalNonMath = tokenSignatureWithoutMathLike(parseMd(markdown));
          const roundTripNonMath = tokenSignatureWithoutMathLike(parseMd(rtBody));
          expect(roundTripNonMath).toEqual(originalNonMath);
        },
      ),
      { numRuns: 120, verbose: true },
    );
  }, { timeout: 150000 });
});
