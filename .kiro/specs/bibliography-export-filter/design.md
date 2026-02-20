# Bibliography Export Filter Bugfix Design

## Overview

When exporting markdown to Word (.docx), the bibliography includes every entry from the `.bib` file instead of only the entries actually cited in the document. The root cause is in `buildEngine()` in `src/md-to-docx-citations.ts`, which calls `engine.updateItems([...items.keys()])` — registering all parsed BibTeX entries with citeproc regardless of whether they appear in the markdown. The fix is to accept a set of cited keys and pass only those to `updateItems()`, while still making all entries available to `retrieveItem()` for resolution.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when the set of cited keys in the markdown is a strict subset of (or empty relative to) the `.bib` file entries, causing uncited entries to appear in the bibliography
- **Property (P)**: The desired behavior — `makeBibliography()` returns only entries whose keys were actually cited in the markdown document
- **Preservation**: Existing citation rendering, field code generation, locator handling, missing-key warnings, and CSL style/locale formatting must remain unchanged
- **buildEngine()**: The function in `src/md-to-docx-citations.ts` that constructs a `CSL.Engine`, builds the item map, and registers items via `updateItems()`
- **updateItems()**: citeproc API that registers item IDs with the engine; `makeBibliography()` outputs entries for all registered IDs

## Bug Details

### Fault Condition

The bug manifests when a markdown document cites fewer entries than exist in the `.bib` file (or cites none at all). The `buildEngine()` function registers every `.bib` entry with `engine.updateItems()`, so `makeBibliography()` includes all of them regardless of what was actually cited.

**Formal Specification:**
```
FUNCTION isBugCondition(bibEntries, citedKeys)
  INPUT: bibEntries of type Map<string, BibtexEntry>, citedKeys of type Set<string>
  OUTPUT: boolean

  allKeys := set of bibEntries.keys()
  RETURN citedKeys is a strict subset of allKeys
         OR citedKeys is empty
END FUNCTION
```

### Examples

