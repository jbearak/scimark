# Requirements Document

## Introduction

Add a Markdown-to-DOCX export command to the Manuscript Markdown VS Code extension, completing the round-trip workflow: DOCX → Markdown (edit) → DOCX (submit). The converter takes a Markdown file (and optionally a companion `.bib` file) and produces a valid `.docx` archive that opens in Microsoft Word, LibreOffice, and Google Docs. It must handle all formatting the existing DOCX-to-Markdown converter produces: character formatting, headings, lists, hyperlinks, CriticMarkup track changes, comments, Pandoc citations with Zotero metadata reconstruction, LaTeX math, colored highlights, and tables.

An earlier spec (`.kiro/specs/markdown-to-docx-conversion/`) covers basic formatting, headings, lists, and hyperlinks. This spec supersedes it by adding CriticMarkup, citations/BibTeX, math, colored highlights, tables, blockquotes, and the VS Code command integration.

## Glossary

- **Converter**: The `md-to-docx` module that transforms Markdown text (plus optional BibTeX) into a `.docx` Uint8Array.
- **OOXML**: Office Open XML — the ISO/ECMA standard format used by `.docx` files.
- **Run**: A `w:r` element representing a contiguous text span with uniform formatting.
- **CriticMarkup**: Annotation syntax for additions (`{++...++}`), deletions (`{--...--}`), substitutions (`{~~old~>new~~}`), highlights (`{==...==}`), and comments (`{>>...<<}`).
- **Pandoc_Citation**: Inline citation syntax `[@key]` or `[@key, p. 20]` referencing BibTeX entries.
- **BibTeX**: Bibliography database format; companion `.bib` files store citation metadata including optional `zotero-key` and `zotero-uri` custom fields.
- **Zotero_Field_Code**: An `ADDIN ZOTERO_ITEM CSL_CITATION {...}` complex field in DOCX that preserves Zotero citation metadata for round-trip editing.
- **OMML**: Office Math Markup Language — the XML format for equations in OOXML documents.
- **Display_Math**: A LaTeX equation delimited by `$$...$$` that renders as a block-level equation.
- **Inline_Math**: A LaTeX equation delimited by `$...$` that renders inline with surrounding text.
- **Colored_Highlight**: The `==text=={color}` syntax for colored highlights, where color is one of the 14 supported ST_HighlightColor values.

## Requirements

### Requirement 1: Markdown Parsing

**User Story:** As a developer, I want the converter to parse Manuscript Markdown into a structured representation, so that each element can be mapped to OOXML constructs.

#### Acceptance Criteria

1. WHEN a Markdown string is provided, THE Converter SHALL parse it into a structured token stream covering: paragraphs, headings (levels 1–6), bold, italic, underline, strikethrough, standard highlights (`==text==`), colored highlights (`==text=={color}`), superscript, subscript, hyperlinks, bulleted lists, numbered lists, blockquotes, inline code, fenced code blocks, tables, inline math (`$...$`), display math (`$$...$$`), CriticMarkup patterns (`{++...++}`, `{--...--}`, `{~~...~>...~~}`, `{==...==}`, `{>>...<<}`), and Pandoc citations (`[@key]`, `[@key, p. N]`, `[@key1; @key2]`).
2. WHEN the Markdown contains nested formatting (e.g., `***bold italic***`), THE Converter SHALL preserve all active formatting layers in the token stream.
3. THE Converter SHALL produce a pretty-printed Markdown string from the parsed token stream.
4. FOR ALL valid Markdown token streams, parsing the pretty-printed output SHALL produce a semantically equivalent token stream (round-trip property).

### Requirement 2: DOCX Archive Structure

**User Story:** As a user exporting Markdown to DOCX, I want the output to be a valid `.docx` zip archive that opens in Word without errors.

#### Acceptance Criteria

1. THE Converter SHALL produce a zip archive containing at minimum: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, and `word/styles.xml`.
2. WHEN the document contains lists, THE Converter SHALL include `word/numbering.xml` with proper content type declaration.
3. WHEN the document contains hyperlinks, THE Converter SHALL include `word/_rels/document.xml.rels` with relationship entries for each unique URL.
4. WHEN the document contains comments, THE Converter SHALL include `word/comments.xml` with proper content type and relationship declarations.

