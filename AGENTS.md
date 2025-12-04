# AGENTS.md

## Overview

This is a VS Code extension that adds CriticMarkup support to Visual Studio Code. CriticMarkup is a syntax for marking up proposed changes in text: additions, deletions, substitutions, comments, and highlights. The extension provides syntax highlighting, snippets with keybindings, and navigation commands to cycle through changes.

## Development commands

- Setup dependencies:
```sh
bun install
```
- Compile TypeScript:
```sh
bun run compile
```
- Watch during development:
```sh
bun run watch
```
- Package a `.vsix` for local install or distribution:
```sh
bunx vsce package
```
- Install the built VSIX in VS Code:
```sh
code --install-extension vscode-criticmarkup-<version>.vsix
```

Notes:
- No lint or test scripts are configured in `package.json`.
- Bun auto-loads `.env` files; no separate dotenv setup is required.

## Code architecture

### Entry point: `src/extension.ts`

Responsibilities:
- Activation: Registers CriticMarkup commands (`criticmarkup.nextChange`, `criticmarkup.prevChange`).
- Note: The extension does not actively scan the document in the background. Navigation commands calculate positions on-demand.

Key flows:
- Commands: `nextChange` and `prevChange` invoke logic in `src/changes.ts` to find the next/previous occurrence relative to the cursor.
- Syntax Highlighting: Handled entirely by the TextMate grammar in `syntaxes/criticmarkup.json`, which injects scopes into Markdown documents. No manual decoration logic is used.

Related resources:
- `snippets.json` — snippet bodies for CriticMarkup syntax
- `package.json` — extension metadata, activation events, commands, grammar contribution
- `syntaxes/criticmarkup.json` — TextMate injection grammar (path referenced in `package.json`)

## Tooling conventions

- Use Bun for all scripts and dependency management: `bun install`, `bun run <script>`.
- Use `bunx vsce package` to build the VSIX.
- Prefer Bun’s defaults (e.g., `.env` auto-loading) where applicable.
