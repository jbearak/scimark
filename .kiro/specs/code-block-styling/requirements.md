# Requirements Document

## Introduction

The Word document generator (`md-to-docx.ts`) currently styles fenced code blocks using a `CodeBlock` paragraph style that applies horizontal indentation (`w:ind`) to simulate padding. This approach has a known OOXML limitation: paragraph shading (`w:shd`) does not extend into the indent area, preventing a uniform colored background.

This feature replaces the indentation-based approach with a combination of paragraph shading and color-matched paragraph borders. The border's `w:space` attribute creates visual inset padding within a uniformly colored block. A new `code-background-color` YAML frontmatter field controls the behavior: by default the shading+border approach is used; setting `code-background-color` to `none` or `transparent` falls back to the existing indentation-based inset. A companion `code-font-color` YAML frontmatter field controls the text (font) color used within code blocks. A `code-block-inset` YAML frontmatter field allows overriding the default border width (`w:sz`) for code blocks in shading mode.

Additionally, inline code regions (backtick-delimited `` `code` `` in Markdown) are styled with the same background and foreground colors as code blocks. In OOXML, inline code uses character-level run properties (`w:rPr`) with `w:shd` for background and `w:color` for text color, applied via the `CodeChar` character style.

## Glossary

- **Word_Generator**: The `md-to-docx.ts` module that converts Markdown to DOCX format.
- **CodeBlock_Style**: The named paragraph style (`w:styleId="CodeBlock"`) defined in `styles.xml` and referenced by each code block paragraph.
- **Shading_Fill**: The `w:shd` element within `w:pPr` that sets a background color on a paragraph.
- **Paragraph_Border**: The `w:pBdr` element within `w:pPr` that defines borders on all four sides of a paragraph.
- **Frontmatter**: The YAML metadata block delimited by `---` at the start of a Markdown document.
- **Inset_Mode**: The legacy code block styling that uses `w:ind` left/right indentation for visual padding, with no background color.
- **Shading_Mode**: The new default code block styling that uses `w:shd` fill color combined with color-matched `w:pBdr` borders to create a filled, inset code region.
- **Frontmatter_Parser**: The `parseFrontmatter` function in `frontmatter.ts` that extracts metadata from the YAML block.
- **Frontmatter_Serializer**: The `serializeFrontmatter` function in `frontmatter.ts` that writes metadata back to YAML.
- **Code_Font_Color**: The text (font) color applied to code block and inline code content via `w:rPr > w:color` in the CodeBlock_Style and InlineCode_Style run properties.
- **InlineCode_Style**: The named character style (`w:styleId="CodeChar"`) defined in `styles.xml` and referenced by inline code runs via `w:rStyle`.
- **Code_Block_Inset**: The `w:sz` attribute value (in eighths of a point) applied to all four `w:pBdr` border elements in Shading_Mode, controlling the visual border width of code blocks.

## Requirements

### Requirement 1: CodeBlock Style Definition in Shading Mode

**User Story:** As a document author, I want code blocks to appear as filled, inset regions with a uniform background color, so that code is visually distinct from surrounding prose.

#### Acceptance Criteria

1. WHEN the Word_Generator produces `styles.xml` in Shading_Mode, THE CodeBlock_Style SHALL include a `w:shd` element with `w:val="clear"` and `w:fill` set to the configured background hex color.
2. WHEN the Word_Generator produces `styles.xml` in Shading_Mode, THE CodeBlock_Style SHALL include a `w:pBdr` element with `w:top`, `w:bottom`, `w:left`, and `w:right` child elements.
3. THE CodeBlock_Style `w:pBdr` borders SHALL each use `w:val="single"`, the same hex color as the Shading_Fill, a `w:space` attribute to control the gap between the border line and the text, and a `w:sz` attribute set to the configured Code_Block_Inset value (or the default).
4. WHEN the Word_Generator produces `styles.xml` in Shading_Mode, THE CodeBlock_Style SHALL NOT include `w:ind` left or right indentation.
5. THE CodeBlock_Style SHALL retain `w:spacing w:after="0"` and `w:line="240"` with `w:lineRule="auto"` in both modes.
6. WHEN a `code-font-color` value is configured, THE CodeBlock_Style SHALL include a `w:rPr` element containing a `w:color` element with `w:val` set to the configured hex color.

### Requirement 2: CodeBlock Style Definition in Inset Mode

**User Story:** As a document author, I want to opt out of the colored background and use the legacy indentation-based code block styling, so that I can produce documents without colored code regions.

#### Acceptance Criteria

1. WHEN the `code-background-color` frontmatter field is set to `none`, THE CodeBlock_Style SHALL use `w:ind` left and right indentation (the existing Inset_Mode behavior) and SHALL NOT include `w:shd` or `w:pBdr`.
2. WHEN the `code-background-color` frontmatter field is set to `transparent`, THE CodeBlock_Style SHALL use `w:ind` left and right indentation (the existing Inset_Mode behavior) and SHALL NOT include `w:shd` or `w:pBdr`.

