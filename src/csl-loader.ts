import { readFileSync, existsSync } from 'fs';
import { join, isAbsolute, dirname } from 'path';

/**
 * Resolve the bundled CSL directory.  Works both when running from source
 * (`src/csl-loader.ts` → `src/csl-styles/`) and from the compiled output
 * (`out/csl-loader.js` → `src/csl-styles/` relative to project root).
 */
function resolveDir(subdir: string): string {
  // When running via bun test, __dirname is the src/ folder
  const fromSrc = join(__dirname, subdir);
  if (existsSync(fromSrc)) return fromSrc;
  // When running compiled (out/csl-loader.js), go up to project root
  const fromOut = join(dirname(__dirname), 'src', subdir);
  if (existsSync(fromOut)) return fromOut;
  return fromSrc; // fallback
}

const BUNDLED_STYLES_DIR = resolveDir('csl-styles');
const BUNDLED_LOCALES_DIR = resolveDir('csl-locales');

// Cache loaded styles and locales in memory
const styleCache = new Map<string, string>();
const localeCache = new Map<string, string>();

/**
 * List of bundled CSL style short names.
 */
export const BUNDLED_STYLES = [
  'apa',
  'chicago-author-date',
  'chicago-fullnote-bibliography',
  'chicago-note-bibliography',
  'modern-language-association',
  'ieee',
  'nature',
  'cell',
  'science',
  'american-medical-association',
  'american-chemical-society',
  'american-political-science-association',
  'american-sociological-association',
  'vancouver',
  'harvard-cite-them-right',
];

/**
 * Load a CSL style XML string by short name or file path.
 * - If `name` matches a bundled style, loads from the bundled directory.
 * - Otherwise, treats `name` as a file path and reads from disk.
 */
export function loadStyle(name: string): string {
  const cached = styleCache.get(name);
  if (cached) return cached;

  let xml: string;
  if (BUNDLED_STYLES.includes(name)) {
    xml = readFileSync(join(BUNDLED_STYLES_DIR, name + '.csl'), 'utf-8');
  } else if (isAbsolute(name) || name.endsWith('.csl')) {
    xml = readFileSync(name, 'utf-8');
  } else {
    // Try as bundled anyway (in case list is out of date)
    try {
      xml = readFileSync(join(BUNDLED_STYLES_DIR, name + '.csl'), 'utf-8');
    } catch {
      throw new Error(`CSL style not found: ${name}. Bundled styles: ${BUNDLED_STYLES.join(', ')}`);
    }
  }

  styleCache.set(name, xml);
  return xml;
}

/**
 * Load a CSL locale XML string by language tag (e.g., "en-US").
 * Falls back to en-US if the requested locale is not available.
 */
export function loadLocale(lang: string): string {
  const cached = localeCache.get(lang);
  if (cached) return cached;

  const filename = `locales-${lang}.xml`;
  try {
    const xml = readFileSync(join(BUNDLED_LOCALES_DIR, filename), 'utf-8');
    localeCache.set(lang, xml);
    return xml;
  } catch {
    // Fall back to en-US
    if (lang !== 'en-US') {
      return loadLocale('en-US');
    }
    throw new Error(`CSL locale not found: ${lang}`);
  }
}
