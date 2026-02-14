# Requirements Document

## Introduction

This feature extends the DOCX-to-Markdown converter to extract and preserve Zotero citation identifiers during conversion, enabling a future bidirectional workflow (docx→md→docx) where users can reconstitute a Word document and continue using Zotero to edit, update, and reformat citations.

Zotero stores citations in Word documents as `ADDIN ZOTERO_ITEM` field codes containing JSON with full CSL metadata and item URIs. Each URI contains an 8-character alphanumeric item key that stably identifies the entry in the user's Zotero library. This feature extracts those keys and URIs and stores them in BibTeX custom fields, so that a future reconstruction phase can rebuild Zotero-compatible field codes.

## Glossary

- **Converter**: The DOCX-to-Markdown conversion module in `src/converter.ts`
- **Zotero_Field_Code**: A Word field code of the form `ADDIN ZOTERO_ITEM CSL_CITATION {<JSON>}` embedded in `word/document.xml`
- **Item_Key**: The 8-character alphanumeric identifier (e.g., `P5EYVHT4`) at the end of a Zotero item URI, stably linking to a Zotero library entry
- **Item_URI**: The full Zotero URI (e.g., `http://zotero.org/users/local/ibWt60LF/items/P5EYVHT4`) stored in the `uris` or `uri` field of a citation item
- **CSL_JSON**: Citation Style Language JSON, the metadata format Zotero embeds in field codes containing author, title, year, journal, and other bibliographic fields
- **Locator**: A page, section, or chapter reference for a specific citation instance (e.g., `"20"`), stored as a plain string in the Zotero field code and rendered in Markdown using Pandoc citation syntax (`[@key, p. 20]`)
- **BibTeX_Custom_Field**: A non-standard BibTeX field (e.g., `zotero-key`, `zotero-uri`) that standard parsers ignore but our toolchain uses for roundtrip metadata
- **Bibliography_Field_Code**: A Word field code of the form `ADDIN ZOTERO_BIBL {<JSON>}` containing document-level citation style and preferences

## Requirements

### Requirement 1: Extract Zotero Item Keys from Field Codes

**User Story:** As a user converting a DOCX file with Zotero citations, I want the converter to extract the Zotero item key from each citation, so that the bibliographic entries can be linked back to my Zotero library.

#### Acceptance Criteria

1.1. WHEN the Converter encounters a Zotero_Field_Code, THE Converter SHALL parse the `uris` or `uri` array from each entry in `citationItems`
1.2. WHEN parsing an Item_URI, THE Converter SHALL extract the Item_Key using the pattern `/\/items\/([A-Z0-9]{8})$/`
1.3. WHEN an Item_URI uses a local library format (`http://zotero.org/users/local/{localID}/items/{KEY}`), THE Converter SHALL extract the Item_Key correctly
1.4. WHEN an Item_URI uses a synced user library format (`http://zotero.org/users/{userID}/items/{KEY}`), THE Converter SHALL extract the Item_Key correctly
1.5. WHEN an Item_URI uses a group library format (`http://zotero.org/groups/{groupID}/items/{KEY}`), THE Converter SHALL extract the Item_Key correctly
1.6. WHEN a citation item has no `uris` or `uri` field, THE Converter SHALL proceed without error and omit the `zotero-key` and `zotero-uri` fields from the BibTeX entry

### Requirement 2: Store Zotero Identifiers in BibTeX

**User Story:** As a user, I want Zotero item keys and URIs stored in the BibTeX file, so that a future reconstitution step can map citations back to my Zotero library without a separate metadata file.

#### Acceptance Criteria

2.1. WHEN generating a BibTeX entry for a citation item that has an Item_Key, THE Converter SHALL include a `zotero-key` field containing the 8-character Item_Key
2.2. WHEN generating a BibTeX entry for a citation item that has an Item_URI, THE Converter SHALL include a `zotero-uri` field containing the full URI
2.3. WHEN a citation item has no Item_Key or Item_URI, THE Converter SHALL omit the `zotero-key` and `zotero-uri` fields from that BibTeX entry
2.4. THE BibTeX_Custom_Fields `zotero-key` and `zotero-uri` SHALL NOT interfere with standard BibTeX parsers (standard parsers ignore unknown fields)

### Requirement 3: Preserve Locators in Markdown Citations

**User Story:** As a user, I want page-specific citation references preserved in the Markdown output, so that locator information is not lost during conversion.

#### Acceptance Criteria

3.1. WHEN a citation item has a Locator, THE Converter SHALL emit the Markdown citation with Pandoc locator syntax: `[@citationKey, p. <locator>]`
3.2. WHEN a citation item has no Locator, THE Converter SHALL emit the Markdown citation without a locator suffix: `[@citationKey]`
3.3. WHEN multiple citation items appear in a single Zotero_Field_Code and one or more have Locators, THE Converter SHALL emit each item's locator individually within the grouped citation: `[@key1, p. 20; @key2]`

### Requirement 4: Preserve Citation Grouping

**User Story:** As a user, I want multi-source citations to remain grouped in the Markdown output, so that they can be reconstructed as a single Zotero field code.

#### Acceptance Criteria

4.1. WHEN a single Zotero_Field_Code contains multiple citation items, THE Converter SHALL emit them as a single grouped Pandoc citation: `[@key1; @key2; @key3]`
4.2. WHEN a single Zotero_Field_Code contains one citation item, THE Converter SHALL emit it as a single citation: `[@key1]`
