# Blockquote Roundtrip Fix — Bugfix Design

## Overview

The md→docx→md roundtrip pipeline loses inter-blockquote whitespace fidelity and leaks alert glyph/title prefixes. The root cause is twofold: (1) `md-to-docx.ts` does not encode the exact blank-line count between blockquote groups into the docx XML, so `converter.ts` has no signal to reconstruct it; and (2) `converter.ts`'s `stripAlertLeadPrefix` heuristic does not always match the exact prefix format that `generateParagraph` emits. The fix encodes inter-block gap metadata into the docx (via a custom XML property map), teaches the docx→md converter to consume that metadata, correctly identifies and skips spacer paragraphs, and hardens the alert prefix stripping logic.

## Glossary

- **Bug_Condition (C)**: A markdown source containing two or more blockquote/alert groups where the exact blank-line count between groups, the alert type boundaries, or the alert glyph prefix matters for roundtrip fidelity.
- **Property (P)**: After md→docx→md, the output markdown is byte-for-byte identical to the input for all blockquote/alert regions and their surrounding whitespace.
- **Preservation**: All non-blockquote content (headings, paragraphs, lists, code blocks, tables, footnotes, single blockquotes, nested blockquotes, intra-block blank lines) must roundtrip identically to current behavior.
- **`generateParagraph`**: Function in `src/md-to-docx.ts` that serializes an `MdToken` to docx XML, including spacer paragraphs for `alertFirst`/`alertLast`.
- **`buildMarkdown`**: Function in `src/converter.ts` that reconstructs markdown from `ContentItem[]` extracted from docx XML.
- **`stripAlertLeadPrefix`**: Function in `src/converter.ts` that removes the glyph+title prefix (e.g., "※ Note") from the first text run of an alert paragraph during docx→md conversion.
- **Spacer paragraph**: An exact-height empty `<w:p>` with inline left border and no `pStyle`, generated before `alertFirst` and after `alertLast` tokens for visual padding.
- **Inter-block gap**: The number of blank lines (0, 1, 2, …) between two consecutive blockquote/alert groups in the original markdown source.

## Bug Details

### Fault Condition

The bug manifests when a markdown file containing two or more blockquote/alert groups is roundtripped through md→docx→md. The pipeline either (a) loses the exact blank-line count between groups, (b) leaks glyph/title prefixes into body text, (c) merges distinct blockquote groups, or (d) injects spurious blank lines from spacer paragraphs.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type MarkdownSource
  OUTPUT: boolean

  groups := extractBlockquoteGroups(input)
  IF length(groups) < 2 THEN RETURN false

  FOR i FROM 0 TO length(groups) - 2 DO
    gap := blankLinesBetween(groups[i], groups[i+1])
    IF gap != 1 THEN RETURN true          -- non-standard gap count
    IF groups[i].type != groups[i+1].type THEN RETURN true  -- mixed types
  END FOR

  FOR each group IN groups DO
    IF group.isAlert THEN RETURN true      -- alert prefix stripping needed
  END FOR

  RETURN false
