# Markdown Annotations and Formatting

A comprehensive [Markdown](https://daringfireball.net/projects/markdown/syntax) extension for Visual Studio Code with [CriticMarkup](https://github.com/CriticMarkup/CriticMarkup-toolkit) annotations and extensive formatting tools.

## About This Fork

This extension is a major rewrite and expansion of the original [vscode-criticmarkup](https://github.com/jloow/vscode-criticmarkup) extension by Joel Lööw, which was archived in 2019. The original extension provided basic CriticMarkup syntax highlighting and snippets but lacked many features and had no active maintenance. All TypeScript extension logic has been rewritten; a small portion of the original snippet and grammar configuration has been adapted from the archived extension.

### What Changed Since the Fork

**Original Extension (v0.2.0, archived 2019)**:
- Basic syntax highlighting using custom color settings
- Snippets for the five CriticMarkup patterns
- Navigation commands (next/previous change)
- ~200 lines of TypeScript code
- No tests, no preview support, no formatting tools

**This Fork (v0.9.0, 2025)**:
- **Major rewrite**: ~3,500+ lines of TypeScript with comprehensive test coverage
- **Renamed to mdmarkup**: Renamed to reflect expanded scope and functionality
- **Multi-line pattern support**: Full support for patterns spanning multiple lines with empty lines
- **Markdown preview rendering**: Live preview with theme-aware styling using markdown-it plugin
- **Author attribution**: Automatic author names and timestamps in comments
- **Markdown formatting**: bold, italic, lists, headings, links, etc.
- **Table reflow**: Table column reflow with text alignment preservation
- **UI enhancements**: Toolbar buttons, context menus, organized submenus
- **Modern tooling**: Bun for package management, property-based testing with fast-check
- **Comprehensive testing**: Unit tests and property-based tests
- **Theme integration**: Uses standard TextMate scopes for automatic theme adaptation
- **Configuration options**: Customizable author names, timestamp preferences

### Code Comparison

**Original code remaining**: A small portion of the original extension remains, mainly non-TypeScript assets:
- Snippet definitions and their basic bodies/descriptions (expanded and enhanced)
- TextMate grammar patterns adapted into `syntaxes/mdmarkup.json`

**New code**: The rest of the current codebase is new TypeScript and assets:
- `src/formatting.ts`: Entirely new (500+ lines)
- `src/author.ts`: Entirely new (100+ lines)
- `src/preview/mdmarkup-plugin.ts`: Entirely new (350+ lines)
- All test files: Entirely new (1,500+ lines)
- `media/mdmarkup.css`: Entirely new
- UI configuration in `package.json`: Massively expanded

The extension has evolved from a simple syntax highlighter into a comprehensive Markdown editing tool with professional-grade features, testing, and documentation.

## Features

**CriticMarkup Annotations:**
- Snippets with key bindings for suggesting additions, deletions and substitutions
- Syntax highlighting for all CriticMarkup patterns with automatic theme adaptation
- Navigate through changes in the document
- Full support for multi-line patterns (including patterns with empty lines)
- Live preview rendering with theme-aware styling
- Automatic author attribution in comments with optional timestamps

**Markdown Formatting:**
- Text formatting (bold, italic, strikethrough, underline, inline code)
- Lists (bulleted, numbered, task lists)
- Headings (H1-H6)
- Links, code blocks, and quote blocks
- Table reflow for automatic table formatting with column alignment

## Requirements

This extension doesn't have any requirements or dependencies. However, to convert CriticMarkup text you'll need a converter tool.

## Usage


Open a Markdown (.md) file in VS Code or one of its forks. Use "Markdown Annotations" or "Markdown Formatting" button in the editor toolbar or in the right-click menu to format or annotate text. Use the "Open Preview" button to view the rendered Markdown. See the [Markdown specification](https://daringfireball.net/projects/markdown/syntax) and the [CriticMarkup toolkit] for syntax documentation.

### CriticMarkup Annotations

Use the following key bindings to insert CriticMarkup:

- Addition (`ctrl+shift+a`): Suggest an addition to the text
- Deletion (`ctrl+shift+d`): Suggest text to be deleted (will markup currently selected text)
- Substitution (`ctrl+shift+s`): Suggest that text be substituted for other text (will markup the currently selected text as text to be substituted)
- Comment (`ctrl+shift+c`): Add a comment with optional author attribution
- Highlight and comment (`ctrl+shift+h`): Highlight and comment the text (selected text will be highlighted)

To cycle between changes, use:
- Next Change: `Alt+Shift+J` or toolbar button
- Previous Change: `Alt+Shift+K` or toolbar button

### Multi-line Support

CriticMarkup patterns can span multiple lines, including patterns with empty lines within them. This allows you to mark up entire paragraphs or sections.

**Important Limitation**: Multi-line patterns must start at the beginning of a line to work correctly in **preview rendering**. Patterns that start mid-line (after other text on the same line) will not render correctly in the preview. However, **navigation commands** (Next Change/Previous Change) work correctly for all patterns regardless of their position on the line.

**Examples:**

Addition spanning multiple lines:
```markdown
{++
This is a new paragraph that spans
multiple lines.

It can even include empty lines between paragraphs.
++}
```

Deletion of multiple paragraphs:
```markdown
{--
Remove this entire section
including multiple paragraphs.

This will all be marked as deleted.
--}
```

Multi-line substitution:
```markdown
{~~
Old text that spans
multiple lines
~>
New replacement text
that also spans multiple lines
~~}
```

Multi-line comments:
```markdown
{>>
This is a detailed comment
that provides extensive feedback
across multiple lines.
<<}
```

Multi-line highlights:
```markdown
{==
Highlight this important section
that spans multiple lines
for review.
==}
```

### Markdown Formatting

Access formatting commands via:
- **Toolbar buttons**: Click the "Markdown Formatting" button in the editor toolbar
- **Context menu**: Right-click in a Markdown file and select "Markdown Formatting"
- **Command palette**: Search for "Markdown" commands

Available formatting commands:
- **Text**: Bold, Italic, Bold Italic, Strikethrough, Underline, Inline Code
- **Lists**: Bulleted List, Numbered List, Task List
- **Blocks**: Code Block, Quote Block
- **Headings**: H1 through H6
- **Links**: Insert Link
- **Tables**: Reflow Table (reformats tables with proper alignment)

### Author Attribution

Comments can automatically include author names and timestamps. Configure this behavior in settings:

- `mdmarkup.includeAuthorNameInComments`: Include author name in comments (default: true)
- `mdmarkup.authorName`: Custom author name (default: OS username)
- `mdmarkup.includeTimestampInComments`: Include timestamp in comments (default: true)

Example comment with author attribution:
```markdown
{>>username (2024-12-06 16:30): This needs clarification.<<}
```

## Extension Settings

### CriticMarkup Settings

- `mdmarkup.includeAuthorNameInComments`: Include author name in comment attribution (default: true)
- `mdmarkup.authorName`: Author name to use in comments (leave empty to use OS username)
- `mdmarkup.includeTimestampInComments`: Include timestamp in comment author attribution (default: true)

### Syntax Highlighting Colors

The syntax highlight colors can be changed by modifying the following `textMateRules` under `editor.tokenColorCustomizations` in `settings.json`:

- `markup.inserted` - Additions (uses theme's insertion color)
- `markup.deleted` - Deletions (uses theme's deletion color)
- `markup.changed` - Substitutions (uses theme's change color)
- `entity.name.function` - Comments (uses theme's function color)
- `markup.bold` - Highlights (uses theme's bold color)

The extension uses standard TextMate scopes, so colors automatically adapt to your theme (light, dark, or high-contrast).

## Known Issues

- **Multi-line patterns must start at beginning of line**: Multi-line CriticMarkup patterns only work correctly in **preview rendering** when they start at the beginning of a line. Patterns that start mid-line (after other text) will not be recognized correctly for preview rendering. However, **navigation commands work correctly** for all patterns regardless of position. This is a known limitation due to how markdown-it processes block-level content.

- **TextMate syntax highlighting**: VS Code's TextMate grammar engine has limitations with multi-line pattern highlighting. While the extension attempts to provide syntax highlighting for multi-line patterns, the highlighting may not always extend correctly across all lines, especially for very long patterns or patterns with complex nesting.

- **Performance**: The extension handles multi-line patterns efficiently for typical documents. Very large documents (10,000+ lines) with many complex multi-line patterns may experience slight delays in syntax highlighting or navigation.

- **Nested patterns**: CriticMarkup patterns cannot be nested within each other. If you attempt to nest patterns (e.g., `{++outer {--inner--}++}`), only the first complete pattern will be recognized.

- **Unclosed patterns**: If you start a CriticMarkup pattern but don't close it (e.g., `{++text without closing`), the pattern will not be recognized as valid CriticMarkup. Navigation commands will not find it, and in the preview it will appear as literal text.

## Limitations

- **Multi-line preview rendering**: Only patterns starting at the beginning of a line are fully supported in preview
- **TextMate highlighting**: Inherent limitations with very long multi-line patterns
- **Nested patterns**: Not supported by CriticMarkup specification
- **Unclosed patterns**: Not recognized as valid markup

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

### [0.9.0] - 2024-2025

Major rewrite and expansion by Jonathan Bearak:
- Major rewrite with 90%+ new TypeScript code; snippets and TextMate grammar adapted from original extension
- Multi-line pattern support with empty lines
- Markdown preview rendering with theme-aware styling
- Author attribution in comments with timestamps
- Extensive Markdown formatting tools (20+ commands)
- Table reflow with column alignment
- Toolbar buttons and context menus
- Comprehensive test coverage with property-based testing
- Modern tooling (Bun, fast-check)
- Renamed to "mdmarkup" for clarity

### [0.2.0] - 2019-04-27 (Original)

- Implemented functionality to go to next/previous change
- Tidied up code and repository

### [0.1.1] - 2019-04-16 (Original)

- Improved support for markup that extends over multiple lines

### [0.1.0] - 2019-03-28 (Original)

- Initial release by Joel Lööw

## License

GPLv3 - See [LICENSE.txt](LICENSE.txt) for details.

## Credits

- **Original extension**: Joel Lööw (archived 2019)
- **Current maintainer**: Jonathan Bearak
- **CriticMarkup specification**: Gabe Weatherhead and Erik Hess
- **Markdown specification**: John Gruber

## Contributing

This is a personal fork with significant changes from the original. Issues and pull requests are welcome.

## Links

- [GitHub Repository](https://github.com/jbearak/mdmarkup)
- [CriticMarkup Official Site](https://github.com/CriticMarkup/CriticMarkup-toolkit)
- [Markdown Specification](https://daringfireball.net/projects/markdown/syntax)
- [Original Extension (archived)](https://github.com/CriticMarkup/vscode-criticmarkup)
