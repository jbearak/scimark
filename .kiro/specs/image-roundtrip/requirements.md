# Requirements Document

## Introduction

Manuscript Markdown currently has no image support — images are listed as a known limitation in the DOCX converter. This feature adds full roundtrip image handling: extracting images from DOCX to Markdown with file-based references, embedding images from Markdown back into DOCX, and preserving image metadata (dimensions, alt text, syntax format) across the roundtrip cycle.

## Glossary

- **Converter**: The DOCX-to-Markdown conversion module (`src/converter.ts`) that transforms Word documents into Manuscript Markdown format.
- **Exporter**: The Markdown-to-DOCX conversion module (`src/md-to-docx.ts`) that transforms Manuscript Markdown back into Word documents.
- **Image_Folder**: A directory named after the Markdown file's basename (e.g., `paper.md` → `paper/`) where extracted images are stored.
- **Attribute_Syntax**: The Markdown image syntax extended with curly-brace attributes for dimensions: `![alt](path){width=N height=N}`.
- **HTML_Image_Syntax**: An `<img>` HTML tag used as an alternative image syntax in Markdown: `<img src="path" alt="alt" width="N" height="N">`.
- **Image_Syntax_Metadata**: A custom property stored in `docProps/custom.xml` under the key `MANUSCRIPT_IMAGE_FORMATS`. It stores a JSON-encoded mapping of image relationship IDs (`rId`) to their original Markdown syntax (e.g., `"rId4": "html"`), enabling source-level roundtrip fidelity.
- **Relationship**: An entry in `word/_rels/document.xml.rels` that maps a relationship ID (`rId`) to a target file path inside the DOCX ZIP archive.
- **Drawing_Element**: An OOXML `<w:drawing>` element containing a `<wp:inline>` or `<wp:anchor>` element that embeds an image in a Word document paragraph.
- **Content_Type**: An entry in `[Content_Types].xml` that declares the MIME type for a file extension within the DOCX ZIP archive.
- **Supported_Format**: One of PNG, JPG/JPEG, GIF, or SVG image file formats. (PDF is excluded as it is typically handled as an OLE object in DOCX).
- **EMU**: English Metric Unit. 1 inch = 914,400 EMUs. For 96 DPI screen resolution, 1 pixel = 9,525 EMUs.
- **Intrinsic_Dimensions**: The original width and height of an image file, independent of its display size in a document.

## Requirements

### Requirement 1: Extract Images from DOCX

**User Story:** As a user converting a DOCX to Markdown, I want images embedded in the Word document to be extracted and saved as files, so that the Markdown output includes visible image references instead of silently dropping images.

#### Acceptance Criteria

1. WHEN the Converter encounters a `<w:drawing>` element containing a `<wp:inline>` or `<wp:anchor>` image in the DOCX, THE Converter SHALL extract the referenced image binary from the `word/media/` directory of the DOCX ZIP archive using the relationship ID.
2. WHEN extracting images, THE Converter SHALL save each image file into the Image_Folder. It SHALL prioritize the filename stored in the `name` attribute of the `<wp:docPr>` element if it includes a valid extension; otherwise, it SHALL use the media filename (e.g., `image1.png`).
3. WHEN extracting images, THE Converter SHALL create the Image_Folder if the directory does not already exist.
4. THE Converter SHALL generate a Markdown image reference using a relative path to the extracted file: `![alt text](folder/filename.ext)`.
5. WHEN the `<wp:inline>` or `<wp:anchor>` element contains a `<wp:docPr>` with a `descr` attribute, THE Converter SHALL use the `descr` value as the alt text in the Markdown image reference.
6. WHEN the `<wp:inline>` or `<wp:anchor>` element contains dimension attributes (`cx` and `cy` in EMUs on the `<wp:extent>` element), THE Converter SHALL append width and height in the Attribute_Syntax format: `{width=N height=N}` where N is the value converted to pixels using the standard conversion rate (1 pixel = 9,525 EMUs).
7. WHEN the `<wp:inline>` or `<wp:anchor>` element has no `descr` attribute or the attribute is empty, THE Converter SHALL use an empty alt text in the Markdown image reference.
8. WHEN the Converter encounters a `<w:drawing>` element containing a `<wp:anchor>` image, THE Converter SHALL extract the image using the same process as for `<wp:inline>` images, treating the anchored image as inline and discarding any wrapping or positioning attributes.
9. WHEN the image format in the DOCX is a Supported_Format, THE Converter SHALL extract the image. WHEN the image format is not a Supported_Format, THE Converter SHALL skip the image and emit a warning to the log.
10. IF multiple `<wp:inline>` or `<wp:anchor>` elements refer to the same relationship ID, THE Converter SHALL only extract the image file once but generate multiple Markdown image references.

