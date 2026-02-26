/**
 * Anonymize Draft.md and Draft.bib from the external paper repo into
 * test/fixtures/draft.md and test/fixtures/draft.bib.
 *
 * Preserves every structural feature (frontmatter, headings, tables, citations,
 * CriticMarkup, HTML comments, lists, equations) while replacing all
 * identifying content with fictional text.
 *
 * Run: bun scripts/anonymize-draft.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const paperDir = join(__dirname, '..', '..', 'abortions-by-age-paper');
const fixtureDir = join(__dirname, '..', 'test', 'fixtures');

mkdirSync(fixtureDir, { recursive: true });

const originalMd = readFileSync(join(paperDir, 'Draft.md'), 'utf-8');
const originalBib = readFileSync(join(paperDir, 'Draft.bib'), 'utf-8');

// ---------------------------------------------------------------------------
// Lorem ipsum word pool
// ---------------------------------------------------------------------------
const loremWords = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'tempor', 'incididunt', 'labore', 'dolore', 'magna',
  'aliqua', 'enim', 'minim', 'veniam', 'nostrud', 'exercitation',
  'ullamco', 'laboris', 'nisi', 'aliquip', 'commodo', 'consequat',
  'duis', 'aute', 'irure', 'reprehenderit', 'voluptate', 'velit',
  'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur',
  'sint', 'occaecat', 'cupidatat', 'proident', 'sunt', 'culpa',
  'officia', 'deserunt', 'mollit', 'anim', 'est', 'laborum',
  'viverra', 'maecenas', 'accumsan', 'lacus', 'vel', 'facilisis',
  'volutpat', 'blandit', 'risus', 'pretium', 'quam', 'vulputate',
  'dignissim', 'suspendisse', 'potenti', 'nullam', 'porttitor',
  'massa', 'tincidunt', 'ornare', 'pulvinar', 'elementum', 'integer',
  'feugiat', 'scelerisque', 'varius', 'morbi', 'nunc', 'faucibus',
  'pharetra', 'diam', 'praesent', 'tristique', 'senectus', 'netus',
  'malesuada', 'fames', 'turpis', 'egestas', 'pellentesque', 'habitant',
  'sagittis', 'vitae', 'congue', 'quisque', 'egestas', 'dapibus',
  'libero', 'justo', 'laoreet', 'mattis', 'ultrices', 'posuere',
  'cubilia', 'curae', 'donec', 'velit', 'fringilla', 'sapien',
];

let loremIdx = 0;
function nextLorem(): string {
  const w = loremWords[loremIdx % loremWords.length];
  loremIdx++;
  return w;
}

function loremSentence(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) words.push(nextLorem());
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(' ');
}

function loremPhrase(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) words.push(nextLorem());
  return words.join(' ');
}

// ---------------------------------------------------------------------------
// Step 1: Build citation key mapping
// ---------------------------------------------------------------------------

// Collect all citation keys from the markdown (inside [@...] brackets)
const mdCiteRe = /\[-?@([\w:-]+)/g;
const originalKeys = new Set<string>();
for (const m of originalMd.matchAll(mdCiteRe)) {
  originalKeys.add(m[1]);
}
// Also scan bib for keys defined but maybe not referenced in md
for (const m of originalBib.matchAll(/^@\w+\{([\w:-]+),/gm)) {
  originalKeys.add(m[1]);
}

const fakeLastNames = [
  'smith', 'jones', 'chen', 'patel', 'garcia', 'kim', 'mueller', 'silva',
  'taylor', 'wilson', 'brown', 'anderson', 'thomas', 'jackson', 'white',
  'harris', 'martin', 'thompson', 'clark', 'lewis', 'robinson', 'walker',
  'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill',
  'flores', 'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell',
  'mitchell', 'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner',
  'diaz', 'parker', 'cruz', 'edwards', 'collins', 'reyes', 'stewart',
  'morris', 'morales', 'murphy', 'cook', 'rogers', 'morgan', 'peterson',
  'cooper', 'reed', 'bailey', 'bell', 'howard',
];
const greekLabels = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho',
  'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
];

const keyMap = new Map<string, string>();
let nameIdx = 0;
let labelIdx = 0;

for (const key of originalKeys) {
  const yearMatch = key.match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : '';
  const fakeName = fakeLastNames[nameIdx % fakeLastNames.length];
  nameIdx++;
  const label = greekLabels[labelIdx % greekLabels.length];
  labelIdx++;
  const newKey = year ? fakeName + year + label : fakeName + label;
  keyMap.set(key, newKey);
}

function remapKey(key: string): string {
  return keyMap.get(key) || key;
}

// ---------------------------------------------------------------------------
// Placeholder system — protects structural elements during word replacement
// ---------------------------------------------------------------------------
let placeholders: string[] = [];

function resetPlaceholders(): void {
  placeholders = [];
}

function ph(content: string): string {
  const idx = placeholders.length;
  placeholders.push(content);
  return '\x00' + idx + '\x00';
}

function restorePlaceholders(text: string): string {
  return text.replace(/\x00(\d+)\x00/g, (_m, idx) => placeholders[parseInt(idx)]);
}

// ---------------------------------------------------------------------------
// Step 2: Process Draft.md
// ---------------------------------------------------------------------------

// Reviewer name mapping
const reviewerNames = new Map<string, string>();
let reviewerCount = 0;
const reviewerLabels = ['Reviewer A', 'Reviewer B', 'Reviewer C', 'Reviewer D', 'Reviewer E'];

function anonymizeReviewer(name: string): string {
  const trimmed = name.trim();
  if (!reviewerNames.has(trimmed)) {
    reviewerNames.set(trimmed, reviewerLabels[reviewerCount % reviewerLabels.length]);
    reviewerCount++;
  }
  return reviewerNames.get(trimmed)!;
}

// Heading replacements — generic academic headings preserving hierarchy
const headingReplacements: Record<string, string> = {
  'Introduction': 'Introduction',
  'Methods': 'Methods',
  'Data sources': 'Data Sources',
  'Age data': 'Primary Data',
  'Population data': 'Demographic Data',
  'Study sample selection': 'Sample Selection',
  'Analysis': 'Analysis',
  'Selection of data sources and years': 'Source Selection Algorithm',
  'Age groups': 'Grouping Variables',
  'Measures': 'Measures',
  'Results': 'Results',
  'Discussion': 'Discussion',
};

/**
 * Remap citation keys inside a text string. Handles [@key1; @key2],
 * [-@key], and standalone [@key] forms.
 */
