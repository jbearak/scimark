# Design Document: Image Roundtrip

## Overview

This feature adds full roundtrip image support to Manuscript Markdown's DOCX ↔ Markdown converter. The two conversion modules — `src/converter.ts` (DOCX→MD) and `src/md-to-docx.ts` (MD→DOCX) — are extended to handle image extraction, embedding, and metadata preservation. The feature also includes updates to user-facing documentation so that the image syntax, converter behavior, and roundtrip capabilities are accurately described.

The core flow:
- **DOCX→MD**: Parse `<w:drawing>` elements, resolve image relationships, extract binaries from `word/media/`, save to a sibling folder, and emit Markdown image references with dimensions and alt text.
- **MD→DOCX**: Parse `![alt](path){width=N height=N}` and `<img>` tags, read image files from disk, embed them into the DOCX ZIP as `word/media/` entries with proper relationships, content types, and `<w:drawing>` OOXML.
- **Roundtrip fidelity**: Preserve syntax format (md vs html) via `MANUSCRIPT_IMAGE_FORMATS` custom property, preserve dimensions (EMU↔pixel conversion), and preserve alt text via `<wp:docPr descr="...">`.
- **Documentation**: Update `docs/specification.md`, `docs/converter.md`, and `docs/guides/documentation.md` to document image syntax, converter behavior, and remove the "Images not supported" limitation.

## Architecture

The image roundtrip feature integrates into the existing converter pipeline at well-defined extension points:

```mermaid
graph TD
    subgraph "DOCX → Markdown (converter.ts)"
        A[parseRelationships] -->|extend for image rels| B[extractDocumentContent]
        B -->|new 'image' ContentItem| C[renderInlineRange / buildMarkdown]
        C -->|emit ![alt](path){w=N h=N}| D[Markdown output]
        B -->|extract binaries| E[Save to Image_Folder]
        F[extractImageFormatMapping] -->|read MANUSCRIPT_IMAGE_FORMATS| C
    end

    subgraph "Markdown → DOCX (md-to-docx.ts)"
        G[processInlineChildren] -->|new 'image' MdRun| H[generateRuns]
        H -->|emit w:drawing OOXML| I[Document XML]
        H -->|store binary in word/media/| J[ZIP assembly]
        H -->|create relationship| K[document.xml.rels]
        H -->|add content type| L[Content_Types.xml]
        H -->|write MANUSCRIPT_IMAGE_FORMATS| M[docProps/custom.xml]
    end
```

### Key Design Decisions

1. **Image ContentItem / MdRun variants**: Follow the existing union type pattern. Add an `image` variant to `ContentItem` (converter.ts) and to `MdRun` (md-to-docx.ts) rather than encoding images as text runs.

2. **Image binary handling**: In DOCX→MD, image binaries are extracted from the ZIP and written to disk via the caller (the extension command or CLI). In MD→DOCX, image binaries are read from disk and stored in the ZIP. The converter functions themselves receive/return image data as `Map<string, Uint8Array>` to keep them pure (no direct filesystem I/O in the core conversion logic).

3. **Relationship extension**: `parseRelationships()` currently filters to hyperlinks only. It will be extended to also capture image relationships (`Type` ending in `/image`), stored in a separate map to avoid collisions with the hyperlink map.

4. **Custom property for syntax format**: Follows the existing chunked-JSON pattern used by `MANUSCRIPT_CODE_BLOCK_LANGS`, `MANUSCRIPT_COMMENT_IDS`, etc. The `MANUSCRIPT_IMAGE_FORMATS` property maps relationship IDs to syntax identifiers (`"md"` or `"html"`).

5. **Dimension conversion**: EMU ↔ pixel conversion uses the standard rate of 9,525 EMUs per pixel. Rounding to nearest integer on EMU→pixel conversion. This means a roundtrip may lose sub-pixel precision, but pixel values are always integers.

6. **Anchor images treated as inline**: `<wp:anchor>` images are extracted identically to `<wp:inline>` images. Wrapping/positioning metadata is discarded. This is documented as a known limitation.

