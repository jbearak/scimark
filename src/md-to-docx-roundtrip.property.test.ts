import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import { convertMdToDocx, parseMd, type MdRun, type MdToken } from './md-to-docx';
import { convertDocx } from './converter';

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function runText(runs: MdRun[]): string {
  const raw = runs
    .map(r => {
      if (r.type === 'softbreak') return '\n';
      if (r.type === 'text') return r.text;
      if (r.type === 'critic_add' || r.type === 'critic_del' || r.type === 'critic_highlight' || r.type === 'critic_comment') return r.text;
      if (r.type === 'critic_sub') return (r.text || '') + '=>' + (r.newText || '');
      if (r.type === 'citation') return (r.keys || []).join(';');
      if (r.type === 'math') return (r.display ? '$$' : '$') + r.text;
      return r.text || '';
    })
    .join('');
  return raw
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
});
