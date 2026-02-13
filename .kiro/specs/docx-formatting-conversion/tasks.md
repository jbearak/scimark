# Implementation Plan: DOCX Formatting Conversion

## Overview

Extend the mdmarkup converter to handle rich DOCX formatting (bold, italic, underline, strikethrough, highlight, superscript, subscript, hyperlinks, headings, lists) and add `==highlight==` editor support (command, syntax highlighting, preview rendering). Implementation is incremental: types first, then extraction helpers, then buildMarkdown updates, then editor features, with tests woven in throughout.

## Tasks

- [ ] 1. Extend ContentItem types and add formatting helpers
  - [ ] 1.1 Add `RunFormatting` interface, `ListMeta` interface, and update `ContentItem` type union in `src/converter.ts`
    - Add `RunFormatting` with 7 boolean fields (bold, italic, underline, strikethrough, highlight, superscript, subscript)
    - Add `ListMeta` with `type: 'bullet' | 'ordered'` and `level: number`
    - Extend text variant with `formatting: RunFormatting` and optional `href?: string`
    - Extend para variant with optional `headingLevel?: number` and `listMeta?: ListMeta`
    - Add `DEFAULT_FORMATTING` constant with all fields `false`
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [ ] 1.2 Implement `isToggleOn()`, `parseRunProperties()`, and `wrapWithFormatting()` helper functions in `src/converter.ts`
    - `isToggleOn(children, tagName)`: detect OOXML boolean toggle pattern (present with no val, val="true"/"1" → true; val="false"/"0" → false; absent → false)
    - `parseRunProperties(rPrChildren)`: read w:b, w:i, w:u, w:strike, w:highlight, w:shd, w:vertAlign and return `RunFormatting`
    - `wrapWithFormatting(text, fmt)`: apply delimiters in nesting order: bold(**), italic(*), strikethrough(~~), underline(<u>), highlight(==), superscript(<sup>)/subscript(<sub>)
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.1, 3.2, 4.1, 4.3, 5.1, 5.2, 6.1, 7.1, 8.1, 8.2_
  - [ ]* 1.3 Write property tests for `wrapWithFormatting()`
    - **Property 1: Formatting wrapping produces correct delimiters**
    - **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1**
    - **Property 3: Combined formatting nesting order is consistent**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 2. Implement XML parsing helpers for relationships and numbering
  - [ ] 2.1 Implement `parseRelationships()` in `src/converter.ts`
    - Parse `word/_rels/document.xml.rels` to build `Map<rId, targetUrl>` for external hyperlinks
    - Only include relationships with Type ending in `/hyperlink` and `TargetMode="External"`
    - Return empty map if file is missing
    - _Requirements: 9.1, 17.7_
  - [ ] 2.2 Implement `parseNumberingDefinitions()` in `src/converter.ts`
    - Parse `word/numbering.xml` to build `Map<numId, Map<ilvl, 'bullet' | 'ordered'>>`
    - First build abstractNumId → levels map, then resolve numId → abstractNumId
    - Treat `w:numFmt val="bullet"` as bullet, all other numeric formats as ordered
    - Return empty map if file is missing
    - _Requirements: 11.1, 12.1, 17.8_
  - [ ] 2.3 Implement `parseHeadingLevel()` and `parseListMeta()` helpers in `src/converter.ts`
    - `parseHeadingLevel(pPrChildren)`: extract heading level from w:pStyle matching Heading1-Heading6 (case-insensitive), return undefined if not a heading
    - `parseListMeta(pPrChildren, numberingDefs)`: extract numId and ilvl from w:numPr, look up in numbering definitions, return ListMeta or undefined
    - _Requirements: 10.1, 10.3, 11.1, 12.1, 17.6_

- [ ] 3. Update `extractDocumentContent()` to populate formatting metadata
  - [ ] 3.1 Update `extractDocumentContent()` to call `parseRelationships()` and `parseNumberingDefinitions()` at the start
    - Load relationship map and numbering definitions from the zip
    - Pass numbering definitions to the walk function
    - _Requirements: 17.7, 17.8_
  - [ ] 3.2 Update the walk function to read `w:rPr` from each run and populate `RunFormatting`
    - Before emitting a text ContentItem, find w:rPr among the run's children and call `parseRunProperties()`
    - Attach the resulting RunFormatting to the text item (use DEFAULT_FORMATTING if no w:rPr)
    - _Requirements: 17.5_
  - [ ] 3.3 Update the walk function to handle `w:hyperlink` nodes
    - When encountering w:hyperlink, read r:id, resolve against relationship map
    - Set `href` on all child text items within the hyperlink
    - If r:id is unresolvable, leave href undefined (plain text fallback)
    - _Requirements: 9.1, 9.2, 9.3, 17.7_
  - [ ] 3.4 Update the walk function to read `w:pPr` for headings and lists
    - When processing w:p, look for w:pPr among children
    - Call `parseHeadingLevel()` and `parseListMeta()` and attach to the para ContentItem
    - _Requirements: 10.1, 11.1, 12.1, 17.6_

