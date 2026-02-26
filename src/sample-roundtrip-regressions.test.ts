import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertMdToDocx } from './md-to-docx';
import { convertDocx } from './converter';

const repoRoot = join(__dirname, '..');

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function firstDisplayMathBody(md: string): string {
  const match = md.match(/\$\$\n([\s\S]*?)\n\$\$/);
  return match ? match[1] : '';
}

describe('sample roundtrip regressions', () => {
  it('md→docx→md preserves math whitespace and aligned display line breaks', async () => {
    const sampleMd = readFileSync(join(repoRoot, 'sample.md'), 'utf8');
    const sampleBib = readFileSync(join(repoRoot, 'sample.bib'), 'utf8');
    const { docx, warnings } = await convertMdToDocx(sampleMd, { bibtex: sampleBib });
    expect(warnings).toEqual([]);

    const rt = await convertDocx(docx);
    const body = stripFrontmatter(rt.markdown);

    expect(body).toContain('$n = 74$');
    expect(body).toContain('\\cdot P');
    expect(body).not.toContain('\\cdotP');

    const display = firstDisplayMathBody(body);
    expect(display).toContain('\\begin{aligned}');
    expect(display).toMatch(/\\begin\{aligned\}\n[\s\S]*\\\\\n[\s\S]*\\end\{aligned\}/);
    expect(display).not.toContain('\\begin{aligned} F(');
  });

  it('Word-saved DOCX converts without blockquote loss, hidden _bqg leakage, or spurious \\mathrm insertions', async () => {
    const savedPath = join(repoRoot, 'sample_saved.docx');
    if (!existsSync(savedPath)) {
      console.log('SKIP: sample_saved.docx not found (must be created by opening sample.docx in Word and saving)');
      return;
    }
    const savedDocx = new Uint8Array(readFileSync(savedPath));
    const rt = await convertDocx(savedDocx);
    const body = stripFrontmatter(rt.markdown);

    expect(body).toContain('> "We dare not trust our wit for making our house pleasant to our friend, so we buy ice cream."');
    expect(body).not.toContain('_bqg');

    expect(body).toContain('$n = 74$');
    expect(body).toContain('\\cdot P');
    expect(body).not.toContain('\\cdotP');
    expect(body).not.toContain('\\mathrm{');

    const display = firstDisplayMathBody(body);
    expect(display).toContain('\\begin{aligned}');
    expect(display).toMatch(/\\begin\{aligned\}\n[\s\S]*\\\\\n[\s\S]*\\end\{aligned\}/);
  });
});
