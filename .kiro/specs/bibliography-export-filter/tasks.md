# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Bibliography Includes Uncited Entries
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: create a citeproc engine with N bib entries (N >= 2), cite a strict subset (or none), then assert `renderBibliography()` returns only cited entries
  - Create test file `src/bibliography-filter.property.test.ts`
  - Use `bun:test` and `fast-check` with short bounded generators (per AGENTS.md)
  - Build a citeproc engine via `buildEngine()` with a Map of 2-4 BibtexEntry items, a valid CSL style XML, and locale `en-US`
  - Generate a random strict subset of keys (including empty set) as `citedKeys` — this is the bug condition (`isBugCondition(bibEntries, citedKeys)` returns true)
  - Call `renderBibliography(engine)` and assert: `bib.entries.length === citedKeys.size` and every entry corresponds to a cited key
  - Run test on UNFIXED code with `bun test src/bibliography-filter.property.test.ts`
  - **EXPECTED OUTCOME**: Test FAILS (bibliography returns all entries, not just cited ones — this proves the bug exists)
  - Document counterexamples found (e.g., "3 bib entries, 1 cited, bibliography has 3 entries instead of 1")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Full-Citation Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code: when all bib entries are cited (isBugCondition returns false), `renderBibliography()` returns entries for all keys and `renderCitationText()` produces correct formatted output
  - Add preservation tests to `src/bibliography-filter.property.test.ts`
  - Use `fast-check` with short bounded generators to generate random bib entry maps (1-3 entries) where ALL keys are cited
  - Property: for all (bibEntries, citedKeys) where citedKeys equals the full set of bibEntries keys, `renderBibliography(engine).entries.length === bibEntries.size`
  - Property: for all such inputs, `renderCitationText(engine, keys)` produces non-empty formatted text
  - Verify tests pass on UNFIXED code with `bun test src/bibliography-filter.property.test.ts`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix bibliography export to include only cited entries

  - [x] 3.1 Remove `updateItems()` call from `buildEngine()` in `src/md-to-docx-citations.ts`
    - Delete the line `engine.updateItems([...items.keys()])` from `buildEngine()`
    - The engine is returned with all items available via `retrieveItem()` but none registered for bibliography output
    - _Bug_Condition: isBugCondition(bibEntries, citedKeys) where citedKeys is a strict subset of bibEntries.keys() OR citedKeys is empty_
    - _Expected_Behavior: makeBibliography() returns only entries whose keys were actually cited in the markdown_
    - _Preservation: retrieveItem() must still resolve any key from the .bib file; citation rendering unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Add `citedKeys: Set<string>` field to `DocxGenState` in `src/md-to-docx.ts`
    - Add `citedKeys: Set<string>` to the `DocxGenState` interface
    - Initialize it as `new Set<string>()` where state is created in `convertMdToDocx()`
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Track cited keys during citation processing in `generateRuns()`
    - In the `run.type === 'citation'` branch of `generateRuns()`, after `generateCitation()` is called, add each key from `run.keys` (that exists in `bibEntries`) to `state.citedKeys`
    - This collects the exact set of keys referenced in the markdown during document generation
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Call `updateItems()` with only cited keys before bibliography rendering in `generateDocumentXml()`
    - In `generateDocumentXml()`, just before the `if (citeprocEngine)` block that calls `generateBibliographyXml()`, insert: `citeprocEngine.updateItems([...state.citedKeys])`
    - This registers only the actually-cited keys with citeproc so `makeBibliography()` outputs only cited entries
    - _Bug_Condition: isBugCondition(bibEntries, citedKeys) — citedKeys strict subset or empty_
    - _Expected_Behavior: bibliography contains exactly the cited entries, nothing more_
    - _Preservation: when all entries are cited, output is identical to before_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Bibliography Contains Only Cited Entries
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `bun test src/bibliography-filter.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — bibliography now contains only cited entries)
    - _Requirements: 2.1, 2.2_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Full-Citation Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run `bun test src/bibliography-filter.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — full-citation scenarios produce identical output)
    - Confirm all preservation tests still pass after fix

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `bun test` to ensure all existing tests still pass
  - Run `bun test src/bibliography-filter.property.test.ts` to confirm both fault condition and preservation properties pass
  - Ensure no regressions in citation rendering, field codes, locators, missing-key warnings, or CSL formatting
  - Ask the user if questions arise