- [ ] 4. Update `buildMarkdown()` to render formatting, hyperlinks, headings, and lists
  - [ ] 4.1 Add run merging logic to `buildMarkdown()`
    - Before rendering, merge consecutive text items with identical formatting, href, and commentIds
    - Concatenate their text fields into a single item
    - _Requirements: 1.2, 2.2, 4.2, 5.3, 6.2, 7.2_
  - [ ] 4.2 Update text item rendering to apply formatting delimiters and hyperlink syntax
    - Call `wrapWithFormatting(text, formatting)` on each text item
    - If `href` is set, wrap the formatted text in `[…](href)` syntax
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.2, 9.4_
  - [ ] 4.3 Update para item rendering for headings and lists
    - If `headingLevel` is set, prefix the next text content with `#` × level + space
    - If `listMeta` is set, prefix with indented `- ` or `1. ` marker
    - Suppress blank line between consecutive list items
    - _Requirements: 10.1, 10.2, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3_
  - [ ]* 4.4 Write property tests for `buildMarkdown()` formatting and structure
    - **Property 2: Consecutive runs with identical formatting merge into a single span**
    - **Validates: Requirements 1.2, 2.2, 4.2, 5.3, 6.2, 7.2**
    - **Property 4: Hyperlink text items produce Markdown link syntax**
    - **Validates: Requirements 9.1, 9.2**
    - **Property 5: Formatting delimiters appear inside hyperlink text**
    - **Validates: Requirements 9.4**
    - **Property 6: Heading paragraphs produce correct # prefix**
    - **Validates: Requirements 10.1, 10.2**
    - **Property 7: List items produce correct prefix and indentation**
    - **Validates: Requirements 11.1, 11.2, 12.1, 12.2**
    - **Property 8: Consecutive list items have no blank lines between them**
    - **Validates: Requirements 11.3, 12.3**

- [ ] 5. Checkpoint - Ensure converter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Add end-to-end fixture tests for `formatting_sample.docx`
  - [ ] 6.1 Add end-to-end test in `src/converter.test.ts` that converts `test/fixtures/formatting_sample.docx` and verifies formatting output
    - Load the fixture, call `convertDocx()`, and verify the markdown output contains expected bold, italic, underline, strikethrough, highlight, superscript, subscript, hyperlink, heading, and list markers
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [ ]* 6.2 Write unit tests for edge cases
    - Test `isToggleOn` with val="false", val="0", absent element
    - Test highlight detection via w:shd with non-auto fill
    - Test unresolvable hyperlink r:id falls back to plain text
    - Test non-heading pStyle produces no # prefix
    - _Requirements: 1.3, 2.3, 3.2, 4.3, 5.2, 9.3, 10.3_

- [ ] 7. Add `==highlight==` editor command and menu entry
  - [ ] 7.1 Register `mdmarkup.formatHighlight` command in `src/extension.ts` and add to `package.json`
    - Add command registration: `wrapSelection(text, '==', '==')`
    - Add command declaration in `contributes.commands`
    - Add menu entry in `markdown.formatting` submenu at `1_format@6`
    - Shift inline code to `1_format@7` and code block to `1_format@8`
    - _Requirements: 14.1, 14.2, 14.3_
  - [ ]* 7.2 Write property test for highlight formatting command
    - **Property 9: Highlight formatting command wraps with == delimiters**
    - **Validates: Requirements 14.1**

- [ ] 8. Add `==highlight==` syntax highlighting in TextMate grammar
  - [ ] 8.1 Add `format_highlight` pattern to `syntaxes/mdmarkup.json`
    - Match `==…==` but NOT `{==…==}` using negative lookbehind for `{`
    - Assign scope `markup.highlight.mdmarkup`
    - Add to top-level patterns array
    - _Requirements: 15.1, 15.2, 15.3_

- [ ] 9. Add `==highlight==` preview rendering
  - [ ] 9.1 Add inline rule for `==…==` in `src/preview/mdmarkup-plugin.ts`
    - Detect `==` at current position, but only when NOT preceded by `{`
    - Find closing `==` (not followed by `}`)
    - Emit `mdmarkup_format_highlight_open` / `_close` tokens with `<mark>` tag and `mdmarkup-format-highlight` CSS class
    - Register renderer rules for the new token types
    - _Requirements: 16.1, 16.3_
  - [ ] 9.2 Add CSS styles for `.mdmarkup-format-highlight` in `media/mdmarkup.css`
    - Light theme: yellow/amber background (distinct from purple CriticMarkup highlight)
    - Dark theme: darker amber background
    - _Requirements: 16.2_
  - [ ]* 9.3 Write property test for preview ==highlight== rendering
    - **Property 10: Preview ==highlight== rendering**
    - **Validates: Requirements 16.1**

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Per AGENTS.md: use `bun test` to run tests, use bounded `fast-check` generators to avoid timeouts
