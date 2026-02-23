# Implementation Plan: Image Roundtrip

## Overview

Add full roundtrip image support to the DOCX ↔ Markdown converter. This involves extending `src/converter.ts` (DOCX→MD) to extract images and `src/md-to-docx.ts` (MD→DOCX) to embed images, with metadata preservation for syntax format, dimensions, and alt text. Shared utilities (EMU conversion, intrinsic dimension reading, format detection) are implemented first, then each direction is built incrementally, followed by roundtrip wiring and documentation updates.

## Tasks

- [ ] 1. Add shared image utilities
  - [ ] 1.1 Create image utility module with EMU↔pixel conversion, supported format detection, and content type mapping
    - Create a new file `src/image-utils.ts`
    - Implement `EMU_PER_PIXEL` constant (9525), `emuToPixels(emu)`, `pixelsToEmu(px)` functions
    - Implement `SUPPORTED_IMAGE_EXTENSIONS` set and `IMAGE_CONTENT_TYPES` record
    - Implement `isSupportedImageFormat(ext: string): boolean` helper
    - _Requirements: 6.1, 6.2, 1.9, 2.11_

  - [ ]* 1.2 Write property test: EMU↔pixel conversion roundtrip (Property 1)
    - **Property 1: EMU↔pixel conversion roundtrip**
    - For any positive integer pixel value, `emuToPixels(pixelsToEmu(px))` shall equal `px`
    - Use `fc.integer({ min: 1, max: 10000 })` generator
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 1.3 Write property test: Supported format filtering (Property 9)
    - **Property 9: Supported format filtering**
    - For any extension in the supported set, `isSupportedImageFormat` returns true; for any unsupported extension, it returns false
    - Use `fc.constantFrom('png', 'jpg', 'jpeg', 'gif', 'svg')` and `fc.constantFrom('bmp', 'tiff', 'webp', 'emf', 'wmf')` generators
    - **Validates: Requirements 1.9, 2.11**

  - [ ] 1.4 Implement intrinsic dimension reader
    - Add `readImageDimensions(data: Uint8Array, format: string): { width: number; height: number } | null` to `src/image-utils.ts`
    - Parse PNG IHDR chunk (bytes 16–23), JPEG SOF0/SOF2 markers, GIF header (bytes 6–9), SVG width/height/viewBox attributes
    - For SVG: handle units (mm, pt) by converting to pixels (96 DPI) and treat `viewBox` coordinates as pixels
    - _Requirements: 2.9, 4.2, 4.3, 5.4_

  - [ ]* 1.5 Write property test: Aspect ratio preservation (Property 6)
    - **Property 6: Aspect ratio preservation**
    - For any intrinsic dimensions and a single explicit dimension (width-only or height-only), the computed missing dimension preserves the aspect ratio within ±1 pixel
    - Use `fc.integer({ min: 1, max: 10000 })` for dimensions
    - **Validates: Requirements 4.2, 4.3**

  - [ ] 1.6 Standardize warning messages
    - Define a set of standard templates for image-related warnings (e.g., "Image not found: {path}", "Unsupported image format ({ext}) for: {path}", "Could not read dimensions for {path}; using default (100x100)") to be used across the conversion process

