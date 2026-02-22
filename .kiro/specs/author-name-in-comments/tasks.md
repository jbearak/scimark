# Implementation Plan

- [x] 1. Add configuration settings to package.json
  - Add `scimark.disableAuthorNames` boolean setting with default false
  - Add `scimark.authorNameOverride` string setting with default empty string
  - Add configuration schema under `contributes.configuration`
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Create author name retrieval module
  - Create `src/author.ts` file
  - Implement `getAuthorName()` function that checks settings in priority order
  - Check disable setting first, return null if true
  - Check override setting second, return value if non-empty
  - Query VS Code Git extension API as fallback
  - Ensure all operations are synchronous and fail fast
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.4_

- [x] 2.1 Write property test for override setting precedence
  - **Property 3: Override setting precedence**
  - **Validates: Requirements 2.1**

- [x] 2.2 Write unit tests for author retrieval
  - Test disable setting returns null
  - Test override setting returns override value
  - Test Git API fallback when no settings configured
  - Test settings precedence (disable > override > Git API)
  - Test graceful fallback when Git extension unavailable
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2_

- [x] 3. Update formatting functions to support author names
  - Modify `wrapSelection()` to accept optional `authorName` parameter
  - Update comment insertion logic to include author prefix when name is provided
  - Calculate cursor offset accounting for author prefix length
  - Modify `highlightAndComment()` to accept and use author name
  - Modify `substituteAndComment()` to accept and use author name
  - Modify `additionAndComment()` to accept and use author name
  - Modify `deletionAndComment()` to accept and use author name
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.3_

- [x] 3.1 Write property test for comment format with author name
  - **Property 1: Comment format with author name**
  - **Validates: Requirements 1.2**

- [x] 3.2 Write property test for highlight-and-comment format
  - **Property 2: Highlight-and-comment format with author name**
  - **Validates: Requirements 1.4**

- [x] 3.3 Write property test for special characters preservation
  - **Property 4: Special characters preservation**
  - **Validates: Requirements 3.3**

- [x] 3.4 Write unit tests for formatting edge cases
  - Test comment insertion with null/undefined author name
  - Test highlight-and-comment with empty selection
  - Test cursor positioning with and without author names
  - _Requirements: 1.3, 1.5_

- [x] 4. Update extension command handlers
  - Import author module in `src/extension.ts`
  - Update `scimark.insertComment` handler to retrieve and pass author name
  - Update `scimark.highlightAndComment` handler to retrieve and pass author name
  - Update `scimark.substituteAndComment` handler to retrieve and pass author name
  - Update `scimark.additionAndComment` handler to retrieve and pass author name
  - Update `scimark.deletionAndComment` handler to retrieve and pass author name
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.1 Write unit test for settings changes taking effect immediately
  - Test that modifying settings affects subsequent comment insertions
  - _Requirements: 2.5_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
