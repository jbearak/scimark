# Design Document

## Overview

This design enhances the Manuscript Markdown extension's comment functionality by automatically prepending author names to comments. The implementation modifies the existing comment insertion logic in `src/formatting.ts` to include author information, adds configuration settings for customization, and implements a simple username retrieval mechanism using the OS username as a fallback.

The design prioritizes simplicity and performance by using synchronous operations and avoiding complex Git API interactions. Configuration settings provide flexibility for users who want to specify a custom name or disable the feature entirely.

## Architecture

### Component Overview

The implementation consists of three main components:

1. **Author Name Retrieval Module** (`src/author.ts`): Handles retrieving the author name from configuration settings or OS username
2. **Enhanced Formatting Functions** (`src/formatting.ts`): Modified comment insertion functions that include author prefixes
3. **Configuration Schema** (`package.json`): Extension settings for author name customization

### Data Flow

```
User invokes comment command
    ↓
Extension command handler (extension.ts)
    ↓
Get author name (author.ts)
    ├─→ Check disable setting → Return null if disabled
    ├─→ Check authorName setting → Return value if set
    └─→ Get OS username → Return OS username or null
    ↓
Format comment with author prefix (formatting.ts)
    ├─→ If author name exists: {>>@Name: <<}
    └─→ If no author name: {>><<}
    ↓
Insert text and position cursor
```

## Components and Interfaces

### Author Name Retrieval Module

**File**: `src/author.ts`

**Purpose**: Centralized logic for retrieving the author name based on configuration and Git API

**Interface**:

```typescript
/**
 * Retrieves the author name for comment attribution
 * Returns null if disabled or unavailable
 * Always returns synchronously - never blocks
 */
export function getAuthorName(): string | null;
```

**Implementation Details**:

- Check settings in priority order:
  1. `manuscriptMarkdown.disableAuthorNames` - if true, return null immediately
  2. `manuscriptMarkdown.authorName` - if set, return this value
  3. OS username via `os.userInfo()` - return username or null
- All operations are synchronous
- No caching - settings can change between invocations
- Fail fast on any errors

### Enhanced Formatting Functions

**File**: `src/formatting.ts`

**Modified Functions**:

All comment-related functions will be updated to accept an optional author name parameter:

```typescript
/**
 * Wraps selected text with prefix and suffix delimiters
 * Optionally includes author name in comments
 */
export function wrapSelection(
  text: string,
  prefix: string,
  suffix: string,
  cursorOffset?: number,
  authorName?: string | null
): TextTransformation;

/**
 * Wraps text with highlight and appends a comment with optional author
 */
export function highlightAndComment(
  text: string,
  authorName?: string | null
): TextTransformation;

/**
 * Similar updates for:
 * - substituteAndComment
 * - additionAndComment
 * - deletionAndComment
 */
```

**Author Prefix Logic**:

- If `authorName` is provided and not null: insert `@AuthorName: ` after `{>>`
- If `authorName` is null or undefined: insert nothing (current behavior)
- Cursor positioning must account for the author prefix length

### Configuration Schema

**File**: `package.json`

**Settings**:

```json
{
  "contributes": {
    "configuration": {
      "title": "Manuscript Markdown",
      "properties": {
        "manuscriptMarkdown.disableAuthorNames": {
          "type": "boolean",
          "default": false,
          "description": "Disable automatic author names in comments"
        },
        "manuscriptMarkdown.authorName": {
          "type": "string",
          "default": "",
          "description": "Author name to use in comments (leave empty to use OS username)"
        }
      }
    }
  }
}
```

### Extension Integration

**File**: `src/extension.ts`

**Modifications**:

Update all comment command handlers to retrieve and pass the author name:

```typescript
import * as author from './author';

// Example for insertComment command
vscode.commands.registerCommand('manuscript-markdown.insertComment', () => 
  applyFormatting((text) => {
    const authorName = author.getAuthorName();
    return formatting.wrapSelection(text, '{>>', '<<}', 3, authorName);
  })
)
```

## Data Models

### TextTransformation Interface

No changes required to the existing interface:

```typescript
export interface TextTransformation {
  newText: string;
  cursorOffset?: number;
}
```

### Configuration Values

