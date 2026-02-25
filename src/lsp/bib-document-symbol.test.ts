import { describe, test, expect } from 'bun:test';
import { computeBibEntryRanges } from './bib-entry-ranges';

describe('computeBibEntryRanges', () => {
	test('single entry', () => {
		const text = '@article{smith2020,\n  author = {Smith},\n  year = {2020}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('smith2020');
		expect(ranges[0].entryStart).toBe(0);
		expect(ranges[0].entryEnd).toBe(text.length);
		expect(text.substring(ranges[0].keyStart, ranges[0].keyEnd)).toBe('smith2020');
	});

	test('multiple entries', () => {
		const text = [
			'@article{alpha2020,',
			'  author = {Alpha},',
			'  year = {2020}',
			'}',
			'',
			'@book{beta2021,',
			'  author = {Beta},',
			'  year = {2021}',
			'}',
		].join('\n');
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].key).toBe('alpha2020');
		expect(ranges[1].key).toBe('beta2021');

		// Each range should span only its own entry
		expect(text.substring(ranges[0].entryStart, ranges[0].entryEnd)).toContain('@article{alpha2020');
		expect(text.substring(ranges[1].entryStart, ranges[1].entryEnd)).toContain('@book{beta2021');
	});

	test('nested braces in field values', () => {
		const text = '@article{nested2020,\n  title = {{Nested {Braces} Here}},\n  year = {2020}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('nested2020');
		expect(ranges[0].entryEnd).toBe(text.length);
	});

	test('malformed entry with unclosed brace is skipped', () => {
		const text = '@article{broken2020,\n  author = {No close brace';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(0);
	});

	test('empty input', () => {
		const ranges = computeBibEntryRanges('');
		expect(ranges).toHaveLength(0);
	});

	test('entry with quoted values containing braces', () => {
		const text = '@article{quoted2020,\n  title = "A {Title} Here",\n  year = {2020}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('quoted2020');
	});

	test('key range is accurate', () => {
		const text = '@inproceedings{conf-key2021,\n  year = {2021}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('conf-key2021');
		expect(text.substring(ranges[0].keyStart, ranges[0].keyEnd)).toBe('conf-key2021');
	});

	test('key matching entry type name gets correct offset', () => {
		// @article{article,...} — key "article" also appears in the type name
		const text = '@article{article,\n  year = {2020}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('article');
		expect(text.substring(ranges[0].keyStart, ranges[0].keyEnd)).toBe('article');
		// Must point to the key after {, not to the type name
		expect(ranges[0].keyStart).toBe(text.indexOf('{') + 1);
	});

	test('literal quotes inside brace-delimited field values', () => {
		// " inside {…} is a plain character in BibTeX, should not confuse brace counting
		const text = '@article{quotes2020,\n  title = {say "hi" and "bye"},\n  year = {2020}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('quotes2020');
		expect(ranges[0].entryEnd).toBe(text.length);
	});

	test('odd number of quotes inside brace-delimited field', () => {
		// Three literal " chars inside {…} — must not corrupt brace counting
		const text = '@article{oddquote2020,\n  title = {say "hi" there"},\n  year = {2020}\n}';
		const ranges = computeBibEntryRanges(text);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].key).toBe('oddquote2020');
		expect(ranges[0].entryEnd).toBe(text.length);
	});
});