### Requirement 3: Uniform Paragraph Treatment

**User Story:** As a document author, I want every line in a code block to be styled identically, so that the code region appears as a single continuous block.

#### Acceptance Criteria

1. THE Word_Generator SHALL apply the same `w:pPr` (referencing the CodeBlock_Style by name) to every paragraph in a fenced code block, regardless of whether the paragraph is the first, middle, or last line.
2. WHEN operating in Shading_Mode, THE Word_Generator SHALL NOT emit per-paragraph `w:spacing w:before` or `w:after` overrides that differ between first, middle, and last code block paragraphs.
3. WHEN operating in Inset_Mode, THE Word_Generator SHALL apply `w:spacing w:before` and `w:after` overrides to the first and last paragraphs respectively, preserving the existing inset behavior.

### Requirement 4: Frontmatter Field — code-background-color

**User Story:** As a document author, I want to control the code block background color via a YAML frontmatter field, so that I can customize the appearance or disable it.

#### Acceptance Criteria

1. THE Frontmatter_Parser SHALL recognize a `code-background-color` key in the YAML frontmatter block as the canonical field name.
2. THE Frontmatter_Parser SHALL recognize `code-background` as an alias for `code-background-color` and map it to the same `codeBackgroundColor` field on the `Frontmatter` object.
3. WHEN `code-background-color` is set to a valid 6-digit hex color string (e.g., `E8E8E8`), THE Frontmatter_Parser SHALL store the value as the `codeBackgroundColor` field on the `Frontmatter` object.
4. WHEN `code-background-color` is set to `none` or `transparent`, THE Frontmatter_Parser SHALL store the literal string value (`none` or `transparent`) as the `codeBackgroundColor` field.
5. WHEN `code-background-color` is absent from the frontmatter, THE Word_Generator SHALL default to Shading_Mode with a default background color.
6. THE Frontmatter_Serializer SHALL emit the canonical `code-background-color` field name when the `codeBackgroundColor` value is present on the `Frontmatter` object.

### Requirement 5: Style-Based Emission

**User Story:** As a document author, I want code block formatting to be defined as a named style rather than inline XML, so that the generated DOCX is clean and the style can be modified in Word.

#### Acceptance Criteria

1. THE Word_Generator SHALL define the code block formatting (shading, borders, spacing) within the named CodeBlock_Style in `styles.xml`.
2. THE Word_Generator SHALL reference the CodeBlock_Style by style name (`<w:pStyle w:val="CodeBlock"/>`) on each code paragraph rather than emitting the full formatting XML inline.

### Requirement 6: DOCX-to-Markdown Round-Trip Preservation

**User Story:** As a document author, I want the code-background-color setting to survive a round-trip conversion (MD → DOCX → MD), so that my formatting preferences are not lost.

#### Acceptance Criteria

1. WHEN a Markdown document with a `code-background-color` frontmatter field is converted to DOCX and back to Markdown, THE converter SHALL preserve the `code-background-color` value in the resulting frontmatter.
2. WHEN a Markdown document without a `code-background-color` frontmatter field is converted to DOCX and back to Markdown, THE converter SHALL NOT emit a `code-background-color` field in the resulting frontmatter.
3. WHEN a DOCX file with a CodeBlock_Style using Shading_Mode is converted to Markdown, THE converter SHALL detect the code block paragraphs by the `CodeBlock` style ID regardless of whether shading or indentation is present.

### Requirement 7: Custom Background Color

**User Story:** As a document author, I want to specify a custom hex color for the code block background, so that I can match my document's color scheme.

#### Acceptance Criteria

1. WHEN `code-background-color` is set to a 6-digit hex color string (e.g., `ADD8E6`), THE Word_Generator SHALL use that color as the `w:fill` value in `w:shd` and as the `w:color` value in all four `w:pBdr` border elements.
2. WHEN `code-background-color` is set to an invalid value (not a 6-digit hex string, not `none`, and not `transparent`), THE Frontmatter_Parser SHALL ignore the field and THE Word_Generator SHALL use the default background color.

### Requirement 8: Frontmatter Field — code-font-color

**User Story:** As a document author, I want to control the text color used inside code blocks and inline code via a YAML frontmatter field, so that I can customize code readability against the chosen background.

#### Acceptance Criteria

1. THE Frontmatter_Parser SHALL recognize a `code-font-color` key in the YAML frontmatter block as the canonical field name.
2. THE Frontmatter_Parser SHALL recognize `code-color` as an alias for `code-font-color` and map it to the same `codeFontColor` field on the `Frontmatter` object.
3. WHEN `code-font-color` is set to a valid 6-digit hex color string (e.g., `2E2E2E`), THE Frontmatter_Parser SHALL store the value as the `codeFontColor` field on the `Frontmatter` object.
4. WHEN `code-font-color` is absent from the frontmatter, THE Word_Generator SHALL use a default text color for code blocks and inline code.
5. WHEN `code-font-color` is set to an invalid value (not a 6-digit hex string), THE Frontmatter_Parser SHALL ignore the field and THE Word_Generator SHALL use the default text color.
6. THE Frontmatter_Serializer SHALL emit the canonical `code-font-color` field name when the `codeFontColor` value is present on the `Frontmatter` object.