- **Subset citation**: `.bib` has 10 entries, markdown cites 2 → bibliography shows all 10 (expected: 2)
- **No citations**: `.bib` has 5 entries, markdown has no `[@key]` references → bibliography shows all 5 (expected: empty/omitted)
- **All cited** (not buggy): `.bib` has 3 entries, markdown cites all 3 → bibliography correctly shows 3
- **Missing key**: markdown cites `[@nonexistent]` not in `.bib` → handled separately by missing-key logic, unaffected

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Inline citation text rendering (`renderCitationText`, `generateCitation`) must continue to produce correct formatted output
- Zotero field codes with `CSL_CITATION` JSON must remain structurally identical
- Missing citation key warnings and plain-text fallback must continue working
- CSL style and locale formatting must remain unchanged
- Locator parsing (page numbers etc.) must remain unchanged
- `retrieveItem()` must still resolve any key from the `.bib` file (citeproc may reference items internally during citation rendering even if they aren't in `updateItems`)

**Scope:**
All inputs where the set of cited keys equals the full set of `.bib` keys should produce identical output. The fix only changes which item IDs are passed to `updateItems()` — it does not change item data construction, style loading, locale handling, or citation rendering.

## Hypothesized Root Cause

Based on the code analysis, the root cause is a single line in `buildEngine()`:

1. **Overbroad `updateItems()` call**: Line `engine.updateItems([...items.keys()])` registers every entry from the parsed `.bib` file. citeproc's `makeBibliography()` then outputs bibliography entries for all registered items. The function has no parameter to specify which subset of items should be registered.

2. **No cited-key filtering in the call chain**: `createCiteprocEngine()`, `createCiteprocEngineLocal()`, and `createCiteprocEngineAsync()` all pass the full `bibEntries` map to `buildEngine()` without any cited-key information. The caller (`convertMdToDocx`) creates the engine before document generation, so cited keys aren't known yet at engine creation time.

3. **Two viable fix strategies**:
   - **Option A (deferred)**: Remove `updateItems()` from `buildEngine()` entirely. After document generation (which collects cited keys), call `engine.updateItems(citedKeys)` before `generateBibliographyXml()`.
   - **Option B (parameter)**: Add a `citedKeys` parameter to `buildEngine()` and its callers, passing only cited keys to `updateItems()`. This requires knowing cited keys before engine creation, which isn't the current flow.

   Option A is simpler and more correct — it separates engine creation from bibliography scoping and doesn't require restructuring the call chain.

## Correctness Properties

Property 1: Fault Condition - Bibliography Contains Only Cited Entries

_For any_ export where the markdown cites a subset of `.bib` entries (isBugCondition returns true), the fixed export SHALL produce a bibliography containing only the cited entries, with no uncited entries present.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Full Citation Behavior Unchanged

_For any_ export where the markdown cites all `.bib` entries (isBugCondition returns false), the fixed export SHALL produce exactly the same bibliography, citation text, field codes, and warnings as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming Option A (deferred `updateItems`):

**File**: `src/md-to-docx-citations.ts`

**Function**: `buildEngine()`

**Specific Changes**:
1. **Remove `updateItems()` from `buildEngine()`**: Delete the line `engine.updateItems([...items.keys()])`. The engine is returned with all items available via `retrieveItem()` but none registered for bibliography output.

**File**: `src/md-to-docx.ts`

**Function**: `generateDocumentXml()` and surrounding code in `convertMdToDocx()`

**Specific Changes**:
2. **Collect cited keys during document generation**: The `DocxGenState` already tracks `citationItemIds` (a Map). After `generateDocumentXml()` returns, the set of actually-cited keys is available from the citation runs processed during generation.

3. **Call `updateItems()` with cited keys before bibliography**: After `generateDocumentXml()` completes and before `generateBibliographyXml()` is called, invoke `engine.updateItems([...citedKeys])` with only the keys that appeared in `[@...]` references. Since `generateBibliographyXml` is called inside `generateDocumentXml`, we need to either move the bibliography call out, or call `updateItems` at the right point inside `generateDocumentXml` just before the bibliography append.

4. **Preferred approach — update inside `generateDocumentXml()`**: Just before the `if (citeprocEngine)` block that calls `generateBibliographyXml()`, insert `citeprocEngine.updateItems([...collectedCitedKeys])`. The cited keys can be collected from `state.citationItemIds.keys()` or by tracking which keys were passed to `generateCitation()` during the token loop.

5. **Track cited keys in state**: Add a `citedKeys: Set<string>` field to `DocxGenState`. In the citation branch of `generateRuns()`, add each key from `run.keys` (that exists in `bibEntries`) to `state.citedKeys`. This gives us the exact set of keys to register.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Create a citeproc engine with multiple `.bib` entries, render citations for a subset, then call `renderBibliography()` and check the entry count. Run on UNFIXED code to observe the bug.

**Test Cases**:
1. **Subset Citation Test**: Create engine with 3 bib entries, cite only 1 → bibliography should have 1 entry (will show 3 on unfixed code)
2. **No Citation Test**: Create engine with 3 bib entries, cite none → bibliography should be empty (will show 3 on unfixed code)
3. **Full Document Export Test**: Export a markdown doc citing 1 of 3 bib entries → bibliography section should contain only 1 entry (will contain 3 on unfixed code)

**Expected Counterexamples**:
- `renderBibliography()` returns entries for all `.bib` items regardless of which were cited
- Root cause confirmed: `updateItems()` called with all keys at engine creation time

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL (bibEntries, citedKeys) WHERE isBugCondition(bibEntries, citedKeys) DO
  engine := buildEngine_fixed(bibEntries, styleXml, locale)
  engine.updateItems([...citedKeys])
  bib := renderBibliography(engine)
  ASSERT bib.entries.length == citedKeys.size
  ASSERT every entry in bib corresponds to a key in citedKeys
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL (bibEntries, citedKeys) WHERE NOT isBugCondition(bibEntries, citedKeys) DO
  ASSERT renderBibliography(engine_original) = renderBibliography(engine_fixed)
  ASSERT renderCitationText(engine_original, keys) = renderCitationText(engine_fixed, keys)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of bib entries and cited-key subsets automatically
- It catches edge cases like single-entry bib files, duplicate citations, and keys with special characters
- It provides strong guarantees that citation rendering is unchanged

**Test Plan**: Observe citation and bibliography behavior on UNFIXED code for full-citation scenarios, then write property-based tests verifying identical output after the fix.

**Test Cases**:
1. **Citation Text Preservation**: Verify `renderCitationText()` output is identical for any set of keys before and after fix
2. **Field Code Preservation**: Verify `generateCitation()` produces identical OOXML field codes
3. **Full-Cite Bibliography Preservation**: When all bib entries are cited, bibliography output is identical before and after fix
4. **Locator Preservation**: Citation locators (page numbers) render identically

### Unit Tests

- Test `buildEngine()` no longer calls `updateItems()` (engine created with zero registered items)
- Test that calling `engine.updateItems(citedKeys)` then `renderBibliography()` returns only cited entries
- Test empty cited-keys set produces empty bibliography
- Test single cited key from multi-entry bib produces single bibliography entry

### Property-Based Tests

- Generate random subsets of bib entries as cited keys; verify bibliography length equals cited-key count
- Generate random bib entries and cite all of them; verify bibliography matches original behavior
- Generate random citation key sets with locators; verify citation text is unchanged by the fix

### Integration Tests

- Full `convertMdToDocx()` with markdown citing 1 of 3 bib entries → verify bibliography section in OOXML contains only 1 entry
- Full export with no citations but bib file present → verify no bibliography entries in output
- Full export with all entries cited → verify identical output to unfixed code
