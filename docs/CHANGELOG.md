# Changelog

All notable changes to mdmarkup are documented here.

## [0.9.1] - 2025

### Added
- Word count display for entire document or selected text

## [0.9.0] - 2024-2025

### Major Rewrite
Complete rewrite with ~3,500+ lines of TypeScript and comprehensive test coverage:
- Multi-line pattern support with empty lines
- Markdown preview rendering with theme-aware styling
- Author attribution in comments with timestamps
- Extensive Markdown formatting tools (20+ commands)
- Smart table reflow with column alignment
- Toolbar buttons and context menus
- Comprehensive test coverage with property-based testing
- Modern tooling: Bun, fast-check property testing
- Renamed to **mdmarkup** to reflect expanded scope

### Changed
- Project renamed from "criticmarkup" to "mdmarkup"
- Codebase refactored from ~200 lines to ~3,500+ lines
- Added theme integration using standard TextMate scopes

## [0.2.0] - 2019-04-27 (Original)

### Initial Features
- Implemented functionality to go to next/previous change
- Syntax highlighting for CriticMarkup patterns
- Snippets for the five CriticMarkup patterns
- ~200 lines of TypeScript code

## [0.1.1] - 2019-04-16 (Original)

### Improved
- Improved support for markup that extends over multiple lines

## [0.1.0] - 2019-03-28 (Original)

### Initial Release
- Initial release by Joel Lööw
- Basic CriticMarkup support in VS Code
