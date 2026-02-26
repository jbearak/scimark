// --- Implementation notes ---
// - Verbatim fields: DOI, URL, ISBN, ISSN must not be LaTeX-escaped (see VERBATIM_BIBTEX_FIELDS)
// - Entry scanning: count consecutive preceding backslashes before `"` to detect quote-state correctly
// - Scanner literals: compare input[k] against '\\' (one char), not '\\\\' (two-char runtime string)

export interface BibtexEntry {
  type: string;
  key: string;
  fields: Map<string, string>;
  zoteroKey?: string;
  zoteroUri?: string;
}

/** BibTeX fields whose values are verbatim identifiers (URLs, DOIs, etc.)
 *  that must not be LaTeX-escaped. */
const VERBATIM_BIBTEX_FIELDS: ReadonlySet<string> = new Set([
  'doi', 'url', 'isbn', 'issn',
]);

/** Strip a single outer brace pair if it wraps the entire string.
 *  Scans left-to-right with a depth counter starting at 1 (after the opening '{').
 *  If depth first reaches 0 at the last character, the outer pair wraps the whole
 *  string and is stripped. Otherwise the string is returned unchanged.
 *  Examples:
 *    '{My Title}'        → 'My Title'   (single wrapping pair — strip)
 *    '{The {RNA} Paradox}' → 'The {RNA} Paradox' (single wrapping pair — strip, inner group preserved)
 *    '{a}{b}'            → '{a}{b}'     (two separate groups — keep)
 *    '{}'                → ''           (empty pair — strip)
 */
export function stripOuterBraces(s: string): string {
  if (s.length < 2 || s[0] !== '{' || s[s.length - 1] !== '}') {
    return s;
  }
  let depth = 1;
  for (let i = 1; i < s.length - 1; i++) {
    if (s[i] === '{') {
      depth++;
    } else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        // Outer '{' closed before the last character — not a single wrapping pair
        return s;
      }
    }
  }
  // depth === 1 here; the last '}' closes it → single wrapping pair
  return s.slice(1, -1);
}

function escapeBibtex(s: string): string {
  // Unescape first to avoid double-escaping on round-trips (idempotent)
  return unescapeBibtex(s).replace(/([&%$#_{}~^\\])/g, '\\$1');
}

function unescapeBibtex(s: string): string {
  return s.replace(/\\([&%$#_{}~^\\])/g, '$1');
}

export function parseBibtex(input: string): Map<string, BibtexEntry> {
  const entries = new Map<string, BibtexEntry>();

  // Find entry boundaries more carefully
  const entryMatches = [...input.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)];

  // Track the end of the last successfully parsed entry so we can skip
  // spurious @type{key, matches inside field values (e.g. note fields
  // that reference other entries).
  let lastEntryEnd = 0;

  for (let i = 0; i < entryMatches.length; i++) {
    try {
      const match = entryMatches[i];

      // Skip matches that fall inside a previously parsed entry's body
      if (match.index! < lastEntryEnd) {
        continue;
      }

      const [, type, key] = match;
      const startPos = match.index! + match[0].length;

      // Find the end of this entry by counting braces
      let braceCount = 1;
      let endPos = startPos;
      let inQuotes = false;

      for (let j = startPos; j < input.length && braceCount > 0; j++) {
        const char = input[j];

        // Only toggle quote state at brace depth 1 (top-level field values).
        // Inside {…}-delimited values, " is a literal character in BibTeX.
        if (char === '\"' && braceCount === 1) {
          let backslashCount = 0;
          const backslash = '\\';
          for (let k = j - 1; k >= 0 && input[k] === backslash; k--) {
            backslashCount++;
          }
          if (backslashCount % 2 === 0) {
            inQuotes = !inQuotes;
          }
        } else if (!inQuotes) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPos = j;
              break;
            }
          }
        }
      }

      // Advance past this entry's body regardless of whether it parsed
      // successfully, so subsequent matches inside it are skipped.
      lastEntryEnd = endPos + 1;

      // Skip if we couldn't find a proper closing brace
      if (braceCount > 0) {
        continue;
      }
      
      const fieldsStr = input.slice(startPos, endPos);
      const fields = new Map<string, string>();
      
      // Parse fields more carefully
      // NOTE: This regex handles nested braces only up to a small fixed depth.
      // If we need arbitrary nesting, replace with a balanced-brace field parser.
      const fieldRegex = /(\w+(?:-\w+)*)\s*=\s*(?:\{((?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})*)\}|"([^"]*)"|(\w+))/g;
      // author/editor use inner {Name} braces as a semantic signal for
      // institutional/literal names (Req 2.3), so do NOT strip outer braces
      // for those fields — only strip for non-name fields (title, journal, etc.)
      const AUTHOR_FIELDS = new Set(['author', 'editor']);
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
        const [, fieldName, braceValue, quoteValue, bareValue] = fieldMatch;
        const lowerField = fieldName.toLowerCase();
        const value = (braceValue !== undefined
          ? unescapeBibtex(AUTHOR_FIELDS.has(lowerField) ? braceValue : stripOuterBraces(braceValue))
          : unescapeBibtex(quoteValue ?? bareValue ?? ''));
        fields.set(lowerField, value);
      }
      
      const entry: BibtexEntry = {
        type: type.toLowerCase(),
        key,
        fields,
        zoteroKey: fields.get('zotero-key'),
        zoteroUri: fields.get('zotero-uri')
      };
      
      entries.set(key, entry);
    } catch {
      // Skip malformed entries
    }
  }
  
  return entries;
}

