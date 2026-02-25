export interface BibEntryRange {
	key: string;
	entryStart: number;
	entryEnd: number;
	keyStart: number;
	keyEnd: number;
}

/**
 * Scan raw .bib text and return the byte ranges of each entry.
 * Uses brace-counting to find closing `}`, mirroring parseBibtex in bibtex-parser.ts.
 */
export function computeBibEntryRanges(text: string): BibEntryRange[] {
	const results: BibEntryRange[] = [];
	const entryRe = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
	let match: RegExpExecArray | null;

	while ((match = entryRe.exec(text)) !== null) {
		const entryStart = match.index;
		const keyStart = match.index + match[0].lastIndexOf(match[2]);
		const keyEnd = keyStart + match[2].length;
		const afterHeader = match.index + match[0].length;

		// Count braces to find closing }, starting at 1 for the opening {
		let braceCount = 1;
		let entryEnd = afterHeader;
		let inQuotes = false;

		for (let j = afterHeader; j < text.length && braceCount > 0; j++) {
			const char = text[j];
			// Only toggle quote state at brace depth 1 (top-level field values).
			// Inside {…}-delimited values, " is a literal character in BibTeX.
			if (char === '"' && braceCount === 1) {
				let backslashCount = 0;
				for (let k = j - 1; k >= 0 && text[k] === '\\'; k--) {
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
						entryEnd = j + 1; // include the closing }
						break;
					}
				}
			}
		}

		if (braceCount > 0) {
			continue; // malformed entry, skip
		}

		results.push({ key: match[2], entryStart, entryEnd, keyStart, keyEnd });
	}

	return results;
}