```typescript
interface manuscriptMarkdownConfig {
  disableAuthorNames: boolean;
  authorNameOverride: string;
}
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Comment format with author name
*For any* valid username string, when inserted into a comment, the resulting text should match the format `{>>@Username: <<}` and the cursor offset should position the cursor immediately after the colon and space.
**Validates: Requirements 1.2**

Property 2: Highlight-and-comment format with author name
*For any* selected text and valid username, when the highlight-and-comment command is invoked, the resulting text should match the format `{==selected text==}{>>@Username: <<}` with the cursor positioned after the colon and space in the comment section.
**Validates: Requirements 1.4**

Property 3: Author name setting precedence
*For any* non-empty author name setting value, the system should use that value as the author name and not use the OS username.
**Validates: Requirements 2.1**

Property 4: Special characters preservation
*For any* username containing special characters (including @, :, {, }, <, >, spaces, unicode), the username should appear in the comment exactly as provided without modification or escaping.
**Validates: Requirements 3.3**

## Error Handling

### Configuration Errors

- **Invalid setting values**: Empty strings in `authorName` are treated as "not set" and fall through to OS username
- **Type mismatches**: VS Code handles type validation for settings; our code assumes correct types

### OS Username Errors

- **os.userInfo() throws exception**: Catch and return null, insert comment without author prefix
- **Undefined/null response**: Treat as unavailable, insert comment without author prefix

### Edge Cases

- **Empty username from OS**: Treat as null, insert comment without author prefix
- **Whitespace-only username**: Insert as-is (user's OS config, not our concern)
- **Very long usernames**: No truncation, insert as-is

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and integration points:

1. **Configuration reading**: Test that settings are read correctly
2. **Disable setting behavior**: Verify that when disabled, no author prefix is added
3. **Author name setting behavior**: Verify that author name value is used when set
4. **Settings precedence**: Verify disable takes precedence over author name
5. **OS username fallback**: Verify OS username is used when author name is not set
6. **Empty selection edge case**: Verify highlight-and-comment works with empty selection
7. **No username edge case**: Verify comment format when username is null

### Property-Based Tests

Property-based tests will verify universal properties across many inputs using the `fast-check` library (already in devDependencies):

**Test Configuration**:
- Minimum 100 iterations per property test
- Use fast-check's built-in generators for strings and text

**Property Tests**:

1. **Property 1: Comment format with author name**
   - Generate random username strings
   - Verify output matches `{>>@Username: <<}` format
   - Verify cursor offset positions cursor after `: `
   - **Validates: Requirements 1.2**

2. **Property 2: Highlight-and-comment format with author name**
   - Generate random selected text and usernames
   - Verify output matches `{==text==}{>>@Username: <<}` format
   - Verify cursor positioning
   - **Validates: Requirements 1.4**

3. **Property 3: Author name setting precedence**
   - Generate random author name values
   - Verify OS username is not used when author name is set
   - **Validates: Requirements 2.1**

4. **Property 4: Special characters preservation**
   - Generate usernames with special characters: `@`, `:`, `{`, `}`, `<`, `>`, spaces, unicode
   - Verify username appears unmodified in output
   - **Validates: Requirements 3.3**

### Testing Approach

- **Implementation-first**: Implement the feature before writing tests
- **Fast-check library**: Use the existing `fast-check` dependency for property-based testing
- **No mocking for core logic**: Test actual formatting functions directly
- **Mock only external dependencies**: Mock VS Code API and Git extension API where necessary

## Implementation Notes

### Performance Considerations

- **Synchronous operations only**: No async/await in the critical path
- **No caching**: Settings are lightweight to read, OS username retrieval is fast
- **Fail-fast**: Any delay or error results in immediate fallback to no author prefix

### OS Username Retrieval

The OS username is accessed via Node.js:

```typescript
import * as os from 'os';

const userInfo = os.userInfo();
const username = userInfo.username;
```

**Note**: This provides synchronous access to the system username without spawning external processes.

### Cursor Positioning

When author name is added, cursor offset calculations must account for the additional characters:

- Without author: `{>><<}` - cursor at offset 3 (between `>>` and `<<`)
- With author: `{>>@Name: <<}` - cursor at offset 3 + author prefix length

The author prefix length is: `@` + username + `: ` = username.length + 3

### Backward Compatibility

- Existing commands continue to work without author names if feature is disabled
- No breaking changes to existing functionality
- Settings are optional with sensible defaults (feature enabled, no override)
