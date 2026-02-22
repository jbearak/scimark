# Implementation Plan: Markdown to DOCX Conversion

## Overview

Build the reverse converter (MD → DOCX) as a new module `src/md-to-docx.ts` with supporting modules for BibTeX parsing and LaTeX-to-OMML conversion. Wire it into the VS Code extension as a submenu with default and template-based export options. All code is TypeScript, reusing existing dependencies (jszip, fast-xml-parser, markdown-it).

## Tasks

- [x] 1. BibTeX parser module
  - [x] 1.1 Create `src/bibtex-parser.ts` with `parseBibtex()` and `serializeBibtex()` functions
    - Parse BibTeX entries into `Map<string, BibtexEntry>` keyed by citation key
    - Handle standard fields (author, title, journal, year, volume, pages, doi) and custom fields (zotero-key, zotero-uri)
    - Handle BibTeX escaping (braces, special characters)
    - `serializeBibtex()` produces a valid BibTeX string from parsed entries
    - _Requirements: 9.6, 9.7_

  - [x]* 1.2 Write property test for BibTeX round-trip
    - **Property 2: BibTeX parser round-trip**
    - **Validates: Requirements 9.6, 9.7**

  - [x]* 1.3 Write unit tests for BibTeX parser edge cases
    - Test malformed entries, missing fields, entries with braces in values, zotero custom fields
    - _Requirements: 9.6_

- [x] 2. LaTeX-to-OMML converter module
  - [x] 2.1 Create `src/latex-to-omml.ts` with `latexToOmml()` function
    - Parse LaTeX math string into OMML XML string
    - Support: fractions, superscripts, subscripts, roots, n-ary operators, delimiters, Greek letters, accents, matrices, functions, plain text
    - Unsupported constructs fall back to plain text run with raw LaTeX
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]* 2.2 Write property test for LaTeX-to-OMML round-trip
    - **Property 11: LaTeX-to-OMML round-trip**
    - Generate random LaTeX using supported constructs, convert to OMML, convert back with existing `ommlToLatex()`, compare
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x]* 2.3 Write unit tests for LaTeX-to-OMML
    - Test specific LaTeX expressions and their expected OMML output
    - Test fallback behavior for unsupported constructs
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Markdown parsing with custom rules
  - [x] 4.1 Create Markdown parsing layer in `src/md-to-docx.ts` using markdown-it
    - Configure markdown-it with HTML enabled (for `<u>`, `<sup>`, `<sub>`)
    - Add custom inline rules for CriticMarkup patterns, Pandoc citations, colored highlights, and LaTeX math delimiters
    - Produce a token stream that the OOXML generator can walk
    - _Requirements: 1.1, 1.2_

  - [x]* 4.2 Write property test for Markdown parser round-trip
    - **Property 1: Markdown parser round-trip**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 5. OOXML generation core
  - [x] 5.1 Implement OOXML static templates and archive assembly
    - Create XML templates for `[Content_Types].xml`, `_rels/.rels`, `word/styles.xml` (with Normal, Heading1-6, Hyperlink, Quote, CodeChar, CodeBlock styles)
    - Implement zip packaging with JSZip
    - Conditionally include `word/numbering.xml`, `word/comments.xml`, `word/_rels/document.xml.rels`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.2 Implement character formatting run generation
    - Generate `w:rPr` elements from formatting flags (bold, italic, underline, strikethrough, highlight, colored highlight, superscript, subscript, code style reference)
    - Use bare elements for boolean toggles, omit when false
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 5.3 Implement paragraph-level structures
    - Headings: `w:pStyle` with HeadingN
    - Lists: `w:numPr` with `w:numId` and `w:ilvl`
    - Blockquotes: paragraph style or indentation
    - Code blocks: `CodeBlock` paragraph style
    - _Requirements: 4.1, 4.3, 5.1, 5.2, 5.3, 12.1, 12.2, 13.2_

  - [x] 5.4 Implement hyperlink generation
    - Emit `w:hyperlink` elements with `r:id` references
    - Deduplicate URLs in relationship registry
    - Support formatted text within hyperlinks
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.5 Implement table generation
    - Emit `w:tbl` with `w:tr`/`w:tc` structure
    - Header row with bold formatting
    - Table borders and cell margins
    - Formatted text within cells
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x]* 5.6 Write property tests for OOXML generation
    - **Property 3: DOCX archive completeness**
    - **Property 4: Character formatting preservation**
    - **Property 5: Heading level mapping**
    - **Property 6: List numbering and nesting**
    - **Property 7: Hyperlink deduplication and structure**
    - **Property 12: Table structure**
    - **Property 13: Blockquote indentation**
    - **Property 14: Code style references**
    - **Validates: Requirements 2.1-2.4, 3.1-3.9, 4.1, 4.3, 5.1-5.3, 6.1-6.3, 11.1-11.3, 12.1-12.2, 13.1-13.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. CriticMarkup and comments
  - [x] 7.1 Implement CriticMarkup track changes (w:ins, w:del, substitutions)
    - `{++text++}` → `w:ins` with runs
    - `{--text--}` → `w:del` with `w:delText`
    - `{~~old~>new~~}` → `w:del` + `w:ins`
    - Parse author attribution from CriticMarkup, fall back to configured authorName
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.2 Implement CriticMarkup comments (w:commentRangeStart/End, word/comments.xml)
    - `{==text==}{>>author (date): comment<<}` → comment anchors + comments.xml entry
    - Standalone `{>>comment<<}` → zero-width anchor
    - Unique comment IDs consistent across document body and comments.xml
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x]* 7.3 Write property tests for CriticMarkup
    - **Property 8: CriticMarkup revision elements**
    - **Property 9: Comment ID consistency**
    - **Validates: Requirements 7.1-7.4, 8.1-8.2, 8.4**

