# Implementation Plan: Header Font Configuration

## Overview

Add per-heading-level and per-title-paragraph font configuration to YAML frontmatter. Implementation proceeds bottom-up: shared utilities → Frontmatter interface & parsing → serialization → font resolution → docx generation → template overrides → docx→md extraction → LSP completions → documentation. Property tests validate each layer incrementally.

## Tasks

- [ ] 1. Add shared utility functions and extend Frontmatter interface
  - [ ] 1.1 Implement `parseInlineArray` and `normalizeFontStyle` utilities in `src/frontmatter.ts`
    - Add `parseInlineArray(value: string): string[]` — strips brackets if present, splits on commas, trims whitespace, filters empty strings
    - Add `normalizeFontStyle(raw: string): string | undefined` — validates and normalizes Font_Style values to canonical order (`bold-italic-underline`); returns `undefined` for invalid inputs (duplicates, unrecognized parts)
    - Include design rationale comment above `normalizeFontStyle` explaining why a single combined field was chosen over separate CSS-style fields (Requirement 11.2–11.5)
    - Export both functions for testing
    - _Requirements: 1.2, 1.3, 3.5, 3.6, 3.7, 11.2, 11.3, 11.4, 11.5_

  - [ ] 1.2 Extend the `Frontmatter` interface with new fields in `src/frontmatter.ts`
    - Add `headerFont?: string[]`, `headerFontSize?: number[]`, `headerFontStyle?: string[]`
    - Add `titleFont?: string[]`, `titleFontSize?: number[]`, `titleFontStyle?: string[]`
    - _Requirements: 1.1, 2.1, 3.1, 13.1, 14.1, 15.1_

  - [ ]* 1.3 Write property test: Inline array parsing equivalence (Property 1)
    - **Property 1: Inline array parsing equivalence**
    - Generate arrays of 1–6 short alphanumeric strings (no commas/brackets), format as bracketed `[v1, v2, ...]` and bare `v1, v2, ...`, verify `parseInlineArray` produces identical arrays equal to the original list
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 13.1, 13.2, 13.3, 14.1, 14.2, 14.3, 15.1, 15.2, 15.3**

  - [ ]* 1.4 Write property test: Font style normalization is canonical and idempotent (Property 2)
    - **Property 2: Font style normalization is canonical and idempotent**
    - Generate random subsets of `{bold, italic, underline}`, permute, verify canonical output and idempotence; verify `normalizeFontStyle('normal')` returns `'normal'`
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 3.5, 3.6, 15.5, 15.6**

  - [ ]* 1.5 Write property test: Invalid font styles are rejected (Property 3)
    - **Property 3: Invalid font styles are rejected**
    - Generate strings with duplicate parts (`bold-bold`), unknown parts (`bold-heavy`), empty parts; verify `normalizeFontStyle` returns `undefined`
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 3.7, 15.7**

- [ ] 2. Implement frontmatter parsing for new fields
  - [ ] 2.1 Add parsing cases for `header-font`, `header-font-size`, `header-font-style` in `parseFrontmatter` in `src/frontmatter.ts`
    - `header-font`: call `parseInlineArray(value)` → assign to `metadata.headerFont` (overwrites on repeated keys)
    - `header-font-size`: call `parseInlineArray(value)`, parse each element as number via `parseFloat`, filter positive finite → assign to `metadata.headerFontSize`
    - `header-font-style`: call `parseInlineArray(value)`, normalize each via `normalizeFontStyle()`, filter `undefined` → assign to `metadata.headerFontStyle`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 2.2 Add parsing cases for `title-font`, `title-font-size`, `title-font-style` in `parseFrontmatter` in `src/frontmatter.ts`
    - Same logic as header counterparts → `metadata.titleFont`, `metadata.titleFontSize`, `metadata.titleFontStyle`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ] 2.3 Extend `title` parsing to support Inline_Array syntax in `parseFrontmatter` in `src/frontmatter.ts`
    - If a single `title:` line has value starting with `[` and ending with `]`, parse as inline array
    - If repeated `title:` keys are present alongside an inline array line, repeated-key values take precedence
    - Preserve existing repeated-key behavior as the primary format
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.4 Write property test: Invalid font sizes are filtered (Property 4)
    - **Property 4: Invalid font sizes are filtered**
    - Generate mixed arrays of valid/invalid number strings (negative, zero, NaN, Infinity, non-numeric), verify only valid positive finite numbers survive in parsed result
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 2.5, 14.5**

  - [ ]* 2.5 Write property test: Repeated keys use last occurrence (Property 5)
    - **Property 5: Repeated keys use last occurrence**
    - Generate frontmatter YAML with 2–4 repeated key lines for `header-font`, `header-font-size`, etc., verify `parseFrontmatter` stores only the last value
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 1.4, 2.4, 3.4, 13.4, 14.4, 15.4**