### Requirement 3: Character Formatting

**User Story:** As a user exporting Markdown to DOCX, I want all character-level formatting to produce correct OOXML run properties.

#### Acceptance Criteria

1. WHEN the Markdown contains `**text**`, THE Converter SHALL emit a `w:r` element whose `w:rPr` contains a bare `<w:b/>` element.
2. WHEN the Markdown contains `*text*`, THE Converter SHALL emit a `w:r` element whose `w:rPr` contains a bare `<w:i/>` element.
3. WHEN the Markdown contains `<u>text</u>`, THE Converter SHALL emit a `w:r` element whose `w:rPr` contains `<w:u w:val="single"/>`.
4. WHEN the Markdown contains `~~text~~`, THE Converter SHALL emit a `w:r` element whose `w:rPr` contains a bare `<w:strike/>` element.
5. WHEN the Markdown contains `==text==`, THE Converter SHALL emit a `w:r` element whose `w:rPr` contains `<w:highlight w:val="yellow"/>`.
6. WHEN the Markdown contains `==text=={color}` where color is a valid ST_HighlightColor value, THE Converter SHALL emit `<w:highlight w:val="{color}"/>` using the specified color.
7. WHEN the Markdown contains `<sup>text</sup>`, THE Converter SHALL emit `<w:vertAlign w:val="superscript"/>`.
8. WHEN the Markdown contains `<sub>text</sub>`, THE Converter SHALL emit `<w:vertAlign w:val="subscript"/>`.
9. WHEN a text span has multiple active formats, THE Converter SHALL emit a single `w:rPr` containing all applicable formatting elements.

### Requirement 4: Headings

**User Story:** As a user exporting Markdown to DOCX, I want `# Heading` through `###### Heading` to produce DOCX heading paragraphs.

#### Acceptance Criteria

1. WHEN the Markdown contains a heading (level 1–6), THE Converter SHALL emit a `w:p` element whose `w:pPr` contains `<w:pStyle w:val="HeadingN"/>` where N is the heading level.
2. THE `word/styles.xml` SHALL define style entries for `Heading1` through `Heading6`.
3. WHEN a heading contains formatted runs, THE Converter SHALL apply character-level formatting within the heading paragraph.

### Requirement 5: Lists

**User Story:** As a user exporting Markdown to DOCX, I want bulleted and numbered lists to produce proper OOXML list structures.

#### Acceptance Criteria

1. WHEN the Markdown contains an unordered list item, THE Converter SHALL emit a `w:p` element whose `w:pPr` contains a `w:numPr` referencing a bullet numbering definition with `<w:numFmt w:val="bullet"/>`.
2. WHEN the Markdown contains an ordered list item, THE Converter SHALL emit a `w:p` element whose `w:pPr` contains a `w:numPr` referencing an ordered numbering definition with `<w:numFmt w:val="decimal"/>`.
3. WHEN a list item is nested, THE Converter SHALL set the `w:ilvl` value in `w:numPr` to the appropriate indentation level.

### Requirement 6: Hyperlinks

**User Story:** As a user exporting Markdown to DOCX, I want `[text](url)` links to produce OOXML hyperlinks.

#### Acceptance Criteria

1. WHEN the Markdown contains `[text](url)`, THE Converter SHALL emit a `w:hyperlink` element with an `r:id` referencing a relationship entry with `TargetMode="External"`.
2. Each unique URL SHALL produce exactly one relationship entry; multiple links to the same URL SHALL share the same `r:id`.
3. WHEN a hyperlink contains formatted text, THE Converter SHALL apply run properties to the runs inside the `w:hyperlink` element.

### Requirement 7: CriticMarkup Track Changes

**User Story:** As a user exporting Markdown to DOCX, I want CriticMarkup additions and deletions to produce Word track changes (revisions), so that collaborators can accept or reject changes in Word.

#### Acceptance Criteria

