# Bugfix Requirements Document

## Introduction

When exporting a markdown document to Word (.docx), the generated bibliography includes every entry from the .bib file, not just the entries that were actually cited in the markdown. This inflates the bibliography section of the exported Word document with uncited references, which is incorrect for academic and professional documents.

The root cause is in `src/md-to-docx-citations.ts` in the `buildEngine()` function. When the citeproc engine is constructed, `engine.updateItems([...items.keys()])` registers every entry from the parsed .bib file. The citeproc library then includes all registered items in its `makeBibliography()` output. Instead, only the citation keys actually referenced in the markdown document should be registered with the engine.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a markdown document cites a subset of entries from a .bib file (e.g., 2 out of 10) and is exported to Word THEN the system includes all entries from the .bib file in the Word document's bibliography section

1.2 WHEN a markdown document contains no citations but a .bib file is provided and a CSL style is configured THEN the system still generates a bibliography containing all .bib entries in the Word document

### Expected Behavior (Correct)

2.1 WHEN a markdown document cites a subset of entries from a .bib file (e.g., 2 out of 10) and is exported to Word THEN the system SHALL include only the cited entries in the Word document's bibliography section

2.2 WHEN a markdown document contains no citations but a .bib file is provided and a CSL style is configured THEN the system SHALL generate an empty bibliography (or omit the bibliography section entirely) in the Word document

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a markdown document cites all entries from a .bib file THEN the system SHALL CONTINUE TO include all entries in the Word document's bibliography section

3.2 WHEN a markdown document contains inline citation text (e.g., `[@key]`) THEN the system SHALL CONTINUE TO render the correct formatted citation text in the Word document body

3.3 WHEN a citation key in the markdown does not exist in the .bib file THEN the system SHALL CONTINUE TO emit a warning and render the missing key as plain text

3.4 WHEN the frontmatter specifies a CSL style and locale THEN the system SHALL CONTINUE TO format citations and bibliography entries according to that style and locale

3.5 WHEN a citation includes a locator (e.g., page number) THEN the system SHALL CONTINUE TO render the locator correctly in the citation text