- [ ] 3. Implement frontmatter serialization for new fields
  - [ ] 3.1 Extend `serializeFrontmatter` in `src/frontmatter.ts` to emit new fields
    - Single-element arrays → plain `key: value` (no brackets)
    - Multi-element arrays → `key: [v1, v2, ...]` (bracketed inline array)
    - Undefined or empty arrays → omit key entirely
    - Emit `headerFont`, `headerFontSize`, `headerFontStyle`, `titleFont`, `titleFontSize`, `titleFontStyle`
    - Preserve existing `title` repeated-key serialization (one `title:` line per element)
    - _Requirements: 5.1–5.15_

  - [ ]* 3.2 Write property test: Serialization format correctness (Property 7)
    - **Property 7: Serialization format correctness**
    - Generate Frontmatter objects with various array lengths (0, 1, 2+), verify single-element → plain format, multi-element → bracketed format, undefined/empty → key omitted, title → repeated-key format
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 5.1–5.15**

  - [ ]* 3.3 Write property test: Parse–serialize–parse round-trip (Property 8)
    - **Property 8: Parse–serialize–parse round-trip**
    - Generate valid Frontmatter objects with any combination of font fields, verify `parseFrontmatter(serializeFrontmatter(fm) + '\n\nBody.')` produces equivalent metadata
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 6.1**

- [ ] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Extend font resolution and docx generation
  - [ ] 5.1 Add `resolveAtIndex` helper and extend `FontOverrides` interface in `src/md-to-docx.ts`
    - Add `resolveAtIndex<T>(arr: T[] | undefined, index: number): T | undefined` for Array_Inheritance
    - Extend `FontOverrides` with `headingFonts?: Map<string, string>`, `headingStyles?: Map<string, string>`, `titleFonts?: string[]`, `titleSizesHp?: number[]`, `titleStyles?: string[]`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 5.2 Extend `resolveFontOverrides` in `src/md-to-docx.ts` to populate new fields
    - Populate `headingFonts` map: for each heading level 1–6, `resolveAtIndex(fm.headerFont, level-1)` ?? `fm.font` ?? undefined
    - Populate `headingStyles` map: for each heading level 1–6, `resolveAtIndex(fm.headerFontStyle, level-1)` ?? undefined
    - Override `headingSizesHp` entries: when `headerFontSize` is defined for a level, use explicit value (× 2 for half-points) instead of proportional scaling
    - Populate `titleFonts`, `titleSizesHp`, `titleStyles` from frontmatter arrays (with `font` fallback for `titleFonts`)
    - Update `hasAnyField` check to include new fields
    - _Requirements: 1.6, 1.7, 2.6, 3.8, 4.1–4.4, 7.10, 9.2, 9.3, 13.6, 13.7, 13.8, 14.6, 14.7, 15.8, 15.9_

  - [ ]* 5.3 Write property test: Array inheritance resolution (Property 6)
    - **Property 6: Array inheritance resolution**
    - Generate arrays of length 1–8 and target indices 0–7, verify `resolveAtIndex` returns `arr[i]` when `i < L` and `arr[L-1]` when `i >= L`
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 13.8, 14.7, 15.9**

  - [ ]* 5.4 Write property test: Font fallback to body font (Property 9)
    - **Property 9: Font fallback to body font**
    - Generate Frontmatter with `font` defined and `headerFont`/`titleFont` undefined, verify `resolveFontOverrides` produces `FontOverrides` where all heading levels use the `font` value
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 1.6, 13.6**

  - [ ]* 5.5 Write property test: header-font-size takes precedence over proportional scaling (Property 10)
    - **Property 10: header-font-size takes precedence over proportional scaling**
    - Generate Frontmatter with both `fontSize` and `headerFontSize`, verify explicit `headerFontSize` value (× 2) is used for heading levels where specified, ignoring proportional scaling
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 7.10, 9.2, 9.3**

  - [ ]* 5.6 Write property test: Backward compatibility of existing font fields (Property 13)
    - **Property 13: Backward compatibility of existing font fields**
    - Generate Frontmatter with only pre-existing fields (`font`, `codeFont`, `fontSize`, `codeFontSize`) and none of the new fields, verify `resolveFontOverrides` produces identical `bodyFont`, `codeFont`, `bodySizeHp`, `codeSizeHp`, `headingSizesHp` as the original implementation
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 9.1, 9.2**

