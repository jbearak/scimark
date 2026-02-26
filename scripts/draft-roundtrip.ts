/**
 * Double round-trip stability test for Draft.md
 *
 * Verifies that md → docx → md reaches a fixpoint:
 *   RT1 markdown === RT2 markdown
 *
 * Two scenarios:
 *   1. With Draft.bib (bibtex option)
 *   2. Without bib (no bibtex option)
 *
 * Run: bun scripts/draft-roundtrip.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { convertMdToDocx } from '../src/md-to-docx';
import { convertDocx } from '../src/converter';

const repoRoot = join(__dirname, '..');
const outDir = join(__dirname, 'draft-roundtrip-output');

mkdirSync(outDir, { recursive: true });

const originalMd = readFileSync(join(repoRoot, 'test/fixtures/draft.md'), 'utf-8');
const originalBib = readFileSync(join(repoRoot, 'test/fixtures/draft.bib'), 'utf-8');

interface ScenarioResult {
  name: string;
  pass: boolean;
  diff?: string;
}

async function runScenario(
  name: string,
  md: string,
  bibtex?: string,
): Promise<ScenarioResult> {
  const prefix = name.replace(/\s+/g, '-').toLowerCase();

  // RT1: md → docx → md
  const r1Opts = bibtex ? { bibtex } : undefined;
  const r1 = await convertMdToDocx(md, r1Opts);
  if (r1.warnings.length > 0) {
    console.log(`  [${name}] RT1 warnings:`, r1.warnings);
  }
  const m1 = await convertDocx(r1.docx);

  // Write RT1 outputs
  writeFileSync(join(outDir, prefix + '-rt1.md'), m1.markdown);
  writeFileSync(join(outDir, prefix + '-rt1.docx'), r1.docx);
  if (m1.bibtex) {
    writeFileSync(join(outDir, prefix + '-rt1.bib'), m1.bibtex);
  }

  // RT2: RT1 markdown → docx → md
  const r2Opts = m1.bibtex ? { bibtex: m1.bibtex } : undefined;
  const r2 = await convertMdToDocx(m1.markdown, r2Opts);
  if (r2.warnings.length > 0) {
    console.log(`  [${name}] RT2 warnings:`, r2.warnings);
  }
  const m2 = await convertDocx(r2.docx);

  // Write RT2 outputs
  writeFileSync(join(outDir, prefix + '-rt2.md'), m2.markdown);
  writeFileSync(join(outDir, prefix + '-rt2.docx'), r2.docx);
  if (m2.bibtex) {
    writeFileSync(join(outDir, prefix + '-rt2.bib'), m2.bibtex);
  }

  // Compare RT1 vs RT2
  const rt1 = m1.markdown.trimEnd();
  const rt2 = m2.markdown.trimEnd();

  if (rt1 === rt2) {
    return { name, pass: true };
  }

  const rt1File = join(outDir, prefix + '-rt1.md');
  const rt2File = join(outDir, prefix + '-rt2.md');
  const result = spawnSync('diff', ['-u', '--label', 'RT1', '--label', 'RT2', rt1File, rt2File], { encoding: 'utf-8' });
  const patch = result.stdout;
  writeFileSync(join(outDir, prefix + '-diff.patch'), patch);

  return { name, pass: false, diff: patch };
}

async function main() {
  console.log('Double round-trip stability test for Draft.md\n');
  console.log('Output dir:', outDir, '\n');

  const results: ScenarioResult[] = [];

  // Scenario 1: With bib
  console.log('Running scenario: With bib...');
  results.push(await runScenario('with-bib', originalMd, originalBib));

  // Scenario 2: Without bib
  console.log('Running scenario: Without bib...');
  results.push(await runScenario('without-bib', originalMd));

  // Report
  console.log('\n--- Results ---\n');
  let allPass = true;
  for (const r of results) {
    if (r.pass) {
      console.log(`  ✓ ${r.name}: RT1 === RT2 (fixpoint reached)`);
    } else {
      allPass = false;
      console.log(`  ✗ ${r.name}: RT1 !== RT2`);
      console.log('\n' + r.diff);
    }
  }

  if (!allPass) {
    console.log('\nFAILED: not all scenarios reached fixpoint');
    process.exit(1);
  } else {
    console.log('\nPASSED: all scenarios reached fixpoint');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
