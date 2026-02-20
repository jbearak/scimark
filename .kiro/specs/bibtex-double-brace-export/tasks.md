# BibTeX Double-Brace Export Bugfix Tasks

## Tasks

- [x] 1. Write exploratory unit tests (unfixed code — expected to fail)
  - [x] 1.1 In `src/bibtex-parser.test.ts`, add a `describe('double-brace bug exploration')` block with tests that parse double-braced fields and assert the plain value (no braces). These tests MUST fail on the current code to confirm the bug.
    - Test: `title = {{My Title}}` → stored value is `My Title`
    - Test: `author = {{World Health Organization}}` → stored value is `World Health Organization`
    - Test: `title = {{Über die Natur}}` → stored value is `Über die Natur`
  - [x] 1.2 Run `bun test src/bibtex-parser.test.ts` and confirm the new tests fail (counterexamples surfaced). Note the actual stored values in a comment.

- [x] 2. Add `stripOuterBraces` helper to `src/bibtex-parser.ts`
  - [x] 2.1 Implement `stripOuterBraces(s: string): string` as a module-level pure function. It must scan left-to-right with a depth counter: if the opening `{` at index 0 is matched by the closing `}` at the last index (depth first reaches 0 at the last character), return `s.slice(1, -1)`; otherwise return `s` unchanged.
  - [x] 2.2 Apply `stripOuterBraces` to `braceValue` inside the `parseBibtex` field-parsing loop, before passing to `unescapeBibtex`. Quote-delimited and bare values must not be affected.

- [x] 3. Update the existing test that asserts the old (buggy) behaviour
  - [x] 3.1 In `src/bibtex-parser.test.ts`, update the `'handles nested braces in title'` test (currently `@article{key1, title = {{Nested {Braces} Title}}}` → `'{Nested {Braces} Title}'`) to assert the correct post-fix value: `'Nested {Braces} Title'` (inner braces stripped, partial inner group preserved).

- [x] 4. Write fix-checking unit tests
  - [x] 4.1 Move or promote the exploratory tests from task 1.1 into a permanent `describe('double-brace fix')` block and verify they now pass.
  - [x] 4.2 Add edge-case unit tests:
    - `{{}}` (empty double-brace) → `''`
    - `{{a}}` → `'a'`
    - `{a}` (single-brace) → `'a'` (unchanged)
    - `{a}{b}` (two separate groups as braceValue) → `'{a}{b}'` (not stripped — outer pair does not wrap the whole string)
    - `{The {RNA} Paradox}` → `'The {RNA} Paradox'` (partial inner group, not stripped)
    - `{Caf\'{e}}` → `'Café'` (LaTeX escape still works)

- [x] 5. Write property-based tests in `src/bibtex-parser.property.test.ts`
  - [x] 5.1 Property 1 (Fault Condition): For any `fc.string()` value `s` that contains no unmatched braces, parsing `@article{k, title = {{` + s + `}}}` yields `s` as the stored title. Use `fc.string({ minLength: 0, maxLength: 40 }).filter(s => !s.includes('{') && !s.includes('}'))`.
  - [x] 5.2 Property 2 (Preservation): For any `fc.string()` value `s` that does not start with `{` or end with `}`, parsing `@article{k, title = {` + s + `}}` yields `s` unchanged (single-brace path unaffected). Use the same filter as the existing round-trip test.
  - [x] 5.3 Verify the existing `'Property 2: BibTeX parser round-trip'` test still passes after the fix.

- [x] 6. Run the full test suite and confirm no regressions
  - [x] 6.1 Run `bun test src/bibtex-parser.test.ts src/bibtex-parser.property.test.ts` and confirm all tests pass.
  - [x] 6.2 Run `bun test` (full suite) and confirm no other tests are broken.
