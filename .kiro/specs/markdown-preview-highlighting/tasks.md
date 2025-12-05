# Implementation Plan

- [x] 1. Set up preview infrastructure
  - Create `src/preview` directory for preview-related code
  - Create `media` directory for CSS assets
  - Add `@types/markdown-it` to devDependencies
  - _Requirements: 7.1_

- [ ] $$2. Implement markdown-it plugin for CriticMarkup parsing
  - [x] 2.1 Create plugin file structure and basic markdown-it plugin skeleton
    - Create `src/preview/criticmarkup-plugin.ts`
    - Define CriticMarkupPattern interface
    - Define pattern configurations for all five CriticMarkup types
    - Export main plugin function that accepts MarkdownIt instance
    - _Requirements: 7.1, 7.3_

  - [x] 2.2 Implement pattern matching and token generation
    - Implement inline rule function that scans for CriticMarkup patterns
    - Create custom tokens for each CriticMarkup type
    - Handle pattern precedence and nesting
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 2.3 Implement HTML rendering for CriticMarkup tokens
    - Create renderer functions for each CriticMarkup token type
    - Generate HTML with appropriate tags and CSS classes
    - Handle substitution special case (old and new text)
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 2.4 Write property test for pattern transformation
    - **Property 1: CriticMarkup pattern transformation**
    - **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

  - [x] 2.5 Write property test for multiple instance consistency
    - **Property 2: Multiple instance consistency**
    - **Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2**

- [ ] 3. Implement multiline and nested Markdown support
  - [x] 3.1 Add multiline content handling to plugin
    - Ensure regex patterns support multiline matching
    - Preserve line breaks in token content
    - Test with content containing `\n` characters
    - _Requirements: 1.3, 2.3, 3.3, 4.3, 5.3_

  - [x] 3.2 Write property test for multiline content preservation
    - **Property 3: Multiline content preservation**
    - **Validates: Requirements 1.3, 2.3, 3.3, 4.3, 5.3**

  - [x] 3.3 Ensure nested Markdown is processed correctly
    - Configure plugin to allow markdown-it to process content inside CriticMarkup
    - Test with bold, italic, links, and other Markdown syntax
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4, 8.1_

  - [x] 3.4 Write property test for nested Markdown rendering
    - **Property 4: Nested Markdown rendering**
    - **Validates: Requirements 1.4, 2.4, 3.4, 4.4, 5.4, 8.1**

- [x] 4. Implement substitution dual rendering
  - [x] 4.1 Add special handling for substitution patterns
    - Parse substitution into old and new parts
    - Generate HTML with both deletion and addition styling
    - _Requirements: 3.1_

  - [x] 4.2 Write property test for substitution dual rendering
    - **Property 5: Substitution dual rendering**
    - **Validates: Requirements 3.1**

- [x] 5. Handle edge cases and error conditions
  - [x] 5.1 Implement handling for malformed patterns
    - Handle unclosed patterns (treat as literal text)
    - Handle empty patterns (render as empty styled elements)
    - Handle nested same-type patterns
    - _Requirements: 8.3, 8.4_

  - [x] 5.2 Write unit tests for edge cases
    - Test unclosed patterns
    - Test empty patterns
    - Test CriticMarkup in code blocks (should not be processed)
    - Test CriticMarkup in inline code (should not be processed)
    - _Requirements: 8.3, 8.4_

- [x] 6. Create preview stylesheet
  - [x] 6.1 Create CSS file with CriticMarkup styling
    - Create `media/criticmarkup.css`
    - Define styles for all five CriticMarkup types
    - Use colors matching editor defaults (green, red, orange, blue, purple)
    - Add semi-transparent backgrounds for readability
    - _Requirements: 6.1, 6.3_

  - [x] 6.2 Write unit test for default colors
    - Verify CSS contains expected color values
    - _Requirements: 6.3_

- [x] 7. Integrate plugin with VS Code extension
  - [x] 7.1 Update extension activation to register plugin
    - Modify `src/extension.ts` to return `extendMarkdownIt` function
    - Import and use the CriticMarkup plugin
    - _Requirements: 7.1_

  - [x] 7.2 Update package.json to declare preview stylesheet
    - Add `markdown.previewStyles` contribution pointing to CSS file
    - _Requirements: 7.1_

  - [x] 7.3 Write integration test for plugin registration
    - Verify plugin is correctly registered with markdown-it
    - Verify stylesheet is declared in package.json
    - _Requirements: 7.1_

- [x] 8. Test list structure preservation
  - [x] 8.1 Test CriticMarkup in Markdown lists
    - Create test cases with CriticMarkup in ordered lists
    - Create test cases with CriticMarkup in unordered lists
    - Verify list structure is preserved
    - _Requirements: 8.2_

  - [x] 8.2 Write property test for list structure preservation
    - **Property 6: List structure preservation**
    - **Validates: Requirements 8.2**

- [x] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise
