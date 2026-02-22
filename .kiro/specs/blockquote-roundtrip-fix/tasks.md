# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** — Blockquote Roundtrip Fidelity
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Use fast-check with concrete failing cases scoped to the known bug triggers
  - Create `src/blockquote-roundtrip-bugfix.property.test.ts`
  - Use `convertMdToDocx` from `src/md-to-docx.ts` and `convertDocx` from `src/converter.ts`
  - Use fast-check with short bounded generators per AGENTS.md guidance
  - Generate markdown inputs satisfying `isBugCondition`: two or more blockquote/alert groups with varying inter-block gap counts (0, 1, 2, 3 blank lines), mixed types (plain + alert, different alert types), and alert prefix content
  - Test cases to include:
    - Two alerts separated by two blank lines → assert two blank lines preserved after roundtrip
    - Two alerts separated by zero blank lines → assert zero blank lines preserved
    - Plain blockquote adjacent to alert blockquote → assert both groups remain distinct and separated correctly
    - Alert body text contains no residual glyph characters (※, ◈, ‼, ▲, ⛒) or title words (Note, Tip, Important, Warning, Caution) leaking into body
    - Asymmetric gap patterns (blank line above but not below, or vice versa) → assert asymmetry preserved
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., gap counts differ, glyph prefixes leak, groups merge)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Non-Buggy Blockquote and Non-Blockquote Content Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create preservation tests in `src/blockquote-roundtrip-bugfix.property.test.ts` (same file as task 1)
  - Use fast-check with short bounded generators per AGENTS.md guidance
  - Observe behavior on UNFIXED code for non-buggy inputs (inputs where `isBugCondition` returns false):
    - Observe: single plain blockquote `> Hello.` roundtrips to same output
    - Observe: single alert `> [!NOTE]\n> Info.` roundtrips to same output
    - Observe: headings, paragraphs, lists, code blocks roundtrip identically
    - Observe: nested blockquotes `> > Nested.` preserve nesting level
    - Observe: intra-block blank lines within a single blockquote are preserved
  - Write property-based tests:
    - For all single blockquotes (plain or alert), roundtrip output matches input blockquote content
    - For all non-blockquote markdown elements (headings, paragraphs, lists, code blocks), roundtrip preserves content
    - For nested blockquotes, nesting level is preserved
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix blockquote roundtrip fidelity

  - [x] 3.1 Encode inter-block gap metadata in md→docx conversion
    - In `src/md-to-docx.ts`, after `annotateBlockquoteBoundaries`, scan the original markdown to compute the exact blank-line count between each pair of consecutive blockquote groups
    - Store gap counts as a map keyed by group index
    - Serialize the gap map as custom XML properties in the docx output (similar to `codeBlockLanguageProps` / `footnoteIdMappingProps`)
    - Annotate blockquote tokens with `blockquoteGroupIndex` so the gap map can be correlated during docx→md conversion
    - _Bug_Condition: isBugCondition(input) where length(extractBlockquoteGroups(input)) >= 2_
    - _Expected_Behavior: gap metadata accurately reflects original blank-line counts_
    - _Preservation: Non-blockquote content and single blockquotes unaffected_
    - _Requirements: 2.1, 2.5, 2.6, 2.7_

  - [x] 3.2 Detect and skip spacer paragraphs in docx→md conversion
    - In `src/converter.ts` `extractDocumentContent`, detect spacer paragraphs by signature: no `pStyle`, `w:spacing` with `w:line="1"` and `w:lineRule="exact"`, and `w:pBdr` with `w:left` border
    - Skip spacer paragraphs entirely — do not push a `para` ContentItem
    - _Bug_Condition: spacer paragraphs from alertFirst/alertLast injecting extra blank lines_
    - _Expected_Behavior: spacer paragraphs silently skipped, no extra blank lines emitted_
    - _Preservation: Non-spacer paragraphs processed normally_
    - _Requirements: 2.4_

  - [x] 3.3 Read gap metadata and reconstruct inter-block whitespace in docx→md conversion
    - In `src/converter.ts` `convertDocx`, extract the blockquote gap map from custom XML properties
    - In `buildMarkdown`, when transitioning between blockquote groups (detected by alertType change, blockquoteLevel change, or blockquote→non-blockquote transition), look up the gap count from the metadata map
    - Emit the correct number of `\n` characters instead of hardcoded `\n\n`
    - _Bug_Condition: inter-block gap counts lost during roundtrip_
    - _Expected_Behavior: exact blank-line counts from original preserved in output_
    - _Preservation: Non-blockquote whitespace unchanged_
    - _Requirements: 2.1, 2.3, 2.5, 2.6, 2.7_

  - [x] 3.4 Harden `stripAlertLeadPrefix` and fix blockquote group boundary detection
    - In `src/converter.ts`, extend `stripAlertLeadPrefix` regex patterns to match the exact format emitted by `generateParagraph`: `GLYPH + ' ' + Title + ' '` (plain, no bold, no colon, optional trailing space)
    - Fix `buildMarkdown` blockquote group boundary detection: handle transitions between plain blockquotes and alert blockquotes at the same level, and transitions between different alert types
    - _Bug_Condition: alert glyph/title prefix leaks into body text; plain and alert blockquotes merge_
    - _Expected_Behavior: clean alert markers, correct group separation_
    - _Preservation: Existing alert formatting for single alerts unchanged_
    - _Requirements: 2.2, 2.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Blockquote Roundtrip Fidelity
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** — Non-Buggy Blockquote and Non-Blockquote Content Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `bun test` to ensure all tests pass (existing + new)
  - Ensure no regressions in existing roundtrip, citation, author, and other test suites
  - Ask the user if questions arise
