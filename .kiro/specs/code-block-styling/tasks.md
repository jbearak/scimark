# Implementation Plan: Code Block Styling

## Overview

Replace the indentation-based code block styling in `md-to-docx.ts` with a shading+border approach controlled by three new YAML frontmatter fields (`code-background-color`, `code-font-color`, `code-block-inset`). Extend `CodeChar` inline code style to share the same colors. Preserve round-trip fidelity and document the new fields.

## Tasks

- [x] 1. Extend Frontmatter interface and parser
  - [x] 1.1 Add `codeBackgroundColor`, `codeFontColor`, and `codeBlockInset` fields to the `Frontmatter` interface in `src/frontmatter.ts`
    - `codeBackgroundColor?: string` — 6-digit hex, `"none"`, or `"transparent"`
    - `codeFontColor?: string` — 6-digit hex
    - `codeBlockInset?: number` — positive integer
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.3, 11.1, 11.2_

  - [x] 1.2 Add parsing cases in `parseFrontmatter()` for the three new fields and their aliases
    - `code-background-color` and `code-background` → `codeBackgroundColor` (validate: 6-digit hex regex, `"none"`, `"transparent"`)
    - `code-font-color` and `code-color` → `codeFontColor` (validate: 6-digit hex regex)
    - `code-block-inset` → `codeBlockInset` (validate: positive integer)
    - Invalid values are silently ignored
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.2, 8.1, 8.2, 8.3, 8.5, 11.1, 11.2, 11.4_

  - [x] 1.3 Add serialization in `serializeFrontmatter()` using canonical field names only
    - Emit `code-background-color`, `code-font-color`, `code-block-inset` when present
    - _Requirements: 4.6, 8.6, 11.6_

  - [x]* 1.4 Write property test: frontmatter round-trip preservation (Property 4)
    - **Property 4: Frontmatter round-trip preservation**
    - Generate valid `codeBackgroundColor` (hex, `"none"`, `"transparent"`), `codeFontColor` (hex), `codeBlockInset` (positive int); serialize then parse; verify identical values
    - **Validates: Requirements 4.1, 4.3, 4.6, 8.1, 8.3, 8.6, 11.1, 11.2, 11.6**

  - [x]* 1.5 Write property test: invalid frontmatter values are ignored (Property 5)
    - **Property 5: Invalid frontmatter values are ignored**
    - Generate invalid strings for each field; parse; verify corresponding field is `undefined`
    - **Validates: Requirements 7.2, 8.5, 11.4**

  - [x]* 1.6 Write property test: alias round-trip normalization (Property 11)
    - **Property 11: Alias round-trip normalization**
    - Parse `code-background` and `code-color` aliases; serialize; verify canonical names emitted
    - **Validates: Requirements 4.2, 4.6, 8.2, 8.6**

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Modify `stylesXml()` for conditional CodeBlock and CodeChar style generation
  - [x] 3.1 Add constants for default code block styling values in `src/md-to-docx.ts`
    - `DEFAULT_CODE_BACKGROUND = 'E8E8E8'`, `DEFAULT_CODE_COLOR = '2E2E2E'`, `DEFAULT_CODE_BORDER_SIZE = 48`, `CODE_BORDER_SPACE = 8`
    - _Requirements: 4.5, 8.4, 11.3_

  - [x] 3.2 Extend `stylesXml()` signature to accept code block config parameter
    - Add `codeBlockConfig?: { background?: string; insetMode: boolean; codeFontColor?: string; codeBlockInset?: number }` parameter
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1_

  - [x] 3.3 Implement shading mode CodeBlock style in `stylesXml()`
    - Replace `w:ind` with `w:shd` (fill = background color) and `w:pBdr` (all four sides, `w:val="single"`, color-matched, `w:sz` from `codeBlockInset` or default, `w:space` for padding)
    - Add `w:color` to `w:rPr` when `codeFontColor` is configured
    - Retain `w:spacing w:after="0" w:line="240" w:lineRule="auto"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 7.1, 11.5_

  - [x] 3.4 Preserve inset mode CodeBlock style in `stylesXml()` when `insetMode` is true
    - Keep existing `w:ind` left/right, no `w:shd` or `w:pBdr`
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 Implement conditional CodeChar style in `stylesXml()`
    - Shading mode: add `w:shd` (same background color) and `w:color` (font color) to `w:rPr`
    - Inset mode: no `w:shd`, still add `w:color` if configured
    - Keep as `w:type="character"` with no `w:pPr`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x]* 3.6 Write property test: shading mode style structure (Property 1)
    - **Property 1: Shading mode style structure**
    - For any valid hex color and positive integer inset, verify `styles.xml` CodeBlock has `w:shd`, `w:pBdr` with correct attributes, no `w:ind`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 7.1, 11.5**

  - [x]* 3.7 Write property test: spacing invariant across modes (Property 2)
    - **Property 2: Spacing invariant across modes**
    - For any code block config, verify CodeBlock style always has `w:spacing w:after="0" w:line="240" w:lineRule="auto"`
    - **Validates: Requirements 1.5**

  - [x]* 3.8 Write property test: code font color in style run properties (Property 3)
    - **Property 3: Code font color in style run properties**
    - For any valid hex font color, verify both CodeBlock and CodeChar styles have `w:color` with that value
    - **Validates: Requirements 1.6, 10.2**

  - [x]* 3.9 Write property test: inline code shading in shading mode (Property 8)
    - **Property 8: Inline code shading in shading mode**
    - For any valid hex background color, verify CodeChar has `w:shd` with that fill, remains `w:type="character"`, no `w:pPr`
    - **Validates: Requirements 10.1, 10.4, 10.5**

  - [x]* 3.10 Write property test: inline code has no shading in inset mode (Property 9)
    - **Property 9: Inline code has no shading in inset mode**
    - For `"none"` or `"transparent"` background, verify CodeChar has no `w:shd`
    - **Validates: Requirements 10.3**

  - [x]* 3.11 Write property test: code-block-inset does not affect inline code (Property 10)
    - **Property 10: code-block-inset does not affect inline code**
    - For any valid inset value, verify CodeChar style is identical regardless of inset (given same colors)
    - **Validates: Requirements 10.6**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modify paragraph emission for conditional code block spacing
  - [x] 5.1 Add `codeShadingMode: boolean` to `DocxGenState` interface in `src/md-to-docx.ts`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 Update `convertMdToDocx()` to resolve code block config from frontmatter
    - Read `codeBackgroundColor`, `codeFontColor`, `codeBlockInset` from parsed frontmatter
    - Determine mode: inset if `"none"` or `"transparent"`, shading otherwise
    - Resolve background hex (frontmatter value if valid, else default)
    - Pass config to `stylesXml()` and set `state.codeShadingMode`
    - _Requirements: 4.5, 7.1, 7.2, 8.4_

  - [x] 5.3 Update `generateParagraph()` code_block handling for conditional spacing
    - Shading mode: emit uniform `<w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr>` for all lines (no spacing overrides)
    - Inset mode: preserve existing first/last paragraph `w:before`/`w:after` overrides
    - _Requirements: 3.1, 3.2, 3.3, 5.2_

  - [x]* 5.4 Write property test: uniform paragraph treatment in shading mode (Property 6)
    - **Property 6: Uniform paragraph treatment in shading mode**
    - For any code block with N lines in shading mode, verify all `<w:p>` elements have identical `<w:pPr>` with only `<w:pStyle w:val="CodeBlock"/>`
    - **Validates: Requirements 3.1, 3.2, 5.2**

  - [x]* 5.5 Write property test: inset mode first/last paragraph spacing (Property 7)
    - **Property 7: Inset mode first/last paragraph spacing**
    - For any code block with N≥2 lines in inset mode, verify first has `w:before`, last has `w:after`, middle has neither
    - **Validates: Requirements 3.3**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update DOCX-to-Markdown converter for round-trip preservation
  - [x] 7.1 Update `convertDocx()` in `src/converter.ts` to preserve `codeBackgroundColor`, `codeFontColor`, and `codeBlockInset` from original frontmatter during round-trip
    - Read the three fields from the parsed frontmatter and include them in the reconstructed `Frontmatter` object passed to `serializeFrontmatter()`
    - _Requirements: 6.1, 6.2, 6.3, 9.1, 9.2, 12.1, 12.2_

  - [x]* 7.2 Write unit tests for round-trip preservation
    - Test: MD with `code-background-color` → DOCX → MD preserves the value
    - Test: MD without `code-background-color` → DOCX → MD has no such field
    - Test: Same for `code-font-color` and `code-block-inset`
    - Test: `parseCodeBlockStyle` detects CodeBlock regardless of shading/indent presence
    - _Requirements: 6.1, 6.2, 6.3, 9.1, 9.2, 12.1, 12.2_

- [x] 8. Document frontmatter fields in specification
  - [x] 8.1 Add `code-background-color`, `code-font-color`, and `code-block-inset` entries to the frontmatter field table in `docs/specification.md`
    - Include valid values, default behavior, aliases, and units
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Per AGENTS.md: use fast-check with short bounded generators to avoid timeouts
- Per AGENTS.md: never use `$$` in code touched by tool text-replacement operations
