# mdmarkup - Markdown Annotations and Formatting for VS Code

A comprehensive [Markdown](https://daringfireball.net/projects/markdown/syntax) extension for Visual Studio Code with [CriticMarkup](https://github.com/CriticMarkup/CriticMarkup-toolkit) annotations and extensive formatting tools.

Download from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jbearak.mdmarkup) or install locally via `.vsix` from [releases](https://github.com/jbearak/mdmarkup/releases).

## Quick Start

### CriticMarkup Annotations

Use key bindings to insert annotations:

- **Addition** (`Ctrl+Shift+A`): `{++new text++}`
- **Deletion** (`Ctrl+Shift+D`): `{--old text--}`
- **Substitution** (`Ctrl+Shift+S`): `{~~old~>new~~}`
- **Comment** (`Ctrl+Shift+C`): `{>>feedback<<}`
- **Highlight** (`Ctrl+Shift+H`): `{==important==}`

Navigate with:
- **Next Change**: `Alt+Shift+J` or toolbar button
- **Previous Change**: `Alt+Shift+K` or toolbar button

### Markdown Formatting

Click **Markdown Formatting** in the toolbar or right-click menu for:
- **Text**: Bold, Italic, Strikethrough, Code
- **Lists**: Bulleted, Numbered, Task Lists
- **Blocks**: Code Block, Quote Block
- **Headings**: H1–H6
- **Links & Tables**: Insert Link, Reflow Table with alignment
- **Word Count**: Document or selection

## Features

**CriticMarkup Annotations:**
- Five CriticMarkup patterns with key bindings and menu access
- Full **multi-line support** including patterns with empty lines
- **Live preview rendering** with theme-aware styling
- **Automatic author attribution** with optional timestamps
- Navigation commands for annotations
- Syntax highlighting with standard TextMate scopes

**Markdown Formatting:**
- Text formatting (bold, italic, strikethrough, code)
- Lists (bulleted, numbered, task lists) with smart nesting
- Headings (H1–H6) and outline support
- Code blocks and quote blocks
- **Smart table reflow** with column alignment
- Word count for document or selection

**Preview and Display:**
- Live Markdown preview with CriticMarkup rendering
- Theme-aware colors (automatic light/dark/high-contrast)
- Syntax highlighting injection into Markdown
- Multi-line pattern support

**Configuration:**
- Customizable author name (defaults to OS username)
- Optional timestamps in comments
- All features configurable via settings

## Installation

### VS Code Marketplace

Install directly from the [marketplace](https://marketplace.visualstudio.com/items?itemName=jbearak.mdmarkup).

### From VSIX

Download the `.vsix` from [releases](https://github.com/jbearak/mdmarkup/releases):

```bash
code --install-extension mdmarkup-<version>.vsix
```

Or in VS Code: Extensions → `...` menu → "Install from VSIX..."

## Documentation

**User guides:**
- [Usage Guide](docs/usage.md) - Full feature documentation and examples
- [Configuration](docs/configuration.md) - All settings and customization options
- [CriticMarkup Reference](https://github.com/CriticMarkup/CriticMarkup-toolkit) - Markup syntax specification

**Development:**
- [Development Guide](docs/development.md) - Build, test, and contribution guide
- [AGENTS.md](AGENTS.md) - Development guidance, key invariants, and learnings

## Known Issues and Limitations

- **Multi-line preview rendering**: Multi-line patterns only render correctly in preview when they start at the **beginning of a line**. Patterns starting mid-line won't render, but **navigation commands work for patterns at any position**.

- **TextMate syntax highlighting**: VS Code's TextMate grammar has limitations with complex multi-line patterns. While syntax highlighting is provided, very long patterns may not highlight perfectly across all lines.

- **Nested patterns**: CriticMarkup patterns cannot be nested. Only the first complete pattern is recognized.

- **Unclosed patterns**: Patterns without proper closing markup (e.g., `{++text without closing`) appear as literal text.

## Development

See [Development Guide](docs/development.md) for building, testing, and contribution instructions.

For detailed development guidance including key invariants and learnings, see [AGENTS.md](AGENTS.md).

## Provenance

This project began as a fork of the archived [vscode-criticmarkup](https://github.com/jloow/vscode-criticmarkup) extension by Joel Lööw (2019), which provided basic CriticMarkup syntax highlighting and snippets. This version represents a complete architectural rewrite that extends the original with multi-line patterns, live preview, formatting tools, and comprehensive testing.

## License

[GPLv3](LICENSE.txt) - See [LICENSE.txt](LICENSE.txt) for details.

## Credits

- **Original extension**: Joel Lööw
- **CriticMarkup specification**: Gabe Weatherhead and Erik Hess
- **Markdown specification**: John Gruber

## Contributing

Issues and pull requests are welcome. For significant changes, please open an issue first to discuss the proposed changes.

## Links

- [GitHub Repository](https://github.com/jbearak/mdmarkup)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jbearak.mdmarkup)
- [CriticMarkup Official Site](https://github.com/CriticMarkup/CriticMarkup-toolkit)
- [Markdown Specification](https://daringfireball.net/projects/markdown/syntax)