### Requirement 2: Embed Images into DOCX

**User Story:** As a user exporting Markdown to DOCX, I want images referenced in my Markdown to be fully embedded into the Word document, so that the DOCX is self-contained and viewable without external files.

#### Acceptance Criteria

1. WHEN the Exporter encounters a Markdown image (`![alt](path)`) or an Attribute_Syntax image (`![alt](path){width=N height=N}`), THE Exporter SHALL read the image file from disk using the path resolved relative to the Markdown file's directory.
2. WHEN the Exporter encounters an HTML_Image_Syntax tag (`<img src="path" ...>`), THE Exporter SHALL read the image file from disk using the `src` attribute resolved relative to the Markdown file's directory.
3. WHEN embedding an image, THE Exporter SHALL store the image binary in the `word/media/` directory of the DOCX ZIP archive.
4. WHEN embedding an image, THE Exporter SHALL create a Relationship entry in `word/_rels/document.xml.rels` linking the image to its media path.
5. IF multiple image references point to the exact same file path, THE Exporter SHALL reuse the same Relationship and media binary to avoid duplication in the DOCX.
6. WHEN embedding an image, THE Exporter SHALL add a Content_Type entry in `[Content_Types].xml` for the image's file extension if one does not already exist.
7. WHEN embedding an image, THE Exporter SHALL generate a `<w:drawing>` element with a `<wp:inline>` child containing the image reference, dimensions, and alt text.
8. WHEN the Markdown image includes width and height attributes (via Attribute_Syntax or HTML_Image_Syntax), THE Exporter SHALL use those dimensions for the `<wp:extent>` element in EMUs.
9. WHEN the Markdown image does not include explicit dimensions, THE Exporter SHALL read the Intrinsic_Dimensions from the image file and use those for the `<wp:extent>` element.
10. IF the referenced image file does not exist on disk, THEN THE Exporter SHALL emit a warning message identifying the missing file path and skip embedding that image.
11. WHEN the image file format is a Supported_Format, THE Exporter SHALL embed the image. WHEN the format is not a Supported_Format, THE Exporter SHALL emit a warning and skip embedding.
12. THE Exporter SHALL preserve the filename in the `name` attribute of the `<wp:docPr>` element, allowing it to be recovered by the Converter during roundtrip.

### Requirement 3: Preserve Image Syntax Format on Roundtrip

**User Story:** As a user who writes images using either `![...]()` or `<img>` syntax, I want the Markdown-to-DOCX-to-Markdown roundtrip to restore my original syntax choice, so that my source files remain consistent.

#### Acceptance Criteria

1. WHEN the Exporter processes images, THE Exporter SHALL record each image's original syntax format (Attribute_Syntax or HTML_Image_Syntax) in the Image_Syntax_Metadata custom property in `docProps/custom.xml`.
2. THE Image_Syntax_Metadata SHALL be a JSON string mapping relationship IDs (`rId`) to a syntax identifier (e.g., `{"rId1": "md", "rId2": "html"}`).
3. WHEN the Converter extracts images from a DOCX that contains Image_Syntax_Metadata, THE Converter SHALL read the metadata and emit each image using the recorded syntax format.
4. WHEN the Converter extracts images from a DOCX that does not contain Image_Syntax_Metadata (e.g., a DOCX authored in Word, not from Markdown), THE Converter SHALL default to emitting images using the Attribute_Syntax format.
5. FOR ALL valid Markdown documents containing images, parsing then exporting to DOCX then converting back to Markdown SHALL produce image references with the same syntax format as the original (roundtrip property).
6. IF an image syntax in the metadata is unknown or invalid, THE Converter SHALL fallback to the Attribute_Syntax default.

### Requirement 4: Parse Attribute Syntax in Markdown

**User Story:** As a user, I want to specify image dimensions using `{width=N height=N}` after the image reference, so that I can control image sizing in a readable Markdown-native way.

#### Acceptance Criteria

