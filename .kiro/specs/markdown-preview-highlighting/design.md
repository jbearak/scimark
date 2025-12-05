# Design Document: Markdown Preview CriticMarkup Highlighting

## Overview

This feature extends the VS Code CriticMarkup extension to render CriticMarkup syntax with visual styling in the Markdown Preview pane. The implementation uses VS Code's Markdown Preview extensibility API to register a markdown-it plugin that parses CriticMarkup syntax and transforms it into styled HTML elements.

The solution consists of three main components:
1. A markdown-it plugin that parses CriticMarkup patterns and generates HTML with CSS classes
2. A CSS stylesheet that defines visual styling for CriticMarkup elements
3. Extension activation code that registers the plugin and stylesheet with VS Code's Markdown Preview

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Extension Activation (extension.ts)        │ │
│  │  - Returns markdown.markdownItPlugins contribution │ │
│  │  - Returns markdown.previewStyles contribution     │ │
│  └────────────────┬───────────────────────────────────┘ │
│                   │                                      │
│  ┌────────────────▼───────────────────────────────────┐ │
│  │    Markdown-it Plugin (criticmarkup-plugin.ts)     │ │
│  │  - Parses CriticMarkup patterns                    │ │
│  │  - Generates HTML with CSS classes                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │      Preview Stylesheet (criticmarkup.css)         │ │
│  │  - Defines visual styling for CriticMarkup         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              VS Code Markdown Preview                    │
│  - Applies markdown-it plugin during rendering          │
│  - Injects CSS stylesheet into preview                  │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. User opens a Markdown file with CriticMarkup syntax
2. User opens the Markdown Preview
3. VS Code's Markdown Preview engine loads registered plugins
4. The CriticMarkup plugin processes the document:
   - Scans for CriticMarkup patterns using regex
   - Replaces patterns with HTML elements containing CSS classes
   - Preserves nested Markdown for further processing
5. Standard markdown-it processing continues on the transformed content
6. The preview stylesheet is injected, applying visual styling
7. The rendered HTML is displayed in the preview pane

## Components and Interfaces

### 1. Markdown-it Plugin (`src/preview/criticmarkup-plugin.ts`)

The plugin implements the markdown-it plugin interface and processes CriticMarkup syntax.

```typescript
import MarkdownIt from 'markdown-it';

interface CriticMarkupPattern {
  name: string;
  regex: RegExp;
  cssClass: string;
  htmlTag: string;
}

export function criticmarkupPlugin(md: MarkdownIt): void {
  // Plugin implementation
}
```

**Key Functions:**

- `criticmarkupPlugin(md: MarkdownIt)`: Main plugin function that registers the rule with markdown-it
- `parseCriticMarkup(state: StateInline, silent: boolean)`: Inline rule that detects and transforms CriticMarkup patterns
- `renderCriticMarkup(tokens: Token[], idx: number, options: any, env: any, self: Renderer)`: Renders CriticMarkup tokens as HTML

**Pattern Definitions:**

```typescript
const patterns: CriticMarkupPattern[] = [
  { name: 'addition', regex: /\{\+\+(.+?)\+\+\}/gs, cssClass: 'criticmarkup-addition', htmlTag: 'ins' },
  { name: 'deletion', regex: /\{--(.+?)--\}/gs, cssClass: 'criticmarkup-deletion', htmlTag: 'del' },
  { name: 'substitution', regex: /\{~~(.+?)~>(.+?)~~\}/gs, cssClass: 'criticmarkup-substitution', htmlTag: 'span' },
  { name: 'comment', regex: /\{>>(.+?)<<\}/gs, cssClass: 'criticmarkup-comment', htmlTag: 'span' },
  { name: 'highlight', regex: /\{==(.+?)==\}/gs, cssClass: 'criticmarkup-highlight', htmlTag: 'mark' }
];
```

### 2. Preview Stylesheet (`media/criticmarkup.css`)

CSS file that defines visual styling for CriticMarkup elements in the preview.

```css
.criticmarkup-addition {
  color: #00bb00;
  background-color: rgba(0, 187, 0, 0.1);
}

.criticmarkup-deletion {
  color: #dd0000;
  background-color: rgba(221, 0, 0, 0.1);
  text-decoration: line-through;
}

.criticmarkup-substitution {
  color: #ff8600;
  background-color: rgba(255, 134, 0, 0.1);
}

.criticmarkup-comment {
  color: #0000bb;
  background-color: rgba(0, 0, 187, 0.1);
  font-style: italic;
}

.criticmarkup-highlight {
  color: #aa53a9;
  background-color: rgba(170, 83, 169, 0.2);
}
```

### 3. Extension Activation Updates (`src/extension.ts`)

The extension's `activate` function will be updated to return the markdown-it plugin and stylesheet contributions.

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Existing command registrations...
  
  return {
    extendMarkdownIt(md: any) {
      return md.use(criticmarkupPlugin);
    }
  };
}
```

The `package.json` will be updated to declare the preview stylesheet:

```json
{
  "contributes": {
    "markdown.previewStyles": [
      "./media/criticmarkup.css"
    ]
  }
}
```

## Data Models

### CriticMarkup Pattern Model

```typescript
interface CriticMarkupPattern {
  name: string;           // Pattern identifier (e.g., 'addition', 'deletion')
  regex: RegExp;          // Regular expression to match the pattern
  cssClass: string;       // CSS class to apply to rendered HTML
  htmlTag: string;        // HTML tag to use for wrapping content
}
```

### Substitution Model

Substitutions require special handling as they contain two parts (old and new text):

```typescript
interface SubstitutionParts {
  oldText: string;        // Text to be replaced
  newText: string;        // Replacement text
}
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria, several properties can be consolidated to avoid redundancy. The following properties capture the essential correctness requirements:

### Property 1: CriticMarkup pattern transformation

*For any* CriticMarkup pattern type (addition, deletion, substitution, comment, highlight) and any text content, when the markdown-it plugin processes the markup, the output HTML should contain an element with the corresponding CSS class.

**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

### Property 2: Multiple instance consistency

*For any* CriticMarkup pattern type and any number of instances in a document, when the plugin processes the document, each instance should be rendered with the same HTML structure and CSS class.

**Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2**

### Property 3: Multiline content preservation

*For any* CriticMarkup pattern type and any text content containing line breaks, when the plugin processes the markup, the output HTML should preserve all line breaks within the styled element.

**Validates: Requirements 1.3, 2.3, 3.3, 4.3, 5.3**

### Property 4: Nested Markdown rendering

*For any* CriticMarkup pattern type and any text content containing Markdown syntax (bold, italic, links, etc.), when the plugin processes the markup, the output HTML should contain both the CriticMarkup styling and the rendered Markdown formatting.

**Validates: Requirements 1.4, 2.4, 3.4, 4.4, 5.4, 8.1**

### Property 5: Substitution dual rendering

*For any* old text and new text in a substitution pattern `{~~old~>new~~}`, when the plugin processes the substitution, the output HTML should contain both the old text with deletion styling and the new text with addition styling.

**Validates: Requirements 3.1**

### Property 6: List structure preservation

*For any* Markdown list (ordered or unordered) containing CriticMarkup in list items, when the plugin processes the document, the output HTML should preserve the list structure and apply CriticMarkup styling to the marked content.

**Validates: Requirements 8.2**

## Error Handling

### Invalid or Malformed Markup

The plugin should handle malformed CriticMarkup gracefully:

- **Unclosed patterns**: If a CriticMarkup pattern is not properly closed (e.g., `{++text` without `++}`), the plugin should treat it as literal text and not attempt transformation
- **Nested same-type patterns**: If the same pattern type is nested (e.g., `{++outer {++inner++} outer++}`), the plugin should process the outermost pattern first
- **Empty patterns**: Empty CriticMarkup patterns (e.g., `{++++}`) should be rendered as empty styled elements

### Edge Cases

- **Code blocks and inline code**: CriticMarkup syntax within Markdown code blocks (` ``` `) and inline code (`` ` ``) should be treated as literal text and not processed. This is handled by markdown-it's parsing order, which processes code blocks before inline rules.
- **Escaped characters**: If CriticMarkup delimiters are escaped in Markdown, they should be treated as literal text
- **Very long content**: The plugin should handle CriticMarkup patterns containing large amounts of text without performance degradation

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

- **Pattern matching**: Test that each CriticMarkup pattern regex correctly matches valid syntax
- **HTML generation**: Test that the plugin generates correct HTML structure for each pattern type
- **CSS class application**: Test that the correct CSS classes are applied to generated HTML
- **Edge cases**: Test handling of empty patterns, unclosed patterns, and escaped delimiters
- **Code block exclusion**: Test that CriticMarkup in code blocks is not processed

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs using the **fast-check** library (already in devDependencies):

- Each property-based test should run a minimum of 100 iterations
- Each test must be tagged with a comment referencing the correctness property from this design document
- Tag format: `// Feature: markdown-preview-highlighting, Property {number}: {property_text}`
- Tests will generate random text content, CriticMarkup patterns, and Markdown syntax combinations
- Generators should be smart about creating valid CriticMarkup syntax and avoiding patterns that would be excluded (e.g., inside code blocks)

**Test Organization:**

- Property tests: `src/preview/criticmarkup-plugin.test.ts`
- Unit tests: `src/preview/criticmarkup-plugin.test.ts` (same file, different test suites)

### Integration Testing

Integration tests will verify the plugin works correctly with VS Code's Markdown Preview:

- Test that the plugin is correctly registered with markdown-it
- Test that the CSS stylesheet is loaded in the preview
- Test end-to-end rendering of a Markdown document with CriticMarkup

## Implementation Notes

### Markdown-it Plugin Architecture

The plugin will use markdown-it's inline rule system:

1. Register an inline rule that runs before standard Markdown processing
2. The rule scans for CriticMarkup patterns using regex
3. When a pattern is found, create custom tokens for the CriticMarkup content
4. Register a renderer for the custom tokens that generates HTML with CSS classes

### Pattern Processing Order

To handle nested Markdown correctly, the plugin must:

1. Parse CriticMarkup patterns first, creating tokens
2. Allow markdown-it to process the content inside CriticMarkup tokens
3. Render the final HTML with both CriticMarkup styling and Markdown formatting

### CSS Styling Approach

The CSS will use:

- Color values matching the editor syntax highlighting defaults
- Semi-transparent background colors for better readability
- Appropriate text decorations (strikethrough for deletions, etc.)
- Sufficient contrast for accessibility

### Performance Considerations

- Use efficient regex patterns that avoid catastrophic backtracking
- Process patterns in a single pass where possible
- Avoid unnecessary string allocations during transformation

## Dependencies

- **markdown-it**: The Markdown parser used by VS Code (provided by VS Code)
- **@types/markdown-it**: TypeScript type definitions (dev dependency)
- **fast-check**: Property-based testing library (already in devDependencies)

## Future Enhancements

Potential future improvements not included in this initial implementation:

- Configuration option to customize preview colors independently from editor colors
- Toggle to show/hide CriticMarkup in preview (accept/reject mode)
- Preview-specific rendering modes (e.g., "final" mode showing only accepted changes)
- Support for CriticMarkup metadata attributes