- [ ] 6. Update `stylesXml` for heading and title font/style overrides
  - [ ] 6.1 Extend `headingRpr` helper and Title style in `stylesXml` in `src/md-to-docx.ts`
    - Modify `headingRpr` to use per-heading font from `overrides.headingFonts` (falling back to `bodyFontStr`)
    - Modify `headingRpr` to use per-heading style from `overrides.headingStyles`: `normal` → no bold/italic/underline; specific style → emit matching `<w:b/>`, `<w:i/>`, `<w:u w:val="single"/>`; undefined → default `<w:b/>`
    - Update Title style to use `overrides.titleFonts?.[0]`, `overrides.titleSizesHp?.[0]`, `overrides.titleStyles?.[0]` for the first title element
    - _Requirements: 7.1–7.9, 7.11–7.14_

  - [ ]* 6.2 Write property test: stylesXml heading and title output correctness (Property 11)
    - **Property 11: stylesXml heading and title output correctness**
    - Generate `FontOverrides` with heading fonts, sizes, and styles, verify `stylesXml(overrides)` XML contains correct `w:rFonts`, `w:sz`/`w:szCs`, and `<w:b/>`, `<w:i/>`, `<w:u/>` elements per heading style; verify `normal` produces none of these style elements
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 7.1–7.9, 7.11–7.14**

- [ ] 7. Update `generateDocumentXml` for per-title-element run properties
  - [ ] 7.1 Add per-title-element `<w:rPr>` in `generateDocumentXml` in `src/md-to-docx.ts`
    - For each title paragraph, resolve font/size/style at that index using `resolveAtIndex` on `FontOverrides` title arrays
    - Build inline `<w:rPr>` with `<w:b/>`, `<w:i/>`, `<w:u/>`, `w:rFonts`, `w:sz`/`w:szCs` as needed
    - Pass `rPr` string to `generateRun(line, rPr)` for each title paragraph
    - Ensure `FontOverrides` is accessible in `generateDocumentXml` (passed through `DocxGenState` or function parameter)
    - _Requirements: 7.11, 7.12, 7.13, 7.14_

- [ ] 8. Update `applyFontOverridesToTemplate` for heading and title overrides
  - [ ] 8.1 Extend template override logic in `applyFontOverridesToTemplate` in `src/md-to-docx.ts`
    - Add `Heading1`–`Heading6` to the target style IDs
    - For each heading style: replace `w:rFonts` with heading-specific font (from `overrides.headingFonts`), replace `w:sz`/`w:szCs` with heading-specific size (from `overrides.headingSizesHp`), and replace/add/remove `w:b`, `w:i`, `w:u` based on heading-specific style (from `overrides.headingStyles`)
    - For the Title style: apply first title element's font, size, and style overrides
    - When a heading level has no override for a specific property, preserve the template's existing value
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 8.2 Write property test: Template application preserves unmodified styles (Property 12)
    - **Property 12: Template application preserves unmodified styles**
    - Generate template `styles.xml` with heading styles and partial `FontOverrides`, verify `applyFontOverridesToTemplate` modifies only styles with overrides and leaves others unchanged
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ] 9. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement docx→md extraction of heading and title font properties
  - [ ] 10.1 Extend `convertDocx` in `src/converter.ts` to extract heading/title font properties from `word/styles.xml`
    - Parse `Heading1`–`Heading6` styles: extract `w:rFonts/@w:ascii` → font, `w:sz/@w:val` → size (÷ 2), `w:b`/`w:i`/`w:u` → style
    - Parse `Title` style: extract same properties for title font fields
    - Compare against defaults to determine which overrides were explicitly set
    - Populate `fm.headerFont`, `fm.headerFontSize`, `fm.headerFontStyle`, `fm.titleFont`, `fm.titleFontSize`, `fm.titleFontStyle`
    - Only emit non-default values to keep frontmatter clean
    - _Requirements: 6.2_

  - [ ]* 10.2 Write property test: Full pipeline round-trip md→docx→md (Property 14)
    - **Property 14: Full pipeline round-trip (md→docx→md)**
    - Generate Frontmatter with header/title font fields, build markdown, convert to docx via `convertMdToDocx`, convert back via `convertDocx`, verify equivalent header/title font field values
    - Test file: `src/header-font-config.property.test.ts`
    - **Validates: Requirements 6.2**

- [ ] 11. Add LSP completions for new frontmatter keys
  - [ ] 11.1 Extend LSP completion handler in `src/lsp/server.ts`
    - Add completion items for `header-font`, `header-font-size`, `header-font-style`, `title-font`, `title-font-size`, `title-font-style`
    - Each item includes a description snippet showing example syntax
    - Follow existing pattern used for `csl:` and other frontmatter key completions
    - _Requirements: 12.1 (supports discoverability)_

- [ ] 12. Update user-facing documentation
  - [ ] 12.1 Update `docs/specification.md` with new frontmatter fields
    - Document `header-font`, `header-font-size`, `header-font-style` fields with both syntaxes (bare comma-separated and bracketed inline array)
    - Document `title-font`, `title-font-size`, `title-font-style` fields, explaining array elements map to title paragraphs by position
    - Include concrete examples of each syntax
    - State that both syntaxes are equivalent
    - Document Array_Inheritance behavior
    - Document `title` Inline_Array support as secondary alternative to repeated keys
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code is TypeScript, matching the existing codebase
- Use `fast-check` with short bounded generators per AGENTS.md to avoid timeouts
- Avoid `$$` in template literals per AGENTS.md cross-cutting learnings