- [ ] 2. Implement DOCX→MD image extraction in converter.ts
  - [ ] 2.1 Extend relationship parsing to capture image relationships
    - Add `parseImageRelationships(zip: JSZip)` function that parses `word/_rels/document.xml.rels` for relationships with Type ending in `/image`
    - Return `Map<string, string>` mapping rId → target path (e.g., `"rId4" → "media/image1.png"`)
    - _Requirements: 1.1, 1.10_

  - [ ] 2.2 Implement image format metadata extraction
    - Add `extractImageFormatMapping(data: Uint8Array | JSZip)` function using the existing `extractIdMappingFromCustomXml` pattern with key `MANUSCRIPT_IMAGE_FORMATS`
    - Return `Map<string, string>` mapping rId → syntax (`"md"` or `"html"`)
    - Handle missing/invalid metadata by defaulting to `"md"` (Attribute_Syntax)
    - _Requirements: 3.3, 3.4, 3.6_

  - [ ]* 2.3 Write property test: Image format metadata serialization roundtrip (Property 11)
    - **Property 11: Image format metadata serialization roundtrip**
    - For any mapping of rIds to syntax identifiers, serializing to chunked-JSON and deserializing produces the original mapping
    - Use `fc.dictionary(fc.integer({ min: 1, max: 100 }).map(n => 'rId' + String(n)), fc.constantFrom('md', 'html'))` generator
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 2.4 Add image ContentItem variant and extend extractDocumentContent
    - Add `image` variant to the ContentItem type union with fields: `rId`, `src`, `alt`, `widthPx`, `heightPx`, `commentIds`
    - Extend `extractDocumentContent()` to detect `<w:drawing>` elements containing `<wp:inline>` or `<wp:anchor>`
    - Extract rId from `<a:blip r:embed="...">`, alt text from `<wp:docPr descr="...">`, dimensions from `<wp:extent cx="..." cy="...">`, filename from `<wp:docPr name="...">`
    - Convert EMU dimensions to pixels using `emuToPixels()`
    - Track image extraction entries: `{ rId, mediaPath, preferredFilename }`
    - Skip unsupported formats with a warning
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 2.5 Write property test: Filename resolution priority (Property 10)
    - **Property 10: Filename resolution priority**
    - When `<wp:docPr>` name has a valid image extension, use that filename; otherwise fall back to media filename
    - Use generators for filenames with/without valid extensions
    - **Validates: Requirements 1.2**

  - [ ] 2.6 Extend renderInlineRange to emit image Markdown
    - Handle `item.type === 'image'` in `renderInlineRange()`
    - Emit `![alt](src){width=N height=N}` for `"md"` syntax or `<img src="src" alt="alt" width="N" height="N">` for `"html"` syntax based on image format mapping
    - _Requirements: 1.4, 1.5, 1.6, 3.3, 3.4_

  - [ ] 2.7 Extend convertDocx to return extracted image binaries
    - Update `ConvertResult` interface to include `images?: Map<string, Uint8Array>` (relative path → binary data)
    - Wire `parseImageRelationships`, `extractImageFormatMapping`, and image binary extraction from `word/media/` into the `convertDocx()` pipeline
    - Create Image_Folder path from the markdown filename basename
    - Handle deduplication: only extract each image file once even if referenced multiple times
    - _Requirements: 1.2, 1.3, 1.10_

- [ ] 3. Checkpoint - Verify DOCX→MD extraction
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement MD→DOCX image embedding in md-to-docx.ts
  - [ ] 4.1 Implement image attribute parsing for `{width=N height=N}` syntax
    - Add an `imageAttributeRule` (inline rule or post-processing pass) to the markdown-it pipeline that detects `{width=N height=N}` after image tokens and attaches parsed dimensions
    - Handle partial attributes (width-only, height-only), unrecognized attributes (ignore them), and positive integer validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 Write property test: Image attribute parsing (Property 5)
    - **Property 5: Image attribute parsing**
    - For any valid image reference with dimensions, parsing extracts the correct src, alt, width, and height values
    - Test both `![alt](path){width=W height=H}` and `<img>` syntax
    - Use bounded generators for dimensions and filtered string generators for alt text
    - **Validates: Requirements 4.1, 4.5, 5.1, 5.2, 5.3**

  - [ ] 4.3 Extend MdRun type and processInlineChildren for images
    - Add `'image'` to the MdRun type union with fields: `imageSrc`, `imageAlt`, `imageWidth`, `imageHeight`, `imageSyntax`
    - Extend `processInlineChildren()` to handle markdown-it `image` tokens by creating `image` MdRuns
    - Extend `processInlineChildren()` to handle `html_inline` tokens matching `<img ...>` by parsing src, alt, width, height attributes
    - _Requirements: 2.1, 2.2, 5.1, 5.2, 5.3, 5.4_

  - [ ] 4.4 Extend DocxGenState for image tracking
    - Add `imageRelationships`, `imageBinaries`, `imageFormats`, `imageExtensions` fields to `DocxGenState`
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [ ] 4.5 Extend generateRuns to emit `<w:drawing>` OOXML for images
    - When encountering an `image` MdRun, generate the full `<w:drawing><wp:inline>` XML structure with `<wp:extent>`, `<wp:docPr>`, `<a:blip>`, and `<pic:spPr>` elements
    - Allocate relationship IDs, store image binary in state, handle deduplication using resolved absolute file paths
    - Convert pixel dimensions to EMUs using `pixelsToEmu()`
    - Fall back to intrinsic dimensions when explicit dimensions are not provided
    - Store filename in `<wp:docPr name="...">` for roundtrip recovery
    - Handle missing files (emit warning, skip) and unsupported formats (emit warning, skip)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 8.2_

  - [ ] 4.6 Extend contentTypesXml and documentRelsXml for images
    - Extend `contentTypesXml()` to accept image extensions and emit `<Default Extension="..." ContentType="..."/>` entries
    - Extend `documentRelsXml()` to emit image relationships (Type ending in `/image`, no `TargetMode="External"`)
    - _Requirements: 2.4, 2.6_

  - [ ] 4.7 Implement image format metadata writing
    - Add `imageFormatProps(imageFormats: Map<string, string>): CustomPropEntry[]` function using the chunked-JSON pattern
    - Wire into `convertMdToDocx()` to write `MANUSCRIPT_IMAGE_FORMATS` custom property
    - _Requirements: 3.1, 3.2_

  - [ ] 4.8 Wire image embedding into convertMdToDocx pipeline
    - Extend `convertMdToDocx()` to read image binaries from disk, resolving paths to absolute locations relative to `options.sourceDir` for deduplication
    - Store image binaries in the ZIP under `word/media/`
    - Generate image format custom properties
    - Pass image state through the generation pipeline
    - _Requirements: 2.1, 2.2, 2.3, 8.2_

