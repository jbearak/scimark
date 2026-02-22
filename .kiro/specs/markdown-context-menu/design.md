# Design Document: Markdown Context Menu

## Overview

This feature extends the Scientific Markdown VS Code extension by adding context menu (right-click menu) support for applying CriticMarkup annotations and Markdown formatting to selected text. The implementation will register new VS Code commands for each formatting operation and contribute them to the editor context menu, organized into two submenus: "Markdown Annotations" (for Scientific Markdown syntax) and "Markdown Formatting" (for standard Markdown operations).

The design follows VS Code extension patterns by:
- Registering commands in `package.json` contributions
- Implementing command handlers that manipulate text selections
- Using VS Code's `editor/context` menu contribution point
- Leveraging the existing activation on Markdown language mode

## Architecture

The feature consists of three main layers:

1. **Command Registration Layer** (`package.json`): Declares commands and menu contributions with appropriate `when` clauses to ensure they only appear in Markdown documents
2. **Command Handler Layer** (`src/extension.ts`): Registers command implementations that delegate to formatting functions
3. **Formatting Logic Layer** (`src/formatting.ts`): Contains pure functions that generate the appropriate text transformations for each operation

This separation ensures:
- Commands are discoverable through VS Code's command palette
- Formatting logic is testable independently of VS Code APIs
- Menu contributions are declarative and maintainable

## Components and Interfaces

### 1. Command Definitions (`package.json`)

New commands will be added to the `contributes.commands` section:

**Markdown Annotations submenu:**
- `scimark.markAddition` - Mark as Addition
- `scimark.markDeletion` - Mark as Deletion
- `scimark.markSubstitution` - Substitution
- `scimark.highlight` - Highlight
- `scimark.insertComment` - Comment
- `scimark.highlightAndComment` - Highlight and Comment

**Markdown Formatting submenu:**
- `markdown.formatBold` - Bold
- `markdown.formatItalic` - Italic
- `markdown.formatUnderline` - Underline
- `markdown.formatInlineCode` - Inline Code
- `markdown.formatCodeBlock` - Code Block
- `markdown.formatBulletedList` - Bulleted List
- `markdown.formatNumberedList` - Numbered List
- `markdown.formatQuoteBlock` - Quote Block

**Heading submenu (under Markdown Formatting):**
- `markdown.formatHeading1` - Heading 1
- `markdown.formatHeading2` - Heading 2
- `markdown.formatHeading3` - Heading 3
- `markdown.formatHeading4` - Heading 4
- `markdown.formatHeading5` - Heading 5
- `markdown.formatHeading6` - Heading 6

### 2. Menu Contributions (`package.json`)

Commands will be contributed to `editor/context` menu with:
- `when` clause: `editorLangId == markdown` to restrict to Markdown files
- `group` property: `9_markdown` to position appropriately in context menu
- Submenu structure using VS Code's submenu API

### 3. Formatting Module (`src/formatting.ts`)

```typescript
export interface TextTransformation {
  newText: string;
  cursorOffset?: number; // Optional cursor position relative to start
}

export function wrapSelection(
  text: string,
  prefix: string,
  suffix: string,
  cursorOffset?: number
): TextTransformation;

export function wrapLines(
  text: string,
  linePrefix: string,
  skipIfPresent?: boolean
): TextTransformation;

export function wrapLinesNumbered(text: string): TextTransformation;
```

### 4. Command Handlers (`src/extension.ts`)

Each command handler will:
1. Get the active text editor
2. Get the current selection(s)
3. Call the appropriate formatting function
4. Apply the edit using `editor.edit()`
5. Optionally adjust cursor position

## Data Models

### TextTransformation

```typescript
interface TextTransformation {
  newText: string;        // The transformed text
  cursorOffset?: number;  // Optional cursor position for insertion point
}
```

This interface encapsulates the result of a formatting operation, allowing the command handler to apply the transformation and position the cursor appropriately.

### Selection Context

Commands operate on `vscode.Selection` objects which provide:
- `text`: The selected text content
- `range`: The position in the document
- `isEmpty`: Whether any text is selected

## Error Handling

The extension will handle edge cases gracefully:

1. **No Active Editor**: Commands silently return if no editor is active
2. **Empty Selection**: 
   - For wrapping operations (bold, italic, etc.): Insert delimiters with cursor positioned between them
   - For comment operations: Insert empty comment syntax with cursor positioned for input
3. **Multiple Selections**: Process each selection independently using VS Code's multi-cursor support
4. **Invalid Context**: Menu items only appear in Markdown files due to `when` clauses