- [x] 8. Pandoc citations and Zotero field codes
  - [x] 8.1 Implement citation resolution and Zotero field code reconstruction
    - Parse `[@key]`, `[@key, p. 20]`, `[@key1; @key2]` from token stream
    - Look up BibTeX entries, check for zotero-key/zotero-uri
    - With Zotero metadata: reconstruct `ZOTERO_ITEM CSL_CITATION` complex field code with CSL-JSON
    - Without Zotero metadata: emit plain formatted text
    - Map BibTeX fields to CSL-JSON (author, title, container-title, volume, page, issued, DOI)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Implement math equation generation
    - Inline math `$...$` → `m:oMath` using `latexToOmml()`
    - Display math `$$...$$` → `m:oMathPara` containing `m:oMath`
    - _Requirements: 10.1, 10.2_

  - [x]* 8.3 Write property test for Zotero field code reconstruction
    - **Property 10: Zotero field code reconstruction**
    - **Validates: Requirements 9.1, 9.2, 9.4, 9.5**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Template-based export support
  - [x] 10.1 Implement template DOCX style extraction
    - Extract `word/styles.xml`, `word/theme1.xml`, `word/numbering.xml`, `word/settings.xml` from template zip
    - Use extracted parts in output DOCX instead of defaults
    - Merge converter's numbering definitions if not present in template
    - _Requirements: 14.3, 14.4_

- [x] 11. Wire the `convertMdToDocx()` public API
  - Assemble the full pipeline: parse Markdown → parse BibTeX → generate OOXML parts → package zip
  - Handle template option
  - Return `MdToDocxResult` with docx bytes and warnings
  - _Requirements: 1.1, 2.1, 14.2_

- [x] 12. VS Code command integration
  - [x] 12.1 Register submenu and commands in `package.json`
    - Add `scimark.exportDocx` submenu under editor title bar (visible when `editorLangId == markdown`)
    - Add `scimark.exportToWord` command ("Export to Word")
    - Add `scimark.exportToWordWithTemplate` command ("Export to Word (with template)")
    - _Requirements: 14.1_

  - [x] 12.2 Implement command handlers in `extension.ts`
    - "Export to Word": read active MD file, detect companion .bib, call `convertMdToDocx()`, write .docx
    - "Export to Word (with template)": prompt for template .docx via file picker, then same flow
    - Output conflict handling (replace/rename/cancel) following existing pattern from `convertDocx` command
    - Success/error notifications
    - _Requirements: 14.2, 14.3, 14.5, 14.6, 14.7, 14.8, 14.9_

- [x] 13. Full round-trip property test
  - [x]* 13.1 Write property test for MD→DOCX→MD round-trip
    - **Property 15: Full MD→DOCX→MD round-trip**
    - Generate random Markdown with formatting, lists, headings, CriticMarkup, citations
    - Convert to DOCX with `convertMdToDocx()`, convert back with existing `convertDocx()`
    - Compare semantic equivalence
    - **Validates: Requirements 15.1, 15.2, 15.3**

- [x] 14. Documentation update
  - [x] 14.1 Update `docs/converter.md`
    - Remove "One-way: No conversion back from Markdown to DOCX" from Known Limitations
    - Add section documenting the Export to Word feature (usage, template support, citation handling)
    - Describe the feature as an existing capability (not "new" or "now available")
    - _Requirements: 14.1_

  - [x] 14.2 Update `README.md` if it references converter limitations
    - Ensure documentation reflects bidirectional conversion as a feature
    - _Requirements: 14.1_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The existing `convertDocx()` function is used as-is for the round-trip property test (Property 15)
- Template support extracts only styling parts from the template DOCX; document content is always generated from Markdown