## Components and Interfaces

### converter.ts Changes

#### New ContentItem variant

```typescript
| {
    type: 'image';
    rId: string;           // relationship ID for deduplication and format metadata lookup
    src: string;           // relative path to extracted image file (e.g., "paper/image1.png")
    alt: string;           // alt text from wp:docPr descr attribute
    widthPx: number;       // width in pixels (converted from EMUs)
    heightPx: number;      // height in pixels (converted from EMUs)
    commentIds: Set<string>;
  }
```

#### New/Modified Functions

- **`parseImageRelationships(zip: JSZip)`**: New function. Parses `word/_rels/document.xml.rels` for relationships with `Type` ending in `/image`. Returns `Map<string, string>` mapping rId → target path (e.g., `"rId4" → "media/image1.png"`).

- **`extractImageFormatMapping(data: Uint8Array | JSZip)`**: New function. Reads `MANUSCRIPT_IMAGE_FORMATS` from `docProps/custom.xml` using the same chunked-JSON pattern as `extractIdMappingFromCustomXml`. Returns `Map<string, string>` mapping rId → syntax (`"md"` or `"html"`).

- **`extractDocumentContent()`**: Extended. When encountering a `<w:drawing>` element containing `<wp:inline>` or `<wp:anchor>`, extract the image reference (rId from `<a:blip r:embed="...">`), alt text (from `<wp:docPr descr="...">`), dimensions (from `<wp:extent cx="..." cy="..."/>`), and filename (from `<wp:docPr name="...">`) and push an `image` ContentItem. The image binary extraction is tracked via a returned set of `{ rId, mediaPath, preferredFilename }` entries.

- **`renderInlineRange()`**: Extended. Handle `item.type === 'image'` by emitting either `![alt](src){width=N height=N}` or `<img src="src" alt="alt" width="N" height="N">` depending on the image format mapping.

- **`convertDocx()`**: Extended. After extracting document content, collect image binaries from the ZIP's `word/media/` directory. Return them alongside the markdown string so the caller can write them to disk. Add `imageFormatMapping` to the extraction pipeline.

#### Updated Return Type

```typescript
export interface ConvertResult {
  markdown: string;
  bibtex: string;
  zoteroPrefs?: ZoteroDocPrefs;
  zoteroBiblData?: ZoteroBiblData;
  images?: Map<string, Uint8Array>;  // relative path → binary data
}
```

### md-to-docx.ts Changes

#### Extended MdRun type

Add `'image'` to the MdRun type union:

```typescript
type: 'text' | ... | 'image';
```

New fields on MdRun for images:

```typescript
imageSrc?: string;       // resolved file path
imageAlt?: string;       // alt text
imageWidth?: number;     // width in pixels
imageHeight?: number;    // height in pixels
imageSyntax?: 'md' | 'html';  // original syntax format
```

#### New/Modified Functions

- **`imageAttributeRule(state, silent)`**: New markdown-it inline rule (or post-processing step). Detects `{width=N height=N}` immediately after an image token and attaches the parsed dimensions. Alternatively, this can be done as a post-processing pass on the token stream after markdown-it parsing.

- **`processInlineChildren()`**: Extended. Handle `image` tokens from markdown-it (type `'image'`) by creating an `image` MdRun. Handle `html_inline` tokens that match `<img ...>` by parsing src, alt, width, height attributes.

- **`generateRuns()`**: Extended. When encountering an `image` MdRun, generate the `<w:drawing>` OOXML. This involves:
  1. Allocating a relationship ID for the image
  2. Storing the image binary in state for later ZIP assembly
  3. Generating the `<w:drawing><wp:inline>` XML with `<wp:extent>`, `<wp:docPr>`, `<a:blip>`, and `<pic:spPr>` elements

- **`imageFormatProps(imageFormats: Map<string, string>)`**: New function. Generates `CustomPropEntry[]` for `MANUSCRIPT_IMAGE_FORMATS` using the chunked-JSON pattern.

