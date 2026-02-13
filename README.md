# mdmarkup - Markdown Annotations and Formatting for VS Code

mdmarkup extends VS Code with CriticMarkup support for tracking changes, suggestions, and comments in Markdown files.

> Download from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jbearak.mdmarkup) or install locally via `.vsix` from [releases](https://github.com/jbearak/mdmarkup/releases).

This is a major rewrite and expansion of the archived [vscode-criticmarkup](https://github.com/jloow/vscode-criticmarkup) extension (original by Joel Lööw, 2019). See [About This Fork](#about-this-fork) for details on what changed.

### Annotations

Move through annotations with:
- **Next Change**: `Alt+Shift+J` or toolbar button
- **Previous Change**: `Alt+Shift+K` or toolbar button

### Markdown Formatting

Click the **Markdown Formatting** button in the toolbar or right-click menu to access:
- **Text**: Bold, Italic, Bold Italic, Strikethrough, Underline, Inline Code
- **Lists**: Bulleted, Numbered, Task Lists
- **Blocks**: Code Block, Quote Block
- **Headings**: H1–H6
- **Links**: Insert Link
- **Tables**: Reflow with automatic column alignment
- **Word Count**: Display count for document or selection

## Installation

### VS Code Marketplace

Install directly from the [marketplace](https://marketplace.visualstudio.com/items?itemName=jbearak.mdmarkup).

### From VSIX

Download the `.vsix` from [releases](https://github.com/jbearak/mdmarkup/releases) and install:

```bash
code --install-extension mdmarkup-<version>.vsix
```

Or in VS Code: Extensions → `...` menu → "Install from VSIX..."

## Documentation

- [Usage Guide](docs/usage.md) - Full feature documentation and examples
- [Configuration](docs/configuration.md) - All settings and customization options
- [CriticMarkup Reference](https://github.com/CriticMarkup/CriticMarkup-toolkit) - Markup syntax specification

See also:
- [Known Issues and Limitations](#known-issues-and-limitations)
- [Release Notes](#release-notes)

## Known Issues and Limitations

- **Multi-line preview rendering**: Multi-line CriticMarkup patterns only render correctly in preview when they start at the **beginning of a line**. Patterns that start mid-line (after other text on the same line) will not render in preview. However, **navigation commands work correctly** for patterns at any position.

- **TextMate syntax highlighting**: VS Code's TextMate grammar has inherent limitations with multi-line patterns. While syntax highlighting is provided, very long multi-line patterns may not highlight perfectly across all lines.

- **Nested patterns**: CriticMarkup patterns cannot be nested. If you attempt to nest patterns, only the first complete pattern is recognized.

- **Unclosed patterns**: Patterns without proper closing markup (e.g., `{++text without closing`) are not recognized as valid markup and appear as literal text.

## Development

### Build and Test

```bash
# Setup dependencies
bun install

# Compile TypeScript
bun run compile

# Watch during development
bun run watch

# Run tests
bun test

# Package for distribution
bunx vsce package
```

### Development Notes

- **Language**: TypeScript
- **Package manager**: Bun (handles all scripts and dependencies)
- **Testing**: Bun test runner with fast-check for property-based testing
- **Target**: ES2019

For detailed development guidance, see [AGENTS.md](AGENTS.md).

## About This Fork

This extension is a major rewrite and expansion of the archived [vscode-criticmarkup](https://github.com/jloow/vscode-criticmarkup) by Joel Lööw (2019).

**Original extension (v0.2.0, 2019)**:
- Basic syntax highlighting
- Snippets for markup patterns
- Navigation commands
- ~200 lines of TypeScript, no tests

**This fork (v0.9.1, 2025)**:
- Complete rewrite: ~3,500+ lines of TypeScript with comprehensive tests
- Renamed to **mdmarkup** to reflect expanded scope
- **Multi-line pattern support** with empty lines
- **Live preview rendering** with markdown-it plugin
- **Author attribution** with automatic timestamps
- **20+ formatting commands** (bold, lists, headings, tables, etc.)
- **Smart table reflow** with column alignment
- **Toolbar and context menus** for easy access
- **Modern tooling**: Bun, property-based testing (fast-check)
- **Theme integration**: Uses standard TextMate scopes for automatic adaptation

Small portions of the original remain (snippet descriptions, TextMate grammar patterns), but the vast majority is new code and assets.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for full release history.

### [0.9.1] - 2025

- Added word count display for entire document or selected text

### [0.9.0] - 2024-2025

Major rewrite:
- Multi-line pattern support with empty lines
- Markdown preview rendering with theme-aware styling
- Author attribution in comments with timestamps
- Extensive Markdown formatting tools (20+ commands)
- Table reflow with column alignment
- Toolbar buttons and context menus
- Comprehensive test coverage with property-based testing

### [0.2.0] - 2019 (Original)

- Initial community extension by Joel Lööw with basic syntax highlighting and snippets

## License

[GPLv3](LICENSE.txt) - See [LICENSE.txt](LICENSE.txt) for details.

## Credits

- **Original extension**: Joel Lööw (archived 2019)
- **Current maintainer**: Jonathan Bearak
- **CriticMarkup specification**: Gabe Weatherhead and Erik Hess
- **Markdown specification**: John Gruber

## Contributing

Issues and pull requests are welcome. For significant changes, please open an issue first to discuss the proposed changes.

## Links

- [GitHub Repository](https://github.com/jbearak/mdmarkup)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jbearak.mdmarkup)
- [CriticMarkup Official Site](https://github.com/CriticMarkup/CriticMarkup-toolkit)
- [Markdown Specification](https://daringfireball.net/projects/markdown/syntax)