export function serializeBibtex(entries: Map<string, BibtexEntry>): string {
  const result: string[] = [];

  for (const entry of entries.values()) {
    const lines = [`@${entry.type}{${entry.key},`];

    for (const [fieldName, value] of entry.fields) {
      let escapedValue = value;

      // Don't escape verbatim identifier fields or zotero-key
      if (fieldName !== 'zotero-key' && !VERBATIM_BIBTEX_FIELDS.has(fieldName)) {
        escapedValue = escapeBibtex(value);
      }

      lines.push(`  ${fieldName} = {${escapedValue}},`);
    }

    // Remove trailing comma from last field
    if (lines.length > 1) {
      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
    }

    lines.push('}');
    result.push(lines.join('\n'));
  }

  return result.join('\n\n');
}

// ---------------------------------------------------------------------------
// Amend-only .bib merging helpers
// ---------------------------------------------------------------------------

/** Extract raw entry texts from BibTeX input, preserving original formatting.
 *  Returns Map<citationKey, rawEntryText> in document order.
 *  Uses inline brace-counting (same approach as parseBibtex) to avoid a
 *  core→LSP dependency on bib-entry-ranges. */
export function extractRawEntries(input: string): Map<string, string> {
  const entries = new Map<string, string>();
  const entryMatches = [...input.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)];
  let lastEntryEnd = 0;

  for (const match of entryMatches) {
    if (match.index! < lastEntryEnd) continue;

    const key = match[2];
    const entryStart = match.index!;
    const afterHeader = entryStart + match[0].length;

    let braceCount = 1;
    let endPos = afterHeader;
    let inQuotes = false;

    for (let j = afterHeader; j < input.length && braceCount > 0; j++) {
      const char = input[j];
      if (char === '"' && braceCount === 1) {
        let backslashCount = 0;
        for (let k = j - 1; k >= 0 && input[k] === '\\'; k--) backslashCount++;
        if (backslashCount % 2 === 0) inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) { endPos = j; break; }
        }
      }
    }

    lastEntryEnd = endPos + 1;
    if (braceCount > 0) continue;

    entries.set(key, input.slice(entryStart, endPos + 1));
  }

  return entries;
}

/** Extract a single field's raw text from an entry string.
 *  Returns the full line including indentation and trailing comma, e.g.
 *  `  title = {{My Title}},`  — or null if the field is not found. */
