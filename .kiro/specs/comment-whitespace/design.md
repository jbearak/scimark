# Comment Whitespace Association Bugfix Design

## Overview

CriticMarkup comments (`{>>comment<<}`) fail to associate with a preceding CriticMarkup element when whitespace separates them (e.g., `{==text==} {>>comment<<}`). The `associateCommentsRule` Pass 3 in `src/preview/manuscript-markdown-plugin.ts` checks only the immediately preceding token in the rebuilt `newChildren` array for a CriticMarkup close type. When whitespace exists between the element and comment, markdown-it's inline parser produces a `text` token containing the space, which becomes the immediate predecessor. The fix will look back past whitespace-only text tokens to find the CriticMarkup close token.

## Glossary

- **Bug_Condition (C)**: A CriticMarkup comment token is preceded by a whitespace-only text token that itself is preceded by a CriticMarkup close token in the `newChildren` array
- **Property (P)**: The comment text is associated with the preceding element via `data-comment` on its open token, identical to the no-whitespace case
- **Preservation**: All existing behavior for directly-adjacent comments, standalone comments, ID-based comments, empty comments, non-whitespace-separated comments, and mouse/keyboard interactions must remain unchanged
- **associateCommentsRule**: The core rule in `manuscript-markdown-plugin.ts` that post-processes inline tokens to associate comment tokens with annotated elements
- **isCriticMarkupClose**: Helper that checks if a token type is a CriticMarkup or format highlight close token
- **newChildren**: The rebuilt token array in Pass 3 where tokens are accumulated and comments are processed

## Bug Details

### Fault Condition

The bug manifests when a CriticMarkup comment `{>>comment<<}` follows a CriticMarkup element with one or more whitespace characters between them. The `associateCommentsRule` Pass 3 only checks `newChildren[newChildren.length - 1]` for a CriticMarkup close type. When whitespace separates the two, a `text` token containing the whitespace is the immediate predecessor, causing the adjacency check to fail.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { newChildren: Token[], commentToken: Token }
  OUTPUT: boolean

  LET lastToken = newChildren[newChildren.length - 1]
  LET hasWhitespaceBeforeComment = lastToken != null
        AND lastToken.type == 'text'
        AND lastToken.content matches /^\s+$/

  IF NOT hasWhitespaceBeforeComment THEN RETURN false

  LET tokenBeforeWhitespace = findLastNonWhitespaceToken(newChildren)
  RETURN tokenBeforeWhitespace != null
         AND isCriticMarkupClose(tokenBeforeWhitespace.type)
         AND commentToken.meta.commentText.length > 0
         AND commentToken.meta.id == undefined