- [ ] 5. Checkpoint - Verify MD→DOCX embedding
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Roundtrip integration and property tests
  - [ ] 6.1 Wire image placement in document flow
    - Ensure DOCX→MD emits image references at the correct inline position within paragraphs
    - Ensure MD→DOCX places `<w:drawing>` elements inline within the paragraph run sequence
    - Handle standalone image paragraphs (image as sole content)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 6.2 Write property test: Dimension roundtrip (Property 2)
    - **Property 2: Dimension roundtrip**
    - For any image with explicit integer width and height, MD→DOCX→MD produces the same pixel dimensions
    - Build synthetic DOCX in-memory with JSZip, run through converter
    - Use `fc.integer({ min: 1, max: 10000 })` for dimensions
    - **Validates: Requirements 6.3, 1.6, 2.8**

  - [ ]* 6.3 Write property test: Alt text roundtrip (Property 3)
    - **Property 3: Alt text roundtrip**
    - For any image with non-empty alt text (filtered to exclude `]`, `\n`, XML-special chars), MD→DOCX→MD produces the same alt text
    - Use `fc.string({ minLength: 1, maxLength: 100 })` filtered appropriately
    - **Validates: Requirements 7.3, 1.5, 7.1, 7.2**

  - [ ]* 6.4 Write property test: Syntax format roundtrip (Property 4)
    - **Property 4: Syntax format roundtrip**
    - For any image using either Attribute_Syntax or HTML_Image_Syntax, MD→DOCX→MD preserves the syntax format
    - Use `fc.constantFrom('md', 'html')` generator
    - **Validates: Requirements 3.5, 3.1, 3.2, 3.3**

  - [ ]* 6.5 Write property test: DOCX image structure validity (Property 7)
    - **Property 7: DOCX image structure validity**
    - For any Markdown with images, the exported DOCX contains: image binary in `word/media/`, relationship entry, content type entry, and `<w:drawing>` element with correct `r:embed`
    - Build Markdown with images, export to DOCX, inspect ZIP contents
    - **Validates: Requirements 2.3, 2.4, 2.6, 2.7, 2.12**

  - [ ]* 6.6 Write property test: Image deduplication (Property 8)
    - **Property 8: Image deduplication**
    - For any Markdown with multiple references to the same image path, the DOCX contains exactly one media binary and one relationship, with multiple `<w:drawing>` elements sharing the same rId
    - **Validates: Requirements 2.5, 1.10**

- [ ] 7. Checkpoint - Verify roundtrip integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update user-facing documentation
  - [ ] 8.1 Add Images section to docs/specification.md
    - Document Attribute_Syntax (`![alt](path){width=N height=N}`), HTML_Image_Syntax (`<img ...>`), Supported_Formats (PNG, JPG/JPEG, GIF, SVG), Image_Folder convention, and dimension attributes
    - _Requirements: 9.1_

  - [ ] 8.2 Update docs/converter.md
    - Remove "Images: Not extracted from DOCX" from Known Limitations
    - Add "Images" entry to Round-Trip Features list describing extraction and embedding with dimension/alt text/syntax preservation
    - Add a converter section documenting image extraction behavior (Image_Folder creation, filename resolution, EMU→pixel conversion) and embedding behavior (file reading, Drawing_Element generation, Image_Syntax_Metadata)
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ] 8.3 Update docs/guides/documentation.md
    - Add mention of image support in the feature capabilities section
    - _Requirements: 9.5_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with short bounded generators to avoid timeouts (per AGENTS.md)
- Property tests go in `src/image-roundtrip.property.test.ts`, unit tests in `src/image-roundtrip.test.ts`
- Synthetic DOCX ZIPs are built in-memory using JSZip for tests
- Avoid `$$` in template literals touched by tool text-replacement operations (per AGENTS.md) — use string concatenation instead
- All image binaries are passed as `Map<string, Uint8Array>` to keep converter functions pure (no direct filesystem I/O in core logic)