1. WHEN the Exporter encounters `![alt](path){width=N height=N}` in the Markdown source, THE Exporter SHALL parse the curly-brace attributes and extract width and height values.
2. WHEN only `{width=N}` is specified without height, THE Exporter SHALL compute the height by preserving the image's Intrinsic_Dimensions aspect ratio.
3. WHEN only `{height=N}` is specified without width, THE Exporter SHALL compute the width by preserving the image's Intrinsic_Dimensions aspect ratio.
4. WHEN the curly-brace block contains unrecognized attributes, THE Exporter SHALL ignore the unrecognized attributes and process any recognized `width` and `height` values.
5. THE Exporter SHALL accept dimension values as positive integers representing pixels.

### Requirement 5: Parse HTML Image Tags in Markdown

**User Story:** As a user who prefers HTML `<img>` tags for images, I want the exporter to recognize and embed those images into the DOCX, so that both Markdown and HTML image syntaxes are supported.

#### Acceptance Criteria

1. WHEN the Exporter encounters an `<img>` tag with a `src` attribute, THE Exporter SHALL treat the tag as an image reference and embed the referenced file.
2. WHEN the `<img>` tag includes `width` and `height` attributes, THE Exporter SHALL use those values as the image dimensions in the DOCX.
3. WHEN the `<img>` tag includes an `alt` attribute, THE Exporter SHALL use the value as the image alt text in the DOCX.
4. WHEN the `<img>` tag is missing `width` or `height` attributes, THE Exporter SHALL fall back to the image's intrinsic dimensions for the missing values.

### Requirement 6: Preserve Image Dimensions on Roundtrip

**User Story:** As a user, I want image dimensions specified in my Markdown to survive the DOCX roundtrip, so that images retain their intended size.

#### Acceptance Criteria

1. WHEN the Exporter embeds an image with explicit dimensions, THE Exporter SHALL store those dimensions in the `<wp:extent>` element of the Drawing_Element using EMU units (9,525 EMUs per pixel).
2. WHEN the Converter extracts an image, THE Converter SHALL read the `<wp:extent>` dimensions and convert them from EMUs to pixels, rounding to the nearest integer.
3. FOR ALL Markdown images with explicit width and height, exporting to DOCX then converting back to Markdown SHALL produce the same pixel dimensions (roundtrip property), accounting for EMU-to-pixel rounding.

### Requirement 7: Preserve Alt Text on Roundtrip

**User Story:** As a user, I want image alt text to survive the DOCX roundtrip, so that accessibility information is not lost.

#### Acceptance Criteria

1. WHEN the Exporter embeds an image with alt text, THE Exporter SHALL store the alt text in the `descr` attribute of the `<wp:docPr>` element.
2. WHEN the Converter extracts an image with a `descr` attribute, THE Converter SHALL use the value as the Markdown image alt text.
3. FOR ALL Markdown images with non-empty alt text, exporting to DOCX then converting back to Markdown SHALL produce the same alt text (roundtrip property).

### Requirement 8: Image Placement in Document Flow

**User Story:** As a user, I want images to appear at the correct position in the document flow, so that the relationship between text and images is preserved.

#### Acceptance Criteria

1. WHEN the Converter encounters an inline image within a paragraph, THE Converter SHALL emit the Markdown image reference at the corresponding position within the paragraph text.
2. WHEN the Exporter encounters an image reference within a Markdown paragraph, THE Exporter SHALL place the Drawing_Element inline within the paragraph's OOXML run sequence at the corresponding position.
3. WHEN an image is the sole content of a paragraph, THE Converter SHALL emit the image reference as a standalone paragraph in the Markdown output.

## Known Limitations

- **Wrapping Style Loss**: Anchored/floating images (`<wp:anchor>`) with wrapping styles such as "Tight," "Through," or "Behind Text" are extracted as inline images. The wrapping and positioning metadata is discarded during conversion; only the image content and dimensions are preserved.

## Out of Scope
- **Image Linkage**: Wrapping an image in a Markdown link `[![alt](img)](url)` is not supported in this feature phase.
- **Captions**: Generating or preserving `<w:caption>` elements in DOCX is out of scope.
- **Vector Formats other than SVG**: Formats like EMF or WMF may be extracted but not correctly resized or roundtripped.
- **Remote Images**: Images with HTTP(S) URLs in Markdown will not be fetched; only local files are supported.