### Requirement 9: DOCX-to-Markdown Round-Trip Preservation of code-font-color

**User Story:** As a document author, I want the code-font-color setting to survive a round-trip conversion (MD → DOCX → MD), so that my text color preference is not lost.

#### Acceptance Criteria

1. WHEN a Markdown document with a `code-font-color` frontmatter field is converted to DOCX and back to Markdown, THE converter SHALL preserve the `code-font-color` value in the resulting frontmatter.
2. WHEN a Markdown document without a `code-font-color` frontmatter field is converted to DOCX and back to Markdown, THE converter SHALL NOT emit a `code-font-color` field in the resulting frontmatter.

### Requirement 10: Inline Code Styling

**User Story:** As a document author, I want inline code (backtick-delimited regions) to be styled with the same background and text colors as code blocks, so that all code in my document has a consistent visual appearance.

#### Acceptance Criteria

1. WHEN the Word_Generator produces `styles.xml` in Shading_Mode, THE InlineCode_Style SHALL include a `w:shd` element in its `w:rPr` with `w:val="clear"` and `w:fill` set to the configured background hex color.
2. WHEN a `code-font-color` value is configured, THE InlineCode_Style SHALL include a `w:color` element in its `w:rPr` with `w:val` set to the configured hex color.
3. WHEN the Word_Generator operates in Inset_Mode (`code-background-color` is `none` or `transparent`), THE InlineCode_Style SHALL NOT include a `w:shd` element in its `w:rPr`.
4. WHEN `code-background-color` is absent from the frontmatter, THE InlineCode_Style SHALL use the default background color for its `w:shd` fill.
5. THE InlineCode_Style SHALL remain a character style (`w:type="character"`) and SHALL NOT include paragraph-level properties (`w:pPr`).
6. THE `code-block-inset` frontmatter field SHALL NOT affect the InlineCode_Style.

### Requirement 11: Frontmatter Field — code-block-inset

**User Story:** As a document author, I want to control the border width of code blocks in shading mode via a YAML frontmatter field, so that I can adjust the visual padding around code regions.

#### Acceptance Criteria

1. THE Frontmatter_Parser SHALL recognize a `code-block-inset` key in the YAML frontmatter block.
2. WHEN `code-block-inset` is set to a positive integer, THE Frontmatter_Parser SHALL store the value as the `codeBlockInset` field on the `Frontmatter` object.
3. WHEN `code-block-inset` is absent from the frontmatter, THE Word_Generator SHALL use the default border width for code block `w:pBdr` elements.
4. WHEN `code-block-inset` is set to an invalid value (not a positive integer), THE Frontmatter_Parser SHALL ignore the field and THE Word_Generator SHALL use the default border width.
5. WHEN a valid `codeBlockInset` value is present, THE Word_Generator SHALL use that value as the `w:sz` attribute on all four `w:pBdr` border elements in Shading_Mode.
6. THE Frontmatter_Serializer SHALL emit the `code-block-inset` field when the `codeBlockInset` value is present on the `Frontmatter` object.

### Requirement 12: DOCX-to-Markdown Round-Trip Preservation of code-block-inset

**User Story:** As a document author, I want the code-block-inset setting to survive a round-trip conversion (MD → DOCX → MD), so that my border width preference is not lost.

#### Acceptance Criteria

1. WHEN a Markdown document with a `code-block-inset` frontmatter field is converted to DOCX and back to Markdown, THE converter SHALL preserve the `code-block-inset` value in the resulting frontmatter.
2. WHEN a Markdown document without a `code-block-inset` frontmatter field is converted to DOCX and back to Markdown, THE converter SHALL NOT emit a `code-block-inset` field in the resulting frontmatter.

### Requirement 13: Documentation of Code Block Frontmatter Fields

**User Story:** As a document author, I want the code block styling frontmatter fields to be documented in the project specification, so that I can discover and understand the available options.

#### Acceptance Criteria

1. THE `docs/specification.md` file SHALL document the `code-background-color` frontmatter field, including its valid values (`6-digit hex`, `none`, `transparent`), default behavior (shading mode with default color), and the `code-background` alias.
2. THE `docs/specification.md` file SHALL document the `code-font-color` frontmatter field, including its valid values (`6-digit hex`), default behavior, and the `code-color` alias.
3. THE `docs/specification.md` file SHALL document the `code-block-inset` frontmatter field, including its valid values (positive integer), default behavior, and its unit (eighths of a point for `w:sz`).
4. THE `docs/specification.md` frontmatter field table SHALL include entries for `code-background-color`, `code-font-color`, and `code-block-inset`.