function remapCitations(text: string): string {
  return text.replace(/\[(-?)@([^\]]*)\]/g, (_match, negPrefix: string, inner: string) => {
    // inner = "key1; @key2; @key3" — first key has no @ prefix
    const remapped = inner.replace(/(^|(?:;\s*)@?)([\w:-]+)/g, (_m, prefix: string, key: string) => {
      if (prefix.startsWith(';')) {
        return '; @' + remapKey(key);
      }
      return remapKey(key);
    });
    return '[' + negPrefix + '@' + remapped + ']';
  });
}

/**
 * Replace prose words in a line, protecting citations, CriticMarkup, and
 * other structural tokens with placeholders.
 */
function anonymizeProse(text: string): string {
  resetPlaceholders();

  let processed = text;

  // 1. Protect CriticMarkup comments: {>>...<<}
  processed = processed.replace(/\{>>[\s\S]*?<<\}/g, m => ph(m));

  // 2. Protect CriticMarkup highlights: {==...==}
  processed = processed.replace(/\{==[\s\S]*?==\}/g, m => ph(m));

  // 3. Protect CriticMarkup additions/deletions/substitutions
  processed = processed.replace(/\{\+\+[\s\S]*?\+\+\}/g, m => ph(m));
  processed = processed.replace(/\{--[\s\S]*?--\}/g, m => ph(m));
  processed = processed.replace(/\{~~[\s\S]*?~~\}/g, m => ph(m));

  // 4. Protect highlight color suffixes like {yellow}
  processed = processed.replace(/\{[a-z]+\}/g, m => ph(m));

  // 5. Protect citations: [@...] and [-@...]
  processed = processed.replace(/\[-?@[^\]]*\]/g, m => ph(m));

  // 6. Protect inline code
  processed = processed.replace(/`[^`]+`/g, m => ph(m));

  // 7. Protect bold/italic markers (but not the text between them)
  // We handle these by protecting the markers themselves
  processed = processed.replace(/\*\*\*|\*\*|\*/g, m => ph(m));

  // 8. Replace words (3+ chars, alphabetic)
  processed = processed.replace(/\b[a-zA-Z][a-zA-Z'-]{2,}\b/g, () => nextLorem());

  // 9. Also replace remaining 1-2 char alphabetic words that look like prose
  // (skip common structural chars: 's, etc.)
  processed = processed.replace(/(?<=\s|^)[a-zA-Z]{1,2}(?=\s|[,.:;!?)]|$)/g, () => {
    const w = nextLorem();
    return w.slice(0, 2); // keep short
  });

  // Restore
  processed = restorePlaceholders(processed);
  return processed;
}

/**
 * Process CriticMarkup in a line: anonymize comment authors and text,
 * anonymize highlight text, then anonymize remaining prose.
 */
function processCriticLine(line: string): string {
  let processed = line;

  // Replace comment content: {>>Author (date): text<<}
  processed = processed.replace(
    /\{>>([\w\s]+)\((\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\):\s*([\s\S]*?)<<\}/g,
    (_m, author, date, _text) => {
      const anonAuthor = anonymizeReviewer(author);
      return '{>>' + anonAuthor + ' (' + date + '): ' + loremSentence(8) + '.<<}';
    },
  );

  // Replace any remaining comments that don't match the author-date pattern
  // (e.g. editorial feedback blocks without structured attribution)
  processed = processed.replace(
    /\{>>((?!Reviewer)[^<]*)<<\}/g,
    () => '{>>' + loremSentence(15) + '.<<}',
  );

  // Replace highlight content: {==text==}
  processed = processed.replace(
    /\{==([\s\S]*?)==\}/g,
    () => '{==' + loremPhrase(4) + '==}',
  );

  // Remap citations
  processed = remapCitations(processed);

  // Anonymize remaining prose words (placeholder-protected)
  processed = anonymizeProse(processed);

  return processed;
}

function processMarkdown(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let inFrontmatter = false;
  let frontmatterDone = false;
  let inHtmlComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- Frontmatter ---
    if (!frontmatterDone && i === 0 && line === '---') {
      inFrontmatter = true;
      output.push(line);
      continue;
    }
    if (inFrontmatter) {
      if (line === '---') {
        inFrontmatter = false;
        frontmatterDone = true;
      }
      output.push(line); // keep csl: chicago-author-date as-is
      continue;
    }
    if (!frontmatterDone) frontmatterDone = true;

    // --- HTML comment block ---
    if (line.startsWith('<!--')) {
      inHtmlComment = true;
      output.push('<!--');
      continue;
    }
    if (inHtmlComment) {
      if (line.includes('-->')) {
        inHtmlComment = false;
        output.push('');
        output.push(loremSentence(8) + '.');
        output.push('');
        output.push(loremSentence(12) + '.');
        output.push('');
        output.push('-->');
      }
      // skip original content inside HTML comment
      continue;
    }

    // --- Blank lines ---
    if (/^\s*$/.test(line)) {
      output.push('');
      continue;
    }

    // --- Headings ---
    const headingMatch = line.match(/^(#+)\s+(.*)/);
    if (headingMatch) {
      const markers = headingMatch[1];
      const origText = headingMatch[2].trim();
      const replacement = headingReplacements[origText] || loremSentence(3);
      output.push(markers + ' ' + replacement);
      continue;
    }

    // --- Table rows ---
    if (line.startsWith('|')) {
      // Table separator line — keep as-is
      if (/^\|[-| :]+\|$/.test(line)) {
        output.push(line);
        continue;
      }

      // Parse cells
      const cells = line.split('|').slice(1, -1); // drop first/last empty from split
      const newCells = cells.map((cell) => {
        const trimmed = cell.trim();
        // Italic wrapper for category rows
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
          return ' *' + loremSentence(3) + '* ';
        }
        if (trimmed === '') return ' ';

        // Remap citations, then anonymize prose
        let newCell = remapCitations(trimmed);
        newCell = anonymizeProse(newCell);
        return ' ' + newCell + ' ';
      });
      output.push('|' + newCells.join('|') + '|');
      continue;
    }

    // --- List items ---
    const listMatch = line.match(/^(\s*[-\t]+\s*)(.*)/);
    if (listMatch && /^[\s\t]*-\s/.test(line)) {
      const marker = listMatch[1];
      let content = remapCitations(listMatch[2]);
      content = anonymizeProse(content);
      output.push(marker + content);
      continue;
    }

    // --- CriticMarkup-heavy lines ---
    if (/\{>>/.test(line) || /\{==/.test(line)) {
      output.push(processCriticLine(line));
      continue;
    }

    // --- Equations (lines with algebraic notation) ---
    if (/[=+*/^(]/.test(line) && /\b(rate|Rate)\b/i.test(line)) {
      let eqLine = line;
      eqLine = eqLine.replace(/\b(Pregnancy|pregnancy)\s+(rate|Rate)/g, 'Outcome rate');
      eqLine = eqLine.replace(/\b(Total|total)\s+(abortion|Abortion)\s+(rate|Rate)/g, 'Total procedure rate');
      eqLine = eqLine.replace(/\b(Birth|birth)\s+(rate|Rate)/g, 'Baseline rate');
      eqLine = eqLine.replace(/\b(Induced|induced)\s+(abortion|Abortion)\s+(rate|Rate)/g, 'Adjusted procedure rate');
      eqLine = eqLine.replace(/\babortion(s?)\b/gi, 'procedure$1');
      eqLine = eqLine.replace(/\bspontaneous\b/gi, 'incidental');
      eqLine = eqLine.replace(/\bbirth(s?)\b/gi, 'baseline$1');
      output.push(eqLine);
      continue;
    }

    // --- Regular prose paragraphs ---
    let processed = remapCitations(line);
    processed = anonymizeProse(processed);
    output.push(processed);
  }

  return output.join('\n');
}

// ---------------------------------------------------------------------------
// Step 3: Process Draft.bib
// ---------------------------------------------------------------------------

function processBib(bib: string): string {
  const entries: string[] = [];
  let current = '';

  for (const line of bib.split('\n')) {
    if (/^@\w+\{/.test(line) && current.trim()) {
      entries.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim()) entries.push(current);

  const fakeFirstNames = [
    'Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry',
    'Iris', 'James', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Peter',
    'Quinn', 'Ruth', 'Sam', 'Tara', 'Uma', 'Vera', 'Will', 'Xena',
    'Yuri', 'Zara',
  ];
  let authorIdx = 0;

  function fakeAuthor(): string {
    const last = fakeLastNames[authorIdx % fakeLastNames.length];
    const first = fakeFirstNames[authorIdx % fakeFirstNames.length];
    authorIdx++;
    return last.charAt(0).toUpperCase() + last.slice(1) + ', ' + first;
  }

  function fakeAuthors(count: number): string {
    const authors: string[] = [];
    for (let i = 0; i < count; i++) authors.push(fakeAuthor());
    return authors.join(' and ');
  }

  return entries.map(entry => {
    // Replace the citation key in the @type{key, line
    let result = entry.replace(
      /^(@\w+)\{([\w:-]+),/m,
      (_m, type, key) => type + '{' + remapKey(key) + ',',
    );

    // Replace author field — handle both {Name} and {{Name}} forms
    result = result.replace(
      /^(\s*author\s*=\s*\{)\{?(.*?)\}?(\},?\s*)$/m,
      (_m, pre, authors, post) => {
        const count = (authors.match(/\band\b/g) || []).length + 1;
        return pre + '{' + fakeAuthors(count) + '}' + post;
      },
    );

    // Replace title field — handle both {Title} and {{Title}} forms
    result = result.replace(
      /^(\s*title\s*=\s*\{)\{?(.*?)\}?(\},?\s*)$/m,
      (_m, pre, _title, post) => {
        return pre + '{' + loremSentence(8) + '}' + post;
      },
    );

    // Replace journal/journaltitle field
    result = result.replace(
      /^(\s*journal(?:title)?\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, _journal, post) => {
        return pre + 'Journal of Applied Studies' + post;
      },
    );

    // Replace publisher field
    result = result.replace(
      /^(\s*publisher\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, _pub, post) => {
        return pre + 'Academic Press' + post;
      },
    );

    // Replace URL field
    result = result.replace(
      /^(\s*url\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, _url, post) => {
        const key = entry.match(/@\w+\{([\w:-]+),/)?.[1] || 'example';
        return pre + 'https://example.com/' + remapKey(key) + post;
      },
    );

    // Replace DOI field
    result = result.replace(
      /^(\s*doi\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, _doi, post) => {
        const key = entry.match(/@\w+\{([\w:-]+),/)?.[1] || 'example';
        return pre + '10.1234/example.' + remapKey(key) + post;
      },
    );

    // Replace note field
    result = result.replace(
      /^(\s*note\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, _note, post) => {
        return pre + 'Accessed: January 1, 2026' + post;
      },
    );

    // Replace howpublished field
    result = result.replace(
      /^(\s*howpublished\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, _hp, post) => {
        return pre + 'Official Gazette' + post;
      },
    );

    // Replace pages field content (leave structure)
    result = result.replace(
      /^(\s*pages\s*=\s*\{)(.*?)(\},?\s*)$/m,
      (_m, pre, pages, post) => {
        // Keep numeric page ranges, just remap
        const numMatch = pages.match(/^[\d-]+$/);
        if (numMatch) return pre + pages + post;
        return pre + '100-120' + post;
      },
    );

    return result;
  }).join('');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const anonymizedMd = processMarkdown(originalMd);
const anonymizedBib = processBib(originalBib);

writeFileSync(join(fixtureDir, 'draft.md'), anonymizedMd);
writeFileSync(join(fixtureDir, 'draft.bib'), anonymizedBib);

// Verify: check citation keys match between MD and BIB
const mdKeys = new Set<string>();
// Only count keys inside citation brackets [@...] — not random @type{ in prose
for (const m of anonymizedMd.matchAll(/\[-?@([\w:-]+)/g)) {
  mdKeys.add(m[1]);
}
// Also get multi-key citations: [@key1; @key2]
for (const m of anonymizedMd.matchAll(/;\s*@([\w:-]+)/g)) {
  mdKeys.add(m[1]);
}

const bibKeys = new Set<string>();
for (const m of anonymizedBib.matchAll(/^@\w+\{([\w:-]+),/gm)) {
  bibKeys.add(m[1]);
}

const mdOnlyKeys = [...mdKeys].filter(k => !bibKeys.has(k));
const bibOnlyKeys = [...bibKeys].filter(k => !mdKeys.has(k));

console.log('Anonymization complete.');
console.log('  MD citation keys:', mdKeys.size);
console.log('  BIB entry keys:', bibKeys.size);
if (mdOnlyKeys.length > 0) {
  console.log('  WARNING: Keys in MD but not BIB:', mdOnlyKeys);
}
if (bibOnlyKeys.length > 0) {
  console.log('  Keys in BIB but not MD (unused):', bibOnlyKeys.length, 'entries');
}

// Structural verification
const headingCount = (anonymizedMd.match(/^#+\s/gm) || []).length;
const citationBrackets = (anonymizedMd.match(/\[@/g) || []).length;
const cmComments = (anonymizedMd.match(/\{>>/g) || []).length;
const cmHighlights = (anonymizedMd.match(/\{==/g) || []).length;
const tableRows = (anonymizedMd.match(/^\|/gm) || []).length;
const listItems = (anonymizedMd.match(/^\s*-\s/gm) || []).length;
const htmlComments = (anonymizedMd.match(/<!--/g) || []).length;

console.log('\nStructural features:');
console.log('  Headings:', headingCount);
console.log('  Citation brackets [@...]:', citationBrackets);
console.log('  CriticMarkup comments {>>...<<}:', cmComments);
console.log('  CriticMarkup highlights {==...==}:', cmHighlights);
console.log('  Table rows:', tableRows);
console.log('  List items:', listItems);
console.log('  HTML comments:', htmlComments);
console.log('\n  Output: test/fixtures/draft.md, test/fixtures/draft.bib');
