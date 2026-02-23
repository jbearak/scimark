# Requirements Document

## Introduction

This feature adds a context menu (right-click menu) to the Manuscript Markdown VS Code extension that provides quick access to Manuscript Markdown syntax operations and common Markdown formatting commands. When users select text in a Markdown document and right-click, they will see a menu with options to apply CriticMarkup annotations (additions, deletions, comments, highlights) as well as standard Markdown formatting (bold, italic, lists, quotes).

## Glossary

- **Manuscript Markdown**: A syntax for marking up proposed changes in text using special delimiters (e.g., `{++addition++}`, `{--deletion--}`)
- **Context Menu**: The right-click menu that appears when text is selected in the editor
- **Editor**: The VS Code text editing surface where Markdown documents are displayed
- **Selection**: Text that has been highlighted by the user in the editor
- **Command**: A VS Code command that can be invoked through menus, keybindings, or the command palette

## Requirements

### Requirement 1

**User Story:** As a user, I want to apply CriticMarkup annotations to selected text via a context menu, so that I can quickly mark additions, deletions, substitutions, comments, and highlights without memorizing syntax or keybindings.

#### Acceptance Criteria

1. WHEN a user selects text in a Markdown document and opens the context menu, THEN the system SHALL display a submenu labeled "Markdown Annotations" containing options for addition, deletion, substitution, highlight, comment, highlight+comment, substitute+comment, addition+comment, and deletion+comment
2. WHEN a user selects the "Mark as Addition" option, THEN the system SHALL wrap the selected text with `{++` and `++}` delimiters
3. WHEN a user selects the "Mark as Deletion" option, THEN the system SHALL wrap the selected text with `{--` and `--}` delimiters
4. WHEN a user selects the "Substitution" option, THEN the system SHALL wrap the selected text with `{~~` and `~>~~}` delimiters and position the cursor after the `~>` marker for entering replacement text
5. WHEN a user selects the "Highlight" option, THEN the system SHALL wrap the selected text with `{==` and `==}` delimiters
6. WHEN a user selects the "Comment" option with no text selected, THEN the system SHALL insert `{>><<}` and position the cursor between the delimiters
7. WHEN a user selects the "Highlight and Comment" option, THEN the system SHALL wrap the selected text with `{==` and `==}` delimiters and append `{>><<}` with the cursor positioned between the comment delimiters
8. WHEN a user selects the "Substitute and Comment" option, THEN the system SHALL wrap the selected text with `{~~` and `~>~~}` delimiters and append `{>><<}` with the cursor positioned between the comment delimiters
9. WHEN a user selects the "Addition and Comment" option, THEN the system SHALL wrap the selected text with `{++` and `++}` delimiters and append `{>><<}` with the cursor positioned between the comment delimiters
10. WHEN a user selects the "Deletion and Comment" option, THEN the system SHALL wrap the selected text with `{--` and `--}` delimiters and append `{>><<}` with the cursor positioned between the comment delimiters

### Requirement 2

**User Story:** As a user, I want to apply standard Markdown formatting to selected text via a context menu, so that I can quickly make text bold, italic, underlined, or formatted as code without typing the syntax manually.

#### Acceptance Criteria

1. WHEN a user selects text in a Markdown document and opens the context menu, THEN the system SHALL display a submenu labeled "Markdown Formatting" containing options for bold, italic, bold italic, underline, inline code, code block, and a heading submenu
2. WHEN a user selects the "Bold" option, THEN the system SHALL wrap the selected text with `**` delimiters on both sides
3. WHEN a user selects the "Italic" option, THEN the system SHALL wrap the selected text with `_` delimiters on both sides
4. WHEN a user selects the "Bold Italic" option, THEN the system SHALL wrap the selected text with `***` delimiters on both sides
5. WHEN a user selects the "Underline" option, THEN the system SHALL wrap the selected text with `<u>` and `</u>` HTML tags
6. WHEN a user selects the "Inline Code" option, THEN the system SHALL wrap the selected text with `` ` `` delimiters on both sides
7. WHEN a user selects the "Code Block" option, THEN the system SHALL wrap the selected text with ``` ``` ``` delimiters on separate lines above and below the selection
8. WHEN a user opens the "Heading" submenu, THEN the system SHALL display options for Heading 1 through Heading 6
9. WHEN a user selects a heading level option, THEN the system SHALL remove any existing heading indicators from the beginning of the line and place the appropriate number of `#` characters followed by a space at the beginning of the line

### Requirement 3

**User Story:** As a user, I want to convert multiple selected lines into lists via a context menu, so that I can quickly format content as bulleted or numbered lists.

#### Acceptance Criteria

1. WHEN a user selects multiple lines of text in a Markdown document and opens the context menu, THEN the system SHALL display a submenu labeled "Markdown Formatting" containing options for bulleted list and numbered list
2. WHEN a user selects the "Bulleted List" option, THEN the system SHALL prepend `- ` to each selected line
3. WHEN a user selects the "Numbered List" option, THEN the system SHALL prepend sequential numbers followed by `. ` to each selected line starting from `1. `
4. WHEN a selected line already begins with list syntax, THEN the system SHALL preserve existing indentation and apply the list marker appropriately

### Requirement 4

**User Story:** As a user, I want to convert selected lines into quoted text via a context menu, so that I can quickly format content as block quotes.

#### Acceptance Criteria

1. WHEN a user selects one or more lines of text in a Markdown document and opens the context menu, THEN the system SHALL display a "Quote Block" option in the "Markdown Formatting" submenu
2. WHEN a user selects the "Quote Block" option, THEN the system SHALL prepend `> ` to each selected line
3. WHEN a selected line already begins with `> `, THEN the system SHALL not add an additional quote marker

### Requirement 5

**User Story:** As a developer, I want the context menu to only appear in Markdown documents, so that the extension does not interfere with other file types.

#### Acceptance Criteria

1. WHEN a user opens the context menu in a Markdown document, THEN the system SHALL display the Markdown Annotations and Markdown Formatting submenus
2. WHEN a user opens the context menu in a non-Markdown document, THEN the system SHALL not display the Markdown Annotations or Markdown Formatting submenus
3. WHEN the editor language mode changes from Markdown to another language, THEN the system SHALL remove the context menu contributions

### Requirement 6

**User Story:** As a user, I want the context menu commands to handle edge cases gracefully, so that the extension behaves predictably in all scenarios.

#### Acceptance Criteria

1. WHEN no text is selected and a user invokes a formatting command that requires selection, THEN the system SHALL either apply the formatting at the cursor position with empty delimiters or display an appropriate message
2. WHEN a user selects text that already contains the target formatting syntax, THEN the system SHALL apply the formatting without removing existing syntax
3. WHEN a user invokes a command on an empty line, THEN the system SHALL insert the appropriate syntax at the cursor position
4. WHEN a user's selection spans multiple paragraphs, THEN the system SHALL apply line-based formatting (lists, quotes) to each line independently
