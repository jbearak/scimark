# BibTeX Double-Brace Export Bugfix Design

## Overview

When a BibTeX field is wrapped in double braces (e.g. `title = {{My Title}}`), the parser
captures the outer braces as the delimiter and returns the inner content verbatim — including
the inner brace pair. The fix is a single post-processing step inside `parseBibtex`: after
extracting `braceValue` from the regex match, detect whether the entire value is itself
wrapped in a matching `{...}` pair and, if so, strip that inner pair.

## Glossary

- **Bug_Condition (C)**: The parsed field value starts with `{` and ends with `}` where those
  braces form a single matched pair wrapping the entire value (i.e. the value is double-braced).
- **Property (P)**: The stored field value equals the content between the inner braces, with no
  leading or trailing literal brace characters introduced by the double-brace convention.
- **Preservation**: All parsing behaviour for single-braced, quote-delimited, LaTeX-escaped, and
  partially-braced fields must remain identical to the current implementation.
- **parseBibtex**: The function in `src/bibtex-parser.ts` that reads a `.bib` string and returns
  a `Map<string, BibtexEntry>`.
- **unescapeBibtex**: Helper that converts LaTeX escape sequences to Unicode characters.
- **braceValue**: The capture group in `fieldRegex` that holds the content between the outer
  `{...}` delimiters of a brace-delimited field.

## Bug Details

### Fault Condition

The bug manifests when a BibTeX field value is enclosed in a second pair of braces inside the
outer delimiter pair. The `fieldRegex` in `parseBibtex` strips only the outermost `{...}`,
leaving the inner `{...}` intact in `braceValue`. The subsequent `unescapeBibtex` call does not
remove bare brace pairs, so the stored value retains the inner braces.

**Formal Specification:**
```
FUNCTION isBugCondition(rawBraceValue)
  INPUT: rawBraceValue — the string captured by the brace group in fieldRegex
         (i.e. the content between the outer { } delimiters)
  OUTPUT: boolean

  IF rawBraceValue starts with '{' AND rawBraceValue ends with '}'
    AND the opening '{' at index 0 is matched by the closing '}' at the last index
    (i.e. they form a single top-level brace pair wrapping the entire value)
  THEN RETURN true
  ELSE RETURN false
END FUNCTION
```

### Examples

- `title = {{My Title}}` → currently stored as `{My Title}`, should be `My Title`
- `author = {{World Health Organization}}` → currently stored as `{World Health Organization}`,
  should be `World Health Organization`
- `title = {{Über die Natur}}` → currently stored as `{Über die Natur}`, should be `Über die Natur`
- `title = {The {RNA} Paradox}` → stored as `The {RNA} Paradox` (NOT a bug condition — inner
  braces do not wrap the entire value)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single-braced fields (`title = {My Title}`) continue to store `My Title`
- Quote-delimited fields (`title = "My Title"`) continue to store `My Title`
- LaTeX-escaped characters (`title = {Caf\'{e}}`) continue to be unescaped to `Café`
- Partial inner brace groups (`title = {The {RNA} Paradox}`) continue to store `The {RNA} Paradox`
- Serialization continues to wrap field values in single outer braces

**Scope:**
All field values where `isBugCondition` returns false must be completely unaffected by this fix.
This includes:
- Any value whose first character is not `{`
- Any value whose last character is not `}`
- Any value where the leading `{` is not matched by the trailing `}` (i.e. inner braces are partial)

## Hypothesized Root Cause

The `fieldRegex` in `parseBibtex` uses a capturing group that matches the content *between* the
outer `{...}` delimiters:

```
/(\w+(?:-\w+)*)\s*=\s*(?:\{((?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})*)\}|...)/g
```

For `title = {{My Title}}`, the outer `{` and `}` are consumed as delimiters, and `braceValue`
captures `{My Title}` — the inner braces are treated as ordinary content. `unescapeBibtex` only
handles `\X` sequences and does not strip bare brace pairs, so the inner braces survive into the
stored value.

There is no post-processing step that recognises the double-brace convention and strips the inner
wrapping pair.

## Correctness Properties

Property 1: Fault Condition - Double-Braced Field Value Is Stripped

_For any_ BibTeX field where the parsed `braceValue` is itself entirely wrapped in a single
matching `{...}` pair (isBugCondition returns true), the fixed `parseBibtex` function SHALL
store the field value as the content between those inner braces, with no leading or trailing
brace characters.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Double-Braced Fields Are Unchanged

_For any_ BibTeX field where the parsed `braceValue` is NOT entirely wrapped in a single
matching `{...}` pair (isBugCondition returns false), the fixed `parseBibtex` function SHALL
produce exactly the same stored value as the original function, preserving all existing
single-brace, quote-delimited, LaTeX-escape, and partial-inner-brace behaviour.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `src/bibtex-parser.ts`

**Function**: `parseBibtex` — inside the `while ((fieldMatch = fieldRegex.exec(fieldsStr)))`
loop, after the line that assembles `value`.

**Specific Changes**:

1. **Add a `stripOuterBraces` helper** (pure function, easy to unit-test):
   ```
   FUNCTION stripOuterBraces(s)
     IF s.length >= 2
        AND s[0] === '{'
        AND s[s.length - 1] === '}'
        AND the '{' at index 0 is matched by the '}' at the last index
     THEN RETURN s.slice(1, -1)
     ELSE RETURN s
   END FUNCTION
   ```
   "Matched" means: scanning left-to-right with a depth counter starting at 1, the counter
   first reaches 0 at the last character. This correctly handles `{The {RNA} Paradox}` (depth
   reaches 0 before the last `}`) vs `{{My Title}}` (depth reaches 0 exactly at the last `}`).

2. **Apply `stripOuterBraces` to `braceValue` only** — before passing to `unescapeBibtex`:
   ```
   const value = (braceValue !== undefined
     ? unescapeBibtex(stripOuterBraces(braceValue))
     : unescapeBibtex(quoteValue ?? bareValue ?? ''));
   ```
   Quote-delimited and bare values are unaffected.

3. **No changes to `serializeBibtex`** — it already wraps values in single outer braces, which
   is correct after the fix.

## Testing Strategy

### Validation Approach

Two-phase: first run exploratory tests against the unfixed code to confirm the bug and root
cause; then run fix-checking and preservation tests against the fixed code.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples on unfixed code to confirm the root cause.

**Test Plan**: Parse BibTeX strings containing double-braced fields and assert the stored value
equals the plain string. These assertions will fail on unfixed code, confirming the bug.

**Test Cases**:
1. **Simple title**: Parse `@article{k, title = {{My Title}}}` — assert `fields.get('title') === 'My Title'` (fails on unfixed code)
2. **Institutional author**: Parse `@article{k, author = {{World Health Organization}}}` — assert stored value is `World Health Organization` (fails on unfixed code)
3. **Unicode content**: Parse `@article{k, title = {{Über die Natur}}}` — assert stored value is `Über die Natur` (fails on unfixed code)
4. **Nested partial braces**: Parse `@article{k, title = {The {RNA} Paradox}}` — assert stored value is `The {RNA} Paradox` (should pass on unfixed code — not a bug condition)

**Expected Counterexamples**:
- `fields.get('title')` returns `{My Title}` instead of `My Title`
- Confirms: `braceValue` retains the inner brace pair after regex capture

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces
the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input.braceValue) DO
  result := parseBibtex_fixed(input.bibtexString)
  ASSERT result.fields.get(input.fieldName) does NOT start with '{'
         OR the leading '{' is a partial inner group (not wrapping the whole value)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function
produces the same stored value as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input.braceValue) DO
  ASSERT parseBibtex_original(input) = parseBibtex_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing with fast-check is recommended because:
- It generates many random field values automatically
- It catches edge cases (empty strings, strings starting/ending with `{`, deeply nested braces)
- It provides strong guarantees across the full non-buggy input domain

**Test Cases**:
1. **Single-brace preservation**: For any string S not starting with `{`, parsing `field = {S}` yields S unchanged
2. **Quote-delimiter preservation**: For any string S, parsing `field = "S"` yields S unchanged
3. **Partial inner brace preservation**: Parsing `title = {The {RNA} Paradox}` still yields `The {RNA} Paradox`
4. **Serialization round-trip**: Serialize then re-parse a fixed entry; field values are stable

### Unit Tests

- Parse `{{My Title}}` → `My Title`
- Parse `{{World Health Organization}}` → `World Health Organization`
- Parse `{My Title}` → `My Title` (single-brace, unchanged)
- Parse `"My Title"` → `My Title` (quote-delimited, unchanged)
- Parse `{The {RNA} Paradox}` → `The {RNA} Paradox` (partial inner brace, unchanged)
- Parse `{Caf\'{e}}` → `Café` (LaTeX escape, unchanged)
- `stripOuterBraces('{}')` → `''` (empty double-brace)
- `stripOuterBraces('{a}')` → `a`
- `stripOuterBraces('{a}{b}')` → `{a}{b}` (two separate groups, not a single wrapping pair)

### Property-Based Tests

- For any arbitrary string S (fast-check `fc.string()`), `stripOuterBraces('{' + S + '}')` equals S when S contains no unmatched braces that would cause the outer pair to close early
- For any string S where `isBugCondition` is false, `parseBibtex_fixed` and `parseBibtex_original` return identical field values
- For any string S, applying `stripOuterBraces` twice equals applying it once (idempotent after one application when the result has no outer braces)

### Integration Tests

- Full `.bib` file with mixed single- and double-braced fields parses correctly end-to-end
- Serialization of a parsed entry with a previously double-braced field produces single-braced output (no double braces in output)
- A `.bib` file round-trip (parse → serialize → parse) yields stable field values
