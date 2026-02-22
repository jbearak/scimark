# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Whitespace-Separated Comment Association
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: CriticMarkup element followed by whitespace-only characters then a non-empty, non-ID comment
  - Add test in `src/preview/scimark-plugin.test.ts`
  - Use `fast-check` with short bounded generators (per AGENTS.md) to generate: random CriticMarkup element types (highlight, addition, deletion, substitution, format highlight), random whitespace strings (spaces/tabs, 1-5 chars), and random comment text
  - Set up markdown-it with `manuscriptMarkdownPlugin`, render input like `{==text==}<whitespace>{>>comment<<}`, and assert `data-comment` attribute appears on the element's open tag
  - The bug condition: `newChildren` has a whitespace-only text token immediately before the comment, preceded by a CriticMarkup close token
  - Expected behavior assertion: rendered HTML contains `data-comment="<commentText>"` on the element tag (e.g., `<mark`, `<ins`, `<del`, `<span`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, comment renders as standalone indicator instead of associating)
  - Document counterexamples found: `data-comment` attribute absent, comment renders as `<span class="scimark-comment-indicator">` instead
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Whitespace-Separated Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Add test in `src/preview/scimark-plugin.test.ts`
  - Use `fast-check` with short bounded generators (per AGENTS.md)
  - Observe on UNFIXED code: `{==text==}{>>comment<<}` (direct adjacency) associates correctly with `data-comment`
  - Observe on UNFIXED code: `{==text==}some text{>>comment<<}` (non-whitespace separation) renders comment as standalone indicator
  - Observe on UNFIXED code: standalone `{>>comment<<}` with no preceding element renders as indicator
  - Observe on UNFIXED code: `{>><<}` (empty comment) is removed silently
  - Observe on UNFIXED code: `{==text==}{>>a<<}{>>b<<}` (multiple comments) concatenates with newline in `data-comment`
  - Write property-based tests capturing these observed behaviors:
    - Property: for all directly-adjacent element+comment pairs, `data-comment` is set on the element tag
    - Property: for all comments separated by non-whitespace text from a preceding element, comment renders as standalone indicator
    - Property: for all standalone comments (no preceding element), comment renders as indicator
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for whitespace-separated comment association

  - [x] 3.1 Implement the fix in `src/preview/scimark-plugin.ts`
    - In `associateCommentsRule` Pass 3, replace the single-token lookback with a whitespace-skipping lookback
    - Before the `isCriticMarkupClose` check, scan backwards through `newChildren` to skip tokens where `type === 'text'` and `content` matches `/^\s+$/`
    - Use the first non-whitespace token as the candidate for `isCriticMarkupClose`
    - When calling `findMatchingOpenIdx`, pass the index of the CriticMarkup close token found by the lookback (NOT `newChildren.length - 1`)
    - Preserve whitespace tokens in `newChildren` — do not remove them, only the association logic changes
    - No changes to Pass 1 or Pass 2
    - _Bug_Condition: isBugCondition(input) where lastToken is whitespace-only text AND tokenBeforeWhitespace is CriticMarkup close AND comment is non-empty and non-ID_
    - _Expected_Behavior: data-comment set on matching open token, whitespace tokens preserved in output_
    - _Preservation: Direct adjacency, standalone comments, non-whitespace separation, ID-based comments, empty comments, multiple comment concatenation all unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Whitespace-Separated Comment Association
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Whitespace-Separated Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite with `bun test`
  - Ensure all tests pass, ask the user if questions arise