- **`contentTypesXml()`**: Extended. Accept image extensions and emit `<Default Extension="png" ContentType="image/png"/>` etc.

- **`documentRelsXml()`**: Extended. Emit image relationships alongside hyperlink relationships (different `Type` attribute, no `TargetMode="External"`).

- **`convertMdToDocx()`**: Extended. After generating document XML, collect image binaries from disk (resolved relative to the markdown file's directory via `options.sourceDir`). Store them in the ZIP under `word/media/`. Generate image format custom properties.

#### Extended DocxGenState

```typescript
interface DocxGenState {
  // ... existing fields ...
  imageRelationships: Map<string, { rId: string; mediaPath: string }>;  // file path → { rId, media path }
  imageBinaries: Map<string, Uint8Array>;  // media path → binary data
  imageFormats: Map<string, string>;       // rId → syntax ("md" | "html")
  imageExtensions: Set<string>;            // collected extensions for content types
}
```

### Intrinsic Dimension Reading

For images without explicit dimensions in Markdown, the exporter needs to read intrinsic dimensions from the image file. A utility function `readImageDimensions(data: Uint8Array, format: string): { width: number; height: number } | null` will parse image headers:

- **PNG**: Read IHDR chunk (bytes 16–23) for width/height as 4-byte big-endian integers.
- **JPEG**: Scan for SOF0/SOF2 markers (0xFFC0/0xFFC2) and read dimensions.
- **GIF**: Read bytes 6–9 for width/height as 2-byte little-endian integers.
- **SVG**: Parse `width`/`height` attributes or `viewBox` from the root `<svg>` element. If units are present (e.g., "mm", "pt"), they are converted to pixels (96 DPI). If only `viewBox` is present, its coordinate units are treated as pixels.

This function operates on raw bytes (or a string for SVG), no external image library needed.

### Image Deduplication (MD→DOCX)

To minimize DOCX file size, the exporter performs deduplication:
1.  **Path Resolution**: All image paths are resolved to absolute paths before processing.
2.  **Binary Cache**: A map of `absolutePath → { rId, mediaPath }` ensures that multiple references to the same file on disk result in only one entry in `word/media/` and one Relationship in `document.xml.rels`.
3.  **Relationship Reuse**: Multiple `<w:drawing>` elements will share the same `r:embed` ID if they point to the same source image.

### Supported Format Detection

```typescript
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg']);
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};
```

### EMU ↔ Pixel Conversion

```typescript
const EMU_PER_PIXEL = 9525;

function emuToPixels(emu: number): number {
  return Math.round(emu / EMU_PER_PIXEL);
}

function pixelsToEmu(px: number): number {
  return px * EMU_PER_PIXEL;
}
```

### Documentation Changes

The following user-facing documentation files are updated as part of this feature:

#### docs/specification.md

Add a new **Images** section (after the existing "Standard Markdown" section or alongside other content-type sections) documenting:

- **Attribute Syntax**: `![alt text](folder/image.png){width=640 height=480}` — the default Markdown-native image syntax with curly-brace dimension attributes.
- **HTML Image Syntax**: `<img src="folder/image.png" alt="alt text" width="640" height="480">` — the alternative HTML tag syntax.
- **Supported Formats**: PNG, JPG/JPEG, GIF, SVG.
- **Image Folder convention**: Images are stored in a sibling folder named after the Markdown file's basename (e.g., `paper.md` → `paper/`).
- **Dimension attributes**: `width` and `height` in pixels. Single-dimension specification auto-computes the other from the intrinsic aspect ratio.

#### docs/converter.md

Three changes:

1. **Remove Known Limitation**: Delete the `- **Images**: Not extracted from DOCX` entry from the Known Limitations section.
2. **Add Round-Trip Feature entry**: Add an **Images** bullet to the Round-Trip Features list:
   - `![alt](path){width=W height=H}` and `<img>` syntax ↔ Word `<w:drawing>` inline images
   - Dimension preservation (EMU↔pixel conversion)
   - Alt text preservation via `<wp:docPr descr="...">`
   - Syntax format preservation via `MANUSCRIPT_IMAGE_FORMATS` custom property
   - Image binary extraction to/from `word/media/`
3. **Add Images converter section**: A new section (similar to the existing "LaTeX Equations" or "HTML Comments" sections) documenting:
   - **DOCX to Markdown**: Image extraction process — relationship parsing, binary extraction from `word/media/`, Image_Folder creation, filename resolution (preferring `<wp:docPr name>` over media filename), EMU→pixel dimension conversion, alt text from `descr` attribute, anchor images treated as inline.
   - **Markdown to DOCX**: Image embedding process — file reading from disk (relative to MD file), `word/media/` storage, relationship and content type generation, `<w:drawing>` OOXML generation, intrinsic dimension fallback, `MANUSCRIPT_IMAGE_FORMATS` metadata for syntax roundtrip.
   - **Round-Trip Behavior**: Dimension fidelity (sub-pixel EMU precision lost to integer rounding), syntax format preservation, alt text preservation, deduplication of shared images.

#### docs/guides/documentation.md

Add a mention of image support in the feature capabilities. Update the "Why use Manuscript Markdown for Docs?" section or add a brief note that images are supported in the DOCX roundtrip workflow (extracted on import, embedded on export), so users know they can include images in their technical documentation.

## Data Models

### Image in DOCX (OOXML Structure)

The `<w:drawing>` element for an inline image:

```xml
<w:drawing>
  <wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="{widthEMU}" cy="{heightEMU}"/>
    <wp:docPr id="{uniqueId}" name="{filename}" descr="{altText}"/>
    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:nvPicPr>
            <pic:cNvPr id="{uniqueId}" name="{filename}"/>
            <pic:cNvPicPr/>
          </pic:nvPicPr>
          <pic:blipFill>
            <a:blip r:embed="{rId}"/>
            <a:stretch><a:fillRect/></a:stretch>
          </pic:blipFill>
          <pic:spPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="{widthEMU}" cy="{heightEMU}"/>
            </a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          </pic:spPr>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

### Image in Markdown

Two supported syntaxes:

**Attribute Syntax (default)**:
```markdown
![alt text](folder/image.png){width=640 height=480}
```

**HTML Syntax**:
```html
<img src="folder/image.png" alt="alt text" width="640" height="480">
```

### Image Format Metadata (Custom Property)

Stored in `docProps/custom.xml` using the chunked-JSON pattern:

```xml
<property fmtid="..." pid="..." name="MANUSCRIPT_IMAGE_FORMATS_1">
  <vt:lpwstr>{"rId10":"md","rId11":"html"}</vt:lpwstr>
</property>
```

### Relationship Entry

```xml
<Relationship Id="rId10"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
  Target="media/image1.png"/>
```

### Content Type Entry

```xml
<Default Extension="png" ContentType="image/png"/>
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: EMU↔pixel conversion roundtrip

*For any* positive integer pixel value, converting to EMUs via `px * 9525` and back via `Math.round(emu / 9525)` shall produce the original pixel value.

**Validates: Requirements 6.1, 6.2**

### Property 2: Dimension roundtrip

*For any* Markdown image with explicit integer width and height, exporting to DOCX and converting back to Markdown shall produce the same pixel dimensions.

**Validates: Requirements 6.3, 1.6, 2.8**

### Property 3: Alt text roundtrip

*For any* Markdown image with non-empty alt text (not containing characters that would break Markdown image syntax, e.g., `]`), exporting to DOCX and converting back to Markdown shall produce the same alt text.

**Validates: Requirements 7.3, 1.5, 7.1, 7.2**

### Property 4: Syntax format roundtrip

*For any* Markdown document containing images using either Attribute_Syntax or HTML_Image_Syntax, exporting to DOCX and converting back to Markdown shall produce image references using the same syntax format as the original.

**Validates: Requirements 3.5, 3.1, 3.2, 3.3**

### Property 5: Image attribute parsing

*For any* valid Markdown image reference (either `![alt](path){width=W height=H}` or `<img src="path" alt="alt" width="W" height="H">`), parsing shall extract the correct src, alt, width, and height values.

**Validates: Requirements 4.1, 4.5, 5.1, 5.2, 5.3**

### Property 6: Aspect ratio preservation

*For any* image with known intrinsic dimensions and a single explicit dimension (width-only or height-only), the computed missing dimension shall preserve the intrinsic aspect ratio (within ±1 pixel due to rounding).

**Validates: Requirements 4.2, 4.3**

### Property 7: DOCX image structure validity

*For any* Markdown document containing images, the exported DOCX ZIP shall contain: (a) the image binary in `word/media/`, (b) a relationship entry in `word/_rels/document.xml.rels` with the correct image type, (c) a content type entry for the image extension in `[Content_Types].xml`, and (d) a `<w:drawing>` element in `document.xml` with the correct `r:embed` reference.

**Validates: Requirements 2.3, 2.4, 2.6, 2.7, 2.12**

### Property 8: Image deduplication

*For any* Markdown document where multiple image references point to the same file path, the exported DOCX shall contain exactly one media binary and one relationship entry for that path, while the document XML contains multiple `<w:drawing>` elements all referencing the same relationship ID.

**Validates: Requirements 2.5, 1.10**

### Property 9: Supported format filtering

*For any* image file extension, the converter/exporter shall process the image if and only if the extension is in the supported set (png, jpg, jpeg, gif, svg). Unsupported formats shall be skipped with a warning.

**Validates: Requirements 1.9, 2.11**

### Property 10: Filename resolution priority

*For any* image in a DOCX, when the `<wp:docPr>` `name` attribute contains a filename with a valid image extension, that filename shall be used for the extracted file. When the `name` attribute is missing or lacks a valid extension, the media filename from the relationship target shall be used.

**Validates: Requirements 1.2**

### Property 11: Image format metadata serialization roundtrip

*For any* mapping of relationship IDs to syntax identifiers ("md" or "html"), serializing to the chunked-JSON `MANUSCRIPT_IMAGE_FORMATS` custom property and deserializing shall produce the original mapping.

**Validates: Requirements 3.1, 3.2**

## Error Handling

| Scenario | Behavior |
|---|---|
| Image file not found on disk (MD→DOCX) | Emit warning with file path, skip embedding, continue processing |
| Unsupported image format (both directions) | Emit warning, skip image, continue processing |
| Corrupt/unreadable image binary (MD→DOCX) | Emit warning, skip embedding |
| Missing relationship for `r:embed` rId (DOCX→MD) | Skip image, emit warning |
| Missing `word/media/` entry for relationship target | Skip image, emit warning |
| Invalid/unparseable `MANUSCRIPT_IMAGE_FORMATS` JSON | Fall back to Attribute_Syntax default for all images |
| Unknown syntax identifier in format metadata | Fall back to Attribute_Syntax for that image |
| Zero or negative dimensions in EMU | Skip dimension output, use intrinsic dimensions if available |
| Cannot read intrinsic dimensions from image file | Emit warning, use default dimensions (e.g., 100×100) or skip dimensions |
| `<img>` tag with missing `src` attribute | Skip, treat as regular HTML inline text |

All error conditions emit warnings via the existing `state.warnings` array (md-to-docx) or the `ConvertResult` warnings (converter). No errors are fatal — the converter continues processing the rest of the document.

### Standard Warning Messages

| Issue | Message Template |
|---|---|
| Image not found | `Image not found: {path}` |
| Unsupported format | `Unsupported image format ({ext}) for: {path}` |
| Read error | `Error reading dimensions for {path}: {error}` |
| Missing metadata | `Invalid image syntax metadata: {rId}` |
| Missing DOCX entry | `Relationship {rId} points to missing media: {target}` |
| Dimensions | `Could not read dimensions for {path}; using default (100x100)` |

## Testing Strategy

### Property-Based Tests (fast-check)

The project uses `bun:test` with `fast-check` for property-based testing. Each property test must:
- Run a minimum of 100 iterations
- Use short bounded generators to avoid timeouts (per AGENTS.md guidance)
- Reference the design property in a comment tag

**Tag format**: `Feature: image-roundtrip, Property {number}: {property_text}`

Property tests will be in `src/image-roundtrip.property.test.ts`.

**Generators needed**:
- `arbPixelDimension`: `fc.integer({ min: 1, max: 10000 })` — random pixel values
- `arbAltText`: `fc.string({ minLength: 0, maxLength: 100 })` filtered to exclude `]`, `\n`, and XML-special characters that would break syntax
- `arbImageSyntax`: `fc.constantFrom('md', 'html')` — random syntax choice
- `arbImageExtension`: `fc.constantFrom('png', 'jpg', 'jpeg', 'gif', 'svg')` — supported formats
- `arbUnsupportedExtension`: `fc.constantFrom('bmp', 'tiff', 'webp', 'emf', 'wmf')` — unsupported formats
- `arbRId`: `fc.integer({ min: 1, max: 100 }).map(n => 'rId' + n)` — relationship IDs
- `arbImageFormatMap`: `fc.dictionary(arbRId, arbImageSyntax)` — format metadata maps
- `arbIntrinsicDimensions`: `fc.record({ width: arbPixelDimension, height: arbPixelDimension })` — intrinsic image sizes

**Properties to implement**:
1. EMU↔pixel roundtrip (pure math, no I/O)
2. Dimension roundtrip (synthetic DOCX roundtrip)
3. Alt text roundtrip (synthetic DOCX roundtrip)
4. Syntax format roundtrip (synthetic DOCX roundtrip)
5. Image attribute parsing (unit-level parsing functions)
6. Aspect ratio preservation (unit-level computation)
7. DOCX structure validity (ZIP inspection after export)
8. Image deduplication (ZIP inspection after export)
9. Supported format filtering (unit-level format check)
10. Filename resolution priority (unit-level filename logic)
11. Image format metadata serialization roundtrip (serialization/deserialization)

### Unit Tests

Unit tests will be in `src/image-roundtrip.test.ts`. They complement property tests by covering:

- **Specific examples**: Known DOCX structures with images, known Markdown with images
- **Edge cases**: Empty alt text, missing dimensions, anchor images, `<img>` tags with partial attributes, unrecognized curly-brace attributes, multiple images sharing same rId
- **Error conditions**: Missing files, unsupported formats, corrupt metadata, invalid dimension values
- **Integration**: Full roundtrip with real PNG/JPEG binary headers (small synthetic images)

### Documentation Verification

Requirement 9 (documentation updates) does not require automated tests — it covers static content changes to `docs/specification.md`, `docs/converter.md`, and `docs/guides/documentation.md`. Verification is manual:

- Confirm the "Images" section exists in `docs/specification.md` with Attribute_Syntax, HTML_Image_Syntax, Supported_Formats, and Image_Folder documentation.
- Confirm "Images: Not extracted from DOCX" is removed from Known Limitations in `docs/converter.md`.
- Confirm an "Images" entry exists in the Round-Trip Features list in `docs/converter.md`.
- Confirm a converter section documenting image extraction/embedding behavior exists in `docs/converter.md`.
- Confirm image support is mentioned in `docs/guides/documentation.md`.

### Test Organization

- Each property-based test is a single `it()` block implementing exactly one correctness property
- Unit tests are grouped by component (`describe('DOCX→MD image extraction', ...)`, `describe('MD→DOCX image embedding', ...)`, etc.)
- Synthetic DOCX ZIPs are built in-memory using JSZip for both property and unit tests
- Synthetic image binaries use minimal valid headers (e.g., 1×1 PNG) to avoid large test fixtures
