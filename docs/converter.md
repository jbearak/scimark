# DOCX Converter

The DOCX converter transforms Microsoft Word documents into Manuscript Markdown format, preserving formatting, comments, citations, and equations.

## What's Preserved

- **Text formatting**: bold, italic, underline, strikethrough, superscript, subscript
- **Headings**: H1 through H6 from Word heading styles
- **Lists**: bulleted and numbered lists with nesting
- **Comments**: converted to CriticMarkup `{==highlighted text==}{>>author: comment<<}` format
- **Track changes**: insertions and deletions mapped to CriticMarkup `{++...++}` and `{--...--}`
- **Citations**: Zotero field codes converted to Pandoc `[@key]` syntax with BibTeX export
- **Math**: OMML equations converted to LaTeX (`$inline$` and `$$display$$`)
- **Hyperlinks**: preserved as Markdown links with proper escaping
- **Highlights**: colored highlights converted to `==text=={color}` syntax

## Citation Key Formats

Configurable via `manuscriptMarkdown.citationKeyFormat`:

| Format | Example | Description |
|--------|---------|-------------|
| `authorYearTitle` (default) | `smith2020effects` | Author surname + year + first title word |
| `authorYear` | `smith2020` | Author surname + year |
| `numeric` | `1`, `2`, `3` | Sequential numbers |

## Usage

1. Right-click a `.docx` file in VS Code Explorer
2. Select **Export to Markdown**
3. Output: `filename.md` and `filename.bib` (if citations present)

Or use the command palette and select a file via dialog.

If output files already exist, you'll be prompted to replace, choose a new name, or cancel.

## Known Limitations

- **Tables**: Not converted (complex Word table formats don't map cleanly to Markdown)
- **Images**: Not extracted from DOCX
- **One-way**: No conversion back from Markdown to DOCX
- **Footnotes/endnotes**: Not converted