END FUNCTION
```

### Examples

- **Two alerts, two blank lines between**: Input has `> [!NOTE]\n> A.\n\n\n> [!TIP]\n> B.` — after roundtrip, the two blank lines collapse to one because the docx has no gap metadata.
- **Zero blank lines between alerts**: Input has `> [!NOTE]\n> A.\n> [!WARNING]\n> B.` — markdown-it merges them into one blockquote; after roundtrip they may become one block or gain a spurious blank line.
- **Alert glyph leak**: After roundtrip, the first line of a NOTE alert reads `> [!NOTE] ※ Note Useful information.` instead of `> [!NOTE] Useful information.` because `stripAlertLeadPrefix` fails to match the bold-wrapped glyph format.
- **Plain blockquote adjacent to alert**: `> Plain.\n\n> [!NOTE]\n> Alert.` — after roundtrip, the plain blockquote and alert may merge because both have `blockquoteLevel=1` and the converter doesn't distinguish them by type.
- **Asymmetric gaps**: `> [!NOTE]\n> A.\nParagraph.\n\n> [!TIP]\n> B.` — the zero-gap before the paragraph and one-gap after are not preserved.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single blockquotes (plain or alert) roundtrip identically
- Nested blockquotes preserve nesting level
- Intra-block blank lines (between paragraphs inside one `>` block) are preserved
- Headings, paragraphs, lists, code blocks, tables, footnotes adjacent to blockquotes are unaffected
- Mouse/keyboard interactions in the VS Code extension are unaffected (conversion-only change)
- Non-blockquote whitespace (blank lines between headings, paragraphs, etc.) is unchanged

**Scope:**
All inputs that do NOT contain multiple consecutive blockquote/alert groups should be completely unaffected by this fix. This includes:
- Documents with zero or one blockquote
- Documents with blockquotes separated by non-blockquote content (headings, paragraphs)
- All non-conversion features (preview, syntax highlighting, LSP)

## Hypothesized Root Cause

Based on code analysis, the issues stem from five root causes:

1. **No gap metadata in docx**: `generateDocumentXml` in `md-to-docx.ts` iterates tokens sequentially and emits spacer paragraphs for `alertFirst`/`alertLast`, but never encodes how many blank lines separated consecutive blockquote groups in the original markdown. The docx format has no native concept of "N blank lines between paragraphs" — spacing is continuous. So `buildMarkdown` in `converter.ts` always emits exactly one `\n\n` between blockquote groups, regardless of the original count.

2. **Spacer paragraphs not recognized**: `extractDocumentContent` in `converter.ts` encounters spacer paragraphs (no `pStyle`, exact-height spacing, inline left border) but treats them as plain paragraphs because `parseBlockquoteLevel` returns `undefined` for paragraphs without a recognized `pStyle`. This can inject extra blank lines or disrupt blockquote continuity.

3. **`stripAlertLeadPrefix` mismatch**: `generateParagraph` emits the alert prefix as `GLYPH + ' ' + Title + ' '` (e.g., `※ Note `) in a bold+colored run. When `converter.ts` reconstructs the text, the bold formatting is lost (it becomes plain text), and `stripAlertLeadPrefix` tries to match patterns like `**※ Note**` or `※ Note:` but may not match the exact format `※ Note ` (trailing space, no colon, no bold wrapper).

4. **Blockquote group boundary detection**: In `buildMarkdown`, the `lastAlertParagraphKey` mechanism tracks `blockquoteLevel:alertType` to decide when to emit a new `[!TYPE]` marker. But it doesn't handle transitions between plain blockquotes and alert blockquotes at the same level, or transitions between different alert types that happen to be adjacent without a non-blockquote paragraph in between.

5. **markdown-it merging**: When blockquotes have zero blank lines between them, markdown-it merges them into a single `blockquote_open`/`blockquote_close` pair. The `annotateBlockquoteAlert` function splits them by alert markers, but the original inter-group gap count (zero) is lost.

## Correctness Properties

Property 1: Fault Condition — Inter-Block Gap Preservation

_For any_ markdown input containing two or more blockquote/alert groups, the md→docx→md roundtrip SHALL produce output where the exact number of blank lines between each pair of consecutive blockquote groups is identical to the original source.

Exception strategy (same-type, zero-gap alerts):
- We preserve `gapCount = 0` exactly (no synthetic blank line insertion).
- Separation between adjacent same-type alert groups is maintained by explicit group boundaries (`blockquoteGroupIndex`) plus per-group marker-style metadata (`MANUSCRIPT_BLOCKQUOTE_ALERT_STYLE_*`).
- Lifecycle: compute from source markdown in `computeBlockquoteGaps` and `computeBlockquoteAlertMarkerInlineByGroup` (`src/md-to-docx.ts`), persist in custom props, then consume in `buildMarkdown` (`src/converter.ts`) without overriding zero gaps.
- This is required for Property 1 and the md→docx→md byte-preserving roundtrip guarantee.

**Validates: Requirements 2.1, 2.5, 2.6, 2.7**

Property 2: Fault Condition — Alert Prefix Cleanliness

_For any_ markdown input containing GitHub-style alerts, the md→docx→md roundtrip SHALL produce output where each alert's first line contains only the `[!TYPE]` marker followed by the original body text, with no residual glyph characters (※, ◈, ‼, ▲, ⛒) or title words (Note, Tip, Important, Warning, Caution) leaking into the body.

**Validates: Requirements 2.2**

Property 3: Fault Condition — Mixed Type Separation

_For any_ markdown input containing plain blockquotes interspersed with alert blockquotes, the md→docx→md roundtrip SHALL produce output where each group retains its original type (plain vs. specific alert type) and groups are correctly separated.

**Validates: Requirements 2.3**

Property 4: Fault Condition — Spacer Paragraph Transparency

_For any_ markdown input containing alerts, the spacer paragraphs (alertFirst/alertLast decorative paragraphs) generated during md→docx SHALL be silently skipped during docx→md conversion without emitting extra blank lines or disrupting blockquote structure.

**Validates: Requirements 2.4**

Property 5: Preservation — Non-Blockquote Content Unchanged

_For any_ markdown input, the md→docx→md roundtrip SHALL produce identical output for all non-blockquote content (headings, paragraphs, lists, code blocks, tables, footnotes), preserving the existing behavior of the converter for these elements.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:


**File**: `src/md-to-docx.ts`

**Function**: `parseMd` / `generateDocumentXml`

**Specific Changes**:

1. **Encode inter-block gap counts**: After `annotateBlockquoteBoundaries`, scan the original markdown source to compute the exact blank-line count between each pair of consecutive blockquote groups. Store this as a `gapAfter` property on the last token of each group (the token with `alertLast=true` or the last blockquote token before a non-blockquote token). Alternatively, build a separate gap map keyed by group index.

2. **Emit gap metadata into docx custom properties**: In `convertMdToDocx`, serialize the gap map as a custom XML property (similar to `codeBlockLanguageProps` / `footnoteIdMappingProps`). Use a key format like `scimark.blockquoteGap.{index}` with the blank-line count as the value. This preserves the metadata through the docx file without affecting rendering.

3. **Annotate blockquote group indices on tokens**: In `annotateBlockquoteBoundaries` or a new post-pass, assign a sequential `blockquoteGroupIndex` to each blockquote token so the gap map can be correlated during docx→md conversion.

4. **Emit group index into docx paragraph properties**: Encode the `blockquoteGroupIndex` as a custom property on each blockquote paragraph (e.g., via a `w:rPr` bookmark or a custom XML attribute) so the converter can reconstruct group boundaries. Alternatively, use the existing `alertFirst`/`alertLast` spacer paragraphs as group boundary markers and encode the gap count in a custom property on the spacer.

**File**: `src/converter.ts`

**Function**: `extractDocumentContent` / `buildMarkdown`

**Specific Changes**:

5. **Detect and skip spacer paragraphs**: In `extractDocumentContent`, when processing a `w:p` element, check for the spacer paragraph signature: no `pStyle`, `w:spacing` with `w:line="1"` and `w:lineRule="exact"`, and `w:pBdr` with `w:left` border. When detected, skip the paragraph entirely (do not push a `para` ContentItem). This prevents spacer paragraphs from injecting extra blank lines.

6. **Read gap metadata from docx custom properties**: In `convertDocx`, extract the blockquote gap map from custom XML properties (parallel to `extractCodeBlockLanguageMapping`). Pass it to `buildMarkdown`.

7. **Use gap metadata in `buildMarkdown`**: When transitioning between blockquote groups (detected by `alertType` change, `blockquoteLevel` change, or transition from blockquote to non-blockquote), look up the gap count from the metadata map and emit the correct number of `\n` characters instead of the hardcoded `\n\n`.

8. **Harden `stripAlertLeadPrefix`**: Extend the regex patterns to match the exact format emitted by `generateParagraph`: `GLYPH + ' ' + Title + ' '` without bold wrapping or trailing colon. Add a pattern for the plain `glyph space title space` format with optional trailing space.

9. **Fix blockquote group boundary detection in `buildMarkdown`**: When a blockquote paragraph has no `alertType` (plain blockquote) and the previous blockquote had an `alertType` (or vice versa), treat this as a group boundary and emit the appropriate gap. Similarly, when `alertType` changes between consecutive blockquote paragraphs at the same level.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write roundtrip tests using the `blockquotes.md` fixture and synthetic markdown inputs. Run on UNFIXED code to observe failures and characterize the exact nature of each defect.

**Test Cases**:
1. **Two-blank-line gap test**: Roundtrip `> [!NOTE]\n> A.\n\n\n> [!TIP]\n> B.` and assert the two blank lines are preserved (will fail on unfixed code — gap collapses to one)
2. **Zero-blank-line gap test**: Roundtrip `> [!NOTE]\n> A.\n> [!WARNING]\n> B.` and assert zero blank lines between groups (will fail on unfixed code — groups merge or gain a blank line)
3. **Alert glyph leak test**: Roundtrip a NOTE alert and assert no `※` or `Note` prefix in body text (may fail on unfixed code)
4. **Mixed type separation test**: Roundtrip `> Plain.\n\n> [!NOTE]\n> Alert.` and assert both groups are distinct (will fail on unfixed code)
5. **Spacer paragraph injection test**: Roundtrip alerts and assert no extra blank lines from spacer paragraphs (will fail on unfixed code)
6. **Asymmetric gap test**: Roundtrip content with different gap counts above and below a blockquote group (will fail on unfixed code)

**Expected Counterexamples**:
- Blank-line counts between blockquote groups differ from original
- Alert body text contains glyph characters or title words
- Plain and alert blockquotes merge into one group
- Possible causes: missing gap metadata, spacer paragraph mishandling, prefix stripping mismatch

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  docx := convertMdToDocx(input)
  result := convertDocx(docx)
  ASSERT result.markdown preserves exact blank-line counts between blockquote groups
  ASSERT result.markdown contains no glyph/title prefix leaks
  ASSERT result.markdown preserves blockquote group type boundaries
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT convertDocx(convertMdToDocx_fixed(input)) = convertDocx(convertMdToDocx_original(input))
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for single blockquotes, non-blockquote content, and nested blockquotes, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single blockquote preservation**: Verify single plain blockquotes roundtrip identically on unfixed code, then assert same after fix
2. **Single alert preservation**: Verify single alerts roundtrip identically on unfixed code, then assert same after fix
3. **Non-blockquote content preservation**: Verify headings, paragraphs, lists, code blocks roundtrip identically
4. **Nested blockquote preservation**: Verify nested blockquotes preserve nesting level
5. **Intra-block blank line preservation**: Verify blank lines within a single blockquote group are preserved
6. **Fixture roundtrip preservation**: Verify `blockquotes.md` fixture roundtrips with all content intact

### Unit Tests

- Test `stripAlertLeadPrefix` with all glyph+title formats (plain, bold-wrapped, with/without colon, with/without trailing space)
- Test spacer paragraph detection logic with various paragraph property combinations
- Test gap metadata encoding/decoding roundtrip (write gap map to custom props, read it back)
- Test `annotateBlockquoteBoundaries` with mixed plain/alert blockquote sequences
- Test `buildMarkdown` blockquote group boundary transitions (alert→plain, plain→alert, alert→different alert)

### Property-Based Tests

- Generate random sequences of blockquote groups (varying types, gap counts 0–3) and verify gap preservation through roundtrip
- Generate random single blockquotes with varying content and verify preservation
- Generate random non-blockquote markdown and verify no behavioral change
- Use fast-check with short bounded generators to avoid timeouts (per AGENTS.md guidance)

### Integration Tests

- Roundtrip the full `test/fixtures/blockquotes.md` fixture and assert byte-for-byte equality for blockquote regions
- Roundtrip a document mixing blockquotes with headings, lists, code blocks, and tables
- Roundtrip a document with all five alert types in sequence with varying gap counts
- Roundtrip a document with zero-gap, one-gap, two-gap, and three-gap separations
