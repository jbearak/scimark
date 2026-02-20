# Bugfix Requirements Document

## Introduction

In BibTeX, double braces around a field value (e.g. `title = {{My Title}}`) are a standard convention used to suppress title-casing and protect proper nouns. When the extension parses such a `.bib` file and later uses the parsed data for bibliography output, the inner brace pair is not stripped — it is stored verbatim as part of the field value. As a result, the exported or rendered bibliography contains literal curly braces (e.g. `{My Title}` instead of `My Title`), which is incorrect and visually broken output.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a BibTeX field is double-braced (e.g. `title = {{My Title}}`) THEN the system stores the value with the inner braces intact (e.g. `{My Title}`)

1.2 WHEN a parsed BibTeX entry with a double-braced field is used in bibliography output THEN the system renders the field value with literal curly braces visible (e.g. `{My Title}` instead of `My Title`)

1.3 WHEN a double-braced author field is parsed (e.g. `author = {{World Health Organization}}`) THEN the system stores the value as `{World Health Organization}` rather than `{World Health Organization}` as a protected literal name

### Expected Behavior (Correct)

2.1 WHEN a BibTeX field is double-braced (e.g. `title = {{My Title}}`) THEN the system SHALL strip the inner brace pair and store the plain value (e.g. `My Title`)

2.2 WHEN a parsed BibTeX entry with a previously double-braced field is used in bibliography output THEN the system SHALL render the field value without literal curly braces (e.g. `My Title`)

2.3 WHEN a double-braced author field is parsed (e.g. `author = {{World Health Organization}}`) THEN the system SHALL store the value as `{World Health Organization}` so that the institutional name is treated as a protected literal by downstream CSL processing

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a BibTeX field is single-braced (e.g. `title = {My Title}`) THEN the system SHALL CONTINUE TO parse and store the value correctly as `My Title`

3.2 WHEN a BibTeX field uses quote delimiters (e.g. `title = "My Title"`) THEN the system SHALL CONTINUE TO parse and store the value correctly as `My Title`

3.3 WHEN a BibTeX field contains LaTeX-escaped characters (e.g. `title = {Caf\'{e}}`) THEN the system SHALL CONTINUE TO unescape them correctly during parsing

3.4 WHEN a BibTeX field contains a single inner brace group for a protected sub-string (e.g. `title = {The {RNA} Paradox}`) THEN the system SHALL CONTINUE TO preserve that inner brace group in the stored value

3.5 WHEN a BibTeX entry is serialized back to BibTeX text THEN the system SHALL CONTINUE TO wrap field values in single outer braces