END FUNCTION
```

### Examples

- `{==highlighted text==} {>>this is a comment<<}` — Expected: comment associates with highlight. Actual: comment renders as standalone indicator.
- `{++added text++}  {>>reviewer note<<}` — Expected: comment associates with addition (multiple spaces). Actual: standalone indicator.
- `{--deleted text--}\t{>>why deleted<<}` — Expected: comment associates with deletion (tab). Actual: standalone indicator.
- `{~~old~>new~~} {>>substitution note<<}` — Expected: comment associates with substitution. Actual: standalone indicator.
- `==format highlight== {>>format comment<<}` — Expected: comment associates with format highlight. Actual: standalone indicator.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Direct adjacency association: `{==text==}{>>comment<<}` must continue to work exactly as before
- Standalone comments with no preceding element must continue to render as indicators
- Non-whitespace text between element and comment (e.g., `{==text==}some text{>>comment<<}`) must continue to produce a standalone indicator
- ID-based comments (`{#id>>comment<<}`) must continue to be handled by Pass 2
- Empty comments (`{>><<}`) must continue to be removed silently
- Multiple comments on the same element must continue to concatenate with newline separators
- Range marker association must remain unchanged
- All rendering of CriticMarkup elements (additions, deletions, substitutions, highlights) must remain unchanged

**Scope:**
All inputs where the comment is NOT separated from a preceding CriticMarkup element by whitespace-only text should be completely unaffected by this fix. This includes:
- Directly adjacent comments (no whitespace)
- Comments separated by non-whitespace content
- Standalone comments with no preceding element
- ID-based and range-based comments
- All non-comment CriticMarkup processing

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Single-token lookback in Pass 3**: The adjacency check at line `const prevToken = newChildren.length > 0 ? newChildren[newChildren.length - 1] : null;` only examines the immediately preceding token. It does not account for intervening whitespace-only text tokens that markdown-it's inline parser creates when spaces/tabs exist between the CriticMarkup element close and the comment open.

2. **No whitespace-skipping logic**: There is no mechanism to look back past whitespace-only text tokens to find the actual preceding semantic token. The fix requires scanning backwards through `newChildren` to skip tokens whose type is `text` and whose content is purely whitespace (`/^\s+$/`).

3. **Token stream structure**: When markdown-it parses `{==text==} {>>comment<<}`, it produces tokens: `[highlight_open, text("text"), highlight_close, text(" "), comment_open, text("comment"), comment_close]`. The `text(" ")` token is the blocker.

## Correctness Properties

Property 1: Fault Condition - Whitespace-Separated Comment Association

_For any_ inline token sequence where a non-empty, non-ID CriticMarkup comment token is preceded in `newChildren` by one or more whitespace-only text tokens, and those whitespace tokens are preceded by a CriticMarkup close token, the fixed `associateCommentsRule` SHALL associate the comment with the preceding element by setting `data-comment` on its matching open token, and the whitespace-only text tokens SHALL be preserved in the output.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Whitespace-Separated Behavior

_For any_ inline token sequence where a CriticMarkup comment is either directly adjacent to a CriticMarkup close token (no whitespace), separated by non-whitespace text, standalone with no preceding element, ID-based, or empty, the fixed `associateCommentsRule` SHALL produce exactly the same result as the original function, preserving all existing association and rendering behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/preview/manuscript-markdown-plugin.ts`

**Function**: `associateCommentsRule` — Pass 3 comment association logic

**Specific Changes**:
1. **Add whitespace-skipping lookback**: Before the `isCriticMarkupClose` check, scan backwards through `newChildren` to skip whitespace-only text tokens (tokens where `type === 'text'` and `content` matches `/^\s+$/`). Find the first non-whitespace token.

2. **Modify adjacency check**: Replace the single `prevToken` check with a lookback that finds the last semantically meaningful token:
   - Start from `newChildren.length - 1`
   - Skip any tokens where `type === 'text'` and `content.trim() === ''`
   - Use the first non-whitespace token as the candidate for `isCriticMarkupClose`

3. **Preserve whitespace tokens**: The whitespace text tokens must remain in `newChildren` — they should not be removed. Only the association logic changes; the whitespace is still rendered.

4. **Use correct index for findMatchingOpenIdx**: When calling `findMatchingOpenIdx`, pass the index of the CriticMarkup close token found by the lookback (not `newChildren.length - 1`, which may point to a whitespace text token).

5. **No changes to other passes**: Pass 1 (ID map building) and Pass 2 (range marker transformation) are unaffected.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render CriticMarkup with whitespace-separated comments through the markdown-it plugin and assert that `data-comment` appears on the element's open tag. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Single space separation**: `{==text==} {>>comment<<}` — assert `data-comment` on `<mark>` (will fail on unfixed code)
2. **Multiple spaces**: `{++added++}  {>>note<<}` — assert `data-comment` on `<ins>` (will fail on unfixed code)
3. **Tab separation**: `{--deleted--}\t{>>why<<}` — assert `data-comment` on `<del>` (will fail on unfixed code)
4. **All element types**: Test whitespace separation with substitution and format highlight (will fail on unfixed code)

**Expected Counterexamples**:
- `data-comment` attribute is absent from the element's open tag
- Comment renders as a standalone `<span class="manuscript-markdown-comment-indicator">` instead
- Root cause confirmed: whitespace text token breaks the single-token lookback

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := associateCommentsRule_fixed(input)
  ASSERT result.elementOpenToken.attrGet('data-comment') == commentText
  ASSERT result.whitespaceTokensPreserved == true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT associateCommentsRule_original(input) = associateCommentsRule_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for directly-adjacent comments, standalone comments, and non-comment inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Direct adjacency preservation**: Verify `{==text==}{>>comment<<}` continues to associate correctly after fix
2. **Standalone comment preservation**: Verify comments with no preceding element continue to render as indicators
3. **Non-whitespace separation preservation**: Verify `{==text==}words{>>comment<<}` continues to produce standalone indicator
4. **Empty comment preservation**: Verify `{>><<}` continues to be removed silently
5. **Multiple comment concatenation**: Verify `{==text==}{>>a<<}{>>b<<}` continues to concatenate with newline

### Unit Tests

- Test whitespace-separated comment association for each CriticMarkup element type (highlight, addition, deletion, substitution, format highlight)
- Test multiple whitespace characters (single space, multiple spaces, tab, mixed)
- Test edge cases: whitespace-only text before first element, comment at start of line
- Test that directly-adjacent comments still work

### Property-Based Tests

- Generate random CriticMarkup element types with random whitespace strings (spaces/tabs, 1-5 chars) and verify comment association
- Generate random non-buggy inputs (direct adjacency, non-whitespace separation, standalone) and verify output matches original function
- Generate random sequences of elements and comments with mixed whitespace/no-whitespace and verify correct association for each

### Integration Tests

- Test full markdown rendering pipeline with whitespace-separated comments across paragraph boundaries
- Test mixed scenarios: some comments directly adjacent, some whitespace-separated, some standalone
- Test that HTML output contains correct `data-comment` attributes and whitespace is preserved in rendered output
