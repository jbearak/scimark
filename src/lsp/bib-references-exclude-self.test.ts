import { describe, test, expect } from 'bun:test';

/**
 * Tests for the Find References self-exclusion logic.
 *
 * The actual condition in server.ts is:
 *   if (params.context.includeDeclaration && symbol.source !== 'bib')
 *
 * We test the conditional logic in isolation to verify:
 * - When source is 'bib', the declaration is never added (even if includeDeclaration is true)
 * - When source is 'markdown', the declaration is added when includeDeclaration is true
 */

interface MockSymbol {
	source: 'markdown' | 'bib';
}

interface MockContext {
	includeDeclaration: boolean;
}

function shouldAddDeclaration(context: MockContext, symbol: MockSymbol): boolean {
	return context.includeDeclaration && symbol.source !== 'bib';
}

describe('Find References self-exclusion', () => {
	test('excludes declaration when source is bib and includeDeclaration is true', () => {
		expect(shouldAddDeclaration(
			{ includeDeclaration: true },
			{ source: 'bib' },
		)).toBe(false);
	});

	test('excludes declaration when source is bib and includeDeclaration is false', () => {
		expect(shouldAddDeclaration(
			{ includeDeclaration: false },
			{ source: 'bib' },
		)).toBe(false);
	});

	test('includes declaration when source is markdown and includeDeclaration is true', () => {
		expect(shouldAddDeclaration(
			{ includeDeclaration: true },
			{ source: 'markdown' },
		)).toBe(true);
	});

	test('excludes declaration when source is markdown and includeDeclaration is false', () => {
		expect(shouldAddDeclaration(
			{ includeDeclaration: false },
			{ source: 'markdown' },
		)).toBe(false);
	});
});