1. WHEN the Markdown contains `{++text++}`, THE Converter SHALL emit a `w:ins` revision element containing the added text as runs.
2. WHEN the Markdown contains `{--text--}`, THE Converter SHALL emit a `w:del` revision element containing the deleted text wrapped in `w:delText` elements.
3. WHEN the Markdown contains `{~~old~>new~~}`, THE Converter SHALL emit a `w:del` element for the old text followed by a `w:ins` element for the new text.
4. WHEN CriticMarkup includes author attribution (e.g., `{>>author (date): ...<<}`), THE Converter SHALL set the `w:author` and `w:date` attributes on the revision elements.
5. WHEN no author attribution is present, THE Converter SHALL use the configured `manuscriptMarkdown.authorName` setting (falling back to OS username) and the current timestamp.

### Requirement 8: CriticMarkup Comments

**User Story:** As a user exporting Markdown to DOCX, I want CriticMarkup comments to produce Word comments, so that collaborators see them in the Word review pane.

#### Acceptance Criteria

1. WHEN the Markdown contains `{==text==}{>>author (date): comment<<}`, THE Converter SHALL emit a Word comment anchored to the highlighted text range using `w:commentRangeStart`, `w:commentRangeEnd`, and `w:commentReference` elements.
2. THE comment entry in `word/comments.xml` SHALL include the author name and date from the CriticMarkup attribution.
3. WHEN a standalone comment `{>>comment<<}` appears without preceding highlight, THE Converter SHALL emit a zero-width comment anchor at the comment position.
4. Each comment SHALL have a unique numeric ID consistent across `word/comments.xml` and the document body references.

### Requirement 9: Pandoc Citations and BibTeX

**User Story:** As a user exporting Markdown to DOCX, I want `[@key]` citations to produce formatted citation text in the DOCX, and when Zotero metadata is available in the BibTeX, I want Zotero field codes reconstructed so I can continue editing citations in Word with Zotero.

#### Acceptance Criteria

1. WHEN the Markdown contains `[@key]` and a companion `.bib` file is available, THE Converter SHALL resolve the citation key against the BibTeX entries.
2. WHEN the BibTeX entry contains `zotero-key` and `zotero-uri` fields, THE Converter SHALL reconstruct a `ZOTERO_ITEM CSL_CITATION` complex field code containing the original Zotero metadata.
3. WHEN the BibTeX entry lacks Zotero metadata, THE Converter SHALL emit the citation as plain formatted text (e.g., "(Author Year)").
4. WHEN the citation includes a locator (`[@key, p. 20]`), THE Converter SHALL include the locator in the reconstructed Zotero field code's `citationItems`.
5. WHEN multiple citations appear in a single bracket (`[@key1; @key2]`), THE Converter SHALL group them into a single Zotero field code with multiple `citationItems`.
6. THE Converter SHALL parse BibTeX files including entries with `zotero-key`, `zotero-uri`, and standard bibliographic fields.
7. FOR ALL valid BibTeX entries, parsing then serializing SHALL produce a semantically equivalent BibTeX string (round-trip property for the BibTeX parser).

### Requirement 10: Math Equations

**User Story:** As a user exporting Markdown to DOCX, I want LaTeX math to produce OMML equations in the DOCX output.

#### Acceptance Criteria

1. WHEN the Markdown contains inline math `$...$`, THE Converter SHALL emit an `m:oMath` element with the equivalent OMML representation.
2. WHEN the Markdown contains display math `$$...$$`, THE Converter SHALL emit an `m:oMathPara` element containing an `m:oMath` element.
3. THE Converter SHALL support common LaTeX constructs: fractions (`\frac`), superscripts (`^`), subscripts (`_`), square roots (`\sqrt`), summation/integral (`\sum`, `\int`), Greek letters, and delimiters.
4. IF the LaTeX contains unsupported constructs, THEN THE Converter SHALL emit a fallback text run containing the raw LaTeX string rather than producing invalid OMML.

### Requirement 11: Tables

**User Story:** As a user exporting Markdown to DOCX, I want pipe-delimited Markdown tables to produce Word tables.

