# Implementation Plan

- [x] 1. Add submenu buttons to editor toolbar
  - [x] 1.1 Add Markdown Formatting submenu to editor/title menu
    - Update `package.json` to add `markdown.formatting` submenu entry to `editor/title` array
    - Set `when` clause to `editorLangId == markdown && !isInDiffEditor`
    - Set `group` to `navigation@1` for first position
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.2_
  
  - [x] 1.2 Add Markdown Annotations submenu to editor/title menu
    - Update `package.json` to add `markdown.annotations` submenu entry to `editor/title` array
    - Set `when` clause to `editorLangId == markdown && !isInDiffEditor`
    - Set `group` to `navigation@2` for second position
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2_
  
  - [x] 1.3 Update existing navigation button ordering
    - Modify `scimark.prevChange` entry to use `group: "navigation@3"`
    - Modify `scimark.nextChange` entry to use `group: "navigation@4"`
    - Ensures correct button order: Formatting, Annotations, Previous, Next
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Write property-based tests for configuration validation
  - [x] 2.1 Write property test for toolbar button visibility configuration
    - **Property 1: Toolbar button visibility configuration**
    - **Validates: Requirements 1.1, 1.3, 1.4, 2.1, 2.3, 2.4**
    - Parse package.json and verify all Scientific Markdown toolbar entries have correct `when` clause
    - Test should validate: `editorLangId == markdown && !isInDiffEditor`
    - Run minimum 100 iterations
  
  - [x] 2.2 Write property test for button grouping and ordering
    - **Property 2: Button grouping and ordering**
    - **Validates: Requirements 3.1, 3.2**
    - Parse package.json and verify all four buttons are in `navigation` group
    - Verify ordering suffixes: @1 (formatting), @2 (annotations), @3 (prevChange), @4 (nextChange)
    - Run minimum 100 iterations

- [ ] 3. Manual verification checkpoint
  - Open a markdown file and verify all four buttons appear in correct order
  - Verify buttons are hidden in non-markdown files
  - Verify buttons are hidden in diff editor mode
  - Click each submenu button and verify dropdown menus appear
  - Ensure all tests pass, ask the user if questions arise
