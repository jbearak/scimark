# AGENTS.md - LLM Guidance for Manuscript Markdown

Treat this as a living document. When you fix a subtle bug, add a comment in the relevant source file and update pointers/invariants here.

## What to read

User-facing: `README.md`, `docs/`
Extension: `src/extension.ts` (entry point), `src/changes.ts` (navigation), `src/formatting.ts` (text transformations), `src/preview/manuscript-markdown-plugin.ts` (preview), `syntaxes/manuscript-markdown.json` (syntax highlighting)
Conversion: `src/converter.ts` (docx → md), `src/md-to-docx.ts` (md → docx)
LSP: `src/lsp/server.ts` (language server — diagnostics, completions)

## Cross-cutting learnings

- Template literal corruption: never use `$$` in code touched by tool text-replacement operations — `$` is special in replacement strings and `$$` gets corrupted. Use string concatenation instead.
- Word-save blockquotes: Word may rewrite `GitHub` style paragraphs to `GitHubBlockquote` and split hidden `\u200B_bqgN` metadata across multiple hidden runs. Keep blockquote style detection and hidden-run parsing robust to that rewrite.

Per-module learnings live as comments in the corresponding source files.

## Quick commands

- `bun install` — install dependencies
- `bun run compile` — build the extension
- `bun test` — run all tests
- `bun run watch` — watch mode
- `bun run package` — package the extension