Error handling will be minimal and defensive:
- No error messages for expected edge cases (empty selections)
- Silent failures for invalid states (no editor)
- Graceful degradation (apply formatting even if text already contains syntax)

## Testing Strategy

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Correctness Properties

Property 1: Text wrapping preserves content
*For any* text string and any wrapping operation (addition, deletion, highlight, bold, italic, underline, inline code), the wrapped result should contain the original text unchanged between the delimiters
**Validates: Requirements 1.2, 1.3, 1.5, 2.2, 2.3, 2.4, 2.5**

Property 2: Substitution wrapping structure
*For any* text string, applying substitution formatting should produce a result that starts with `{~~`, contains the original text, followed by `~>~~}`, with cursor offset positioned after the `~>` marker
**Validates: Requirements 1.4**

Property 3: Highlight and comment combination
*For any* text string, applying highlight and comment should produce a result containing the text wrapped in `{==` and `==}` followed by `{>><<}`, with cursor offset positioned between the comment delimiters
**Validates: Requirements 1.7**

Property 4: Code block wrapping with newlines
*For any* text string, applying code block formatting should produce a result with ` ``` ` on a line before the text and ` ``` ` on a line after the text
**Validates: Requirements 2.6**

Property 5: Line prefixing applies to all lines
*For any* multi-line text and any line prefix (bullet `-`, quote `>`), applying the formatting should result in every line starting with the prefix followed by a space
**Validates: Requirements 3.2, 4.2**

Property 6: Numbered list sequential numbering
*For any* multi-line text with N lines, applying numbered list formatting should result in each line prefixed with sequential numbers from `1. ` to `N. `
**Validates: Requirements 3.3**

Property 7: Quote block idempotence
*For any* multi-line text, applying quote block formatting twice should produce the same result as applying it once (lines should not get double `>` prefixes)
**Validates: Requirements 4.3**

Property 8: Multi-paragraph line independence
*For any* text containing multiple paragraphs separated by blank lines, applying line-based formatting should transform each non-empty line independently without affecting blank lines
**Validates: Requirements 6.4**

Property 9: Heading level replacement
*For any* text line and any heading level N (1-6), applying heading N formatting should first remove any existing heading indicators (one or more `#` characters followed by a space) from the beginning of the line, then place exactly N `#` characters followed by a space at the beginning of the line
**Validates: Requirements 2.9**

### Unit Testing

Unit tests will cover:
- Empty selection handling (edge case from 1.5, 6.1, 6.3)
- Integration with VS Code editor API (applying edits, cursor positioning)
- Lines that already contain list syntax (edge case from 3.4)
- Command registration and activation

### Property-Based Testing

The testing strategy uses property-based testing to verify universal correctness properties:

**Framework**: We will use `fast-check` for TypeScript property-based testing
**Configuration**: Each property test will run a minimum of 100 iterations
**Tagging**: Each test will include a comment referencing the design property: `// Feature: markdown-context-menu, Property N: <property text>`

Property tests will:
- Generate random text strings (including special characters, newlines, existing formatting)
- Apply formatting functions
- Verify the correctness properties hold
- Use smart generators that include edge cases (empty strings, very long strings, strings with existing markdown syntax)

The dual testing approach ensures:
- Property tests verify general correctness across all inputs
- Unit tests verify specific integration points and edge cases
- Together they provide comprehensive coverage

## Implementation Notes

### VS Code API Usage

The implementation will use:
- `vscode.commands.registerCommand()` to register command handlers
- `editor.edit()` to apply text transformations atomically
- `editor.selection` to get/set cursor position
- `document.getText(range)` to extract selected text
- `document.lineAt()` for line-based operations

### Submenu Structure

VS Code supports submenus in context menus using the `submenus` contribution point:

```json
"submenus": [
  {
    "id": "markdown.annotations",
    "label": "Markdown Annotations"
  },
  {
    "id": "markdown.formatting",
    "label": "Markdown Formatting"
  },
  {
    "id": "markdown.heading",
    "label": "Heading"
  }
]
```

Commands are then contributed to these submenus using the submenu ID in the menu path. The Heading submenu will be nested under the Markdown Formatting submenu.

### Performance Considerations

- All formatting operations are O(n) where n is the text length
- Multi-selection support processes each selection independently
- No background processing or document scanning required
- Commands only execute on user action

### Compatibility

- Minimum VS Code version: ^1.103.2
- No additional dependencies required (except VS Code version)
- Works with existing Scientific Markdown syntax highlighting
- Compatible with VS Code's built-in Markdown features