#### Acceptance Criteria

1. WHEN the Markdown contains a pipe-delimited table, THE Converter SHALL emit a `w:tbl` element with `w:tr` rows and `w:tc` cells.
2. THE first row SHALL be treated as the header row with appropriate styling.
3. WHEN table cells contain formatted text, THE Converter SHALL apply character-level formatting within the cell paragraphs.
4. THE Converter SHALL set table borders and cell margins for consistent rendering across Word, LibreOffice, and Google Docs.

### Requirement 12: Blockquotes

**User Story:** As a user exporting Markdown to DOCX, I want `> quoted text` to produce visually distinct blockquote paragraphs in the DOCX output.

#### Acceptance Criteria

1. WHEN the Markdown contains a blockquote (`> text`), THE Converter SHALL emit a `w:p` element with a paragraph style or indentation that visually distinguishes it as a quote.
2. WHEN blockquotes are nested (`>> text`), THE Converter SHALL increase the indentation level accordingly.

### Requirement 13: Code Blocks and Inline Code

**User Story:** As a user exporting Markdown to DOCX, I want code to use standard Word character and paragraph styles, so that the output follows conventional DOCX formatting practices.

#### Acceptance Criteria

1. WHEN the Markdown contains inline code (`` `code` ``), THE Converter SHALL emit a run referencing a character style (e.g., `CodeChar`) defined in `word/styles.xml` that applies a monospace font.
2. WHEN the Markdown contains a fenced code block, THE Converter SHALL emit paragraphs referencing a paragraph style (e.g., `CodeBlock`) defined in `word/styles.xml` that applies a monospace font and shaded background.

### Requirement 14: VS Code Command Integration

**User Story:** As a user, I want to export the current Markdown file to DOCX via a submenu, with the option to use a template DOCX for styling, so that I can produce a Word document that matches my journal or institution's formatting requirements.

#### Acceptance Criteria

1. THE Extension SHALL register an "Export to Word" submenu in the editor title bar when a Markdown file is active, containing two commands: "Export to Word" and "Export to Word (with template)".
2. WHEN the user selects "Export to Word", THE Extension SHALL convert the active Markdown document to DOCX using default styles.
3. WHEN the user selects "Export to Word (with template)", THE Extension SHALL prompt the user to select a `.docx` template file via a file picker, then convert the Markdown using styles extracted from the template.
4. WHEN a template DOCX is provided, THE Converter SHALL extract `word/styles.xml` (and optionally `word/numbering.xml`, `word/theme1.xml`, and `word/settings.xml`) from the template and use them in the output DOCX, so that headings, body text, and other elements inherit the template's fonts, sizes, colors, and spacing.
5. WHEN a companion `.bib` file exists with the same base name as the Markdown file, THE Extension SHALL automatically load it for citation resolution.
6. THE Extension SHALL write the output `.docx` file using the same base name as the Markdown file.
7. IF the output `.docx` file already exists, THEN THE Extension SHALL prompt the user with replace/rename/cancel options before overwriting.
8. WHEN the conversion completes, THE Extension SHALL display a success notification with the output file path.
9. IF the conversion fails, THEN THE Extension SHALL display an error message describing the failure.

### Requirement 15: Round-Trip Fidelity

**User Story:** As a user, I want Markdown→DOCX→Markdown conversion to preserve my content, so that I don't lose information when round-tripping.

#### Acceptance Criteria

1. WHEN a Markdown document containing supported formatting is converted to DOCX and back to Markdown using the existing DOCX-to-Markdown converter, THE output Markdown SHALL be semantically equivalent to the input for: bold, italic, underline, strikethrough, highlight (including colored), superscript, subscript, hyperlinks, headings (levels 1–6), bullet lists, numbered lists, and plain text paragraphs.
2. WHEN a Markdown document containing CriticMarkup additions and deletions is round-tripped, THE output SHALL preserve the tracked changes with equivalent CriticMarkup syntax.
3. WHEN a Markdown document containing `[@key]` citations with Zotero BibTeX metadata is round-tripped, THE output SHALL preserve the citation keys and locators.