export function extractRawField(rawEntry: string, fieldName: string): string | null {
  const regex = new RegExp('(^|\\n)([ \\t]*' + fieldName + '\\s*=\\s*)', 'i');
  const match = regex.exec(rawEntry);
  if (!match) return null;

  const lineStart = match.index + (match[1] === '\n' ? 1 : 0);
  const valueStart = match.index + match[0].length;
  const firstChar = rawEntry[valueStart];

  let valueEnd: number;
  if (firstChar === '{') {
    let depth = 1;
    let pos = valueStart + 1;
    while (pos < rawEntry.length && depth > 0) {
      if (rawEntry[pos] === '{') depth++;
      else if (rawEntry[pos] === '}') depth--;
      pos++;
    }
    valueEnd = pos;
  } else if (firstChar === '"') {
    let pos = valueStart + 1;
    while (pos < rawEntry.length) {
      if (rawEntry[pos] === '\\') { pos += 2; continue; }
      if (rawEntry[pos] === '"') { pos++; break; }
      pos++;
    }
    valueEnd = pos;
  } else {
    const bareMatch = rawEntry.slice(valueStart).match(/^\w+/);
    valueEnd = valueStart + (bareMatch ? bareMatch[0].length : 0);
  }

  // Include trailing comma if present
  let end = valueEnd;
  if (end < rawEntry.length && rawEntry[end] === ',') end++;

  return rawEntry.slice(lineStart, end);
}

/** Splice additional raw field lines into a produced entry's raw text,
 *  inserting them before the closing `}`. Ensures a trailing comma on the
 *  last existing field so the result remains valid BibTeX. */
export function spliceFieldsIntoEntry(producedRaw: string, fieldTexts: string[]): string {
  if (fieldTexts.length === 0) return producedRaw;

  const closingPos = producedRaw.lastIndexOf('}');
  if (closingPos === -1) return producedRaw;

  let before = producedRaw.slice(0, closingPos);
  const trimmed = before.trimEnd();

  // Ensure trailing comma on last produced field
  if (trimmed.length > 0 && !trimmed.endsWith(',') && !trimmed.endsWith('{')) {
    before = trimmed + ',\n';
  } else if (!before.endsWith('\n')) {
    before += '\n';
  }

  return before + fieldTexts.join('\n') + '\n}';
}

/** Merge an existing .bib (from disk) with a produced .bib (from conversion).
 *  - Existing-only entries are preserved verbatim.
 *  - Entries in both: produced text wins, but existing-only fields are spliced in.
 *  - Produced-only entries are appended at the end.
 *  This is a post-processing step that runs after any restoration layer. */
export function mergeBibtex(existing: string, produced: string): string {
  if (!existing || existing.trim().length === 0) return produced;
  if (!produced || produced.trim().length === 0) return existing;

  const existingParsed = parseBibtex(existing);
  const producedParsed = parseBibtex(produced);
  const existingRaw = extractRawEntries(existing);
  const producedRaw = extractRawEntries(produced);

  const result: string[] = [];
  const emittedKeys = new Set<string>();

  // Iterate existing entries in their original order
  for (const [key, existingEntry] of existingParsed) {
    emittedKeys.add(key);

    const producedEntry = producedParsed.get(key);
    if (!producedEntry) {
      // Only in existing → emit raw text verbatim
      const raw = existingRaw.get(key);
      if (raw) result.push(raw);
      continue;
    }

    // In both — find fields in existing but not in produced
    const missingFields: string[] = [];
    for (const fieldName of existingEntry.fields.keys()) {
      if (!producedEntry.fields.has(fieldName)) {
        missingFields.push(fieldName);
      }
    }

    const producedText = producedRaw.get(key);
    if (!producedText) {
      // Defensive fallback: emit existing raw text
      const raw = existingRaw.get(key);
      if (raw) result.push(raw);
      continue;
    }

    if (missingFields.length === 0) {
      // No missing fields → emit produced raw text (fields may have been updated)
      result.push(producedText);
    } else {
      // Splice missing fields from existing into produced
      const existingText = existingRaw.get(key);
      const fieldTexts: string[] = [];

      for (const fName of missingFields) {
        if (existingText) {
          const rawField = extractRawField(existingText, fName);
          if (rawField) {
            fieldTexts.push(rawField);
            continue;
          }
        }
        // Fallback: re-serialize with escapeBibtex + single braces
        const value = existingEntry.fields.get(fName) ?? '';
        const escapedValue = VERBATIM_BIBTEX_FIELDS.has(fName) || fName === 'zotero-key'
          ? value
          : escapeBibtex(value);
        fieldTexts.push('  ' + fName + ' = {' + escapedValue + '},');
      }

      result.push(spliceFieldsIntoEntry(producedText, fieldTexts));
    }
  }

  // Append entries only in produced
  for (const key of producedParsed.keys()) {
    if (!emittedKeys.has(key)) {
      const raw = producedRaw.get(key);
      if (raw) result.push(raw);
    }
  }

  return result.join('\n\n');
}
