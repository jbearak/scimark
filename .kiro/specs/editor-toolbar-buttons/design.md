# Design Document: Editor Toolbar Buttons

## Overview

This feature extends the Manuscript Markdown VS Code extension by adding two new toolbar buttons to the editor title bar: one for Markdown Annotations and one for Markdown Formatting. These buttons will provide quick access to the existing submenu commands that are currently only available via right-click context menu.

The extension already has two toolbar buttons (Previous Change and Next Change) in the editor title bar. This feature adds two more submenu buttons alongside them, bringing the total to four related toolbar buttons.

The implementation leverages VS Code's existing menu contribution system and requires minimal code changes - primarily configuration updates in `package.json` to add the new menu items to the `editor/title` contribution point.

## Current State

The extension currently has:
- Two toolbar buttons already implemented: `manuscript-markdown.prevChange` and `manuscript-markdown.nextChange`
- Two submenus defined: `markdown.annotations` and `markdown.formatting`
- Both submenus are available in the editor context menu (right-click) but not in the toolbar

This feature adds the two submenus to the toolbar alongside the existing navigation buttons.

## Architecture

The solution is purely declarative, using VS Code's menu contribution API:

1. **Menu Contribution**: Add two new submenu entries to the `editor/title` menu in `package.json`
2. **Submenu Integration**: Reference the existing `markdown.annotations` and `markdown.formatting` submenus that are already defined
3. **Conditional Display**: Use the same `when` clause as existing buttons: `editorLangId == markdown && !isInDiffEditor`
4. **Explicit Ordering**: Use group suffixes (`navigation@1`, `navigation@2`, etc.) to ensure correct button order
5. **Icon Selection**: VS Code automatically provides icons for submenus (dropdown arrow indicator)

No TypeScript code changes are required since the submenus, commands, and navigation buttons already exist. This is purely a configuration change.

## Components and Interfaces

### Package.json Configuration

The `contributes.menus` section will be extended with two new entries:

```json
"editor/title": [
  {
    "submenu": "markdown.formatting",
    "when": "editorLangId == markdown && !isInDiffEditor",
    "group": "navigation@1"
  },
  {
    "submenu": "markdown.annotations",
    "when": "editorLangId == markdown && !isInDiffEditor",
    "group": "navigation@2"
  },
  {
    "command": "manuscript-markdown.prevChange",
    "when": "editorLangId == markdown && !isInDiffEditor",
    "group": "navigation@3"
  },
  {
    "command": "manuscript-markdown.nextChange",
    "when": "editorLangId == markdown && !isInDiffEditor",
    "group": "navigation@4"
  }
]
```

**Design Rationale**: The order places formatting and annotation tools first (more frequently used for content creation), followed by navigation tools. The `@1`, `@2`, `@3`, `@4` suffixes ensure explicit ordering within the navigation group, as VS Code sorts menu items by these numeric suffixes when present.

### Icon Handling

VS Code automatically handles icons for submenu entries in the toolbar:
- Submenus display with their label text and a dropdown indicator
- No explicit icon configuration is needed for submenu entries
- The existing navigation buttons already have icons defined: `$(chevron-up)` for Previous and `$(chevron-down)` for Next

**Design Rationale**: VS Code's default submenu presentation is clear and consistent with the platform's UI patterns. Custom icons for submenus are not necessary and would add visual clutter.


## Data Models

No new data models are required. This feature uses existing VS Code menu contribution structures:

- **Submenu Reference**: String identifier referencing existing submenus (`markdown.annotations`, `markdown.formatting`)
- **When Clause**: Boolean expression controlling button visibility (`editorLangId == markdown && !isInDiffEditor`)
- **Group**: String identifier for toolbar grouping (`navigation`)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Since this feature is purely declarative (configuration-based), the correctness properties focus on validating the package.json configuration structure rather than runtime behavior.

### Property 1: Toolbar button visibility configuration

*For any* toolbar button entry in the `editor/title` menu, the `when` clause should be `editorLangId == markdown && !isInDiffEditor` to ensure buttons appear only in markdown files outside diff editor mode.

**Validates: Requirements 1.1, 1.3, 1.4, 2.1, 2.3, 2.4**

### Property 2: Button grouping and ordering

*For all* four Manuscript Markdown toolbar buttons (formatting submenu, annotations submenu, prevChange, nextChange), they should be in the `navigation` group and ordered as: formatting (@1), annotations (@2), prevChange (@3), nextChange (@4)

**Validates: Requirements 3.1, 3.2**


## Error Handling

This feature has minimal error handling requirements since it's configuration-based:

1. **Invalid Configuration**: If the submenu references are incorrect, VS Code will fail to load the extension. This is caught during development/testing.
2. **Missing Icons**: If an icon codicon doesn't exist, VS Code will display a fallback. Icon choices should be validated against VS Code's codicon library.
3. **When Clause Errors**: Invalid `when` clause syntax will cause VS Code extension activation to fail with clear error messages.

All errors are caught at extension load time, not runtime, making them easy to detect during development.

## Testing Strategy

### Unit Tests

Since this is a configuration-only feature, traditional unit tests are not applicable. Instead, testing focuses on:

1. **Configuration Validation Tests**: Parse and validate the package.json structure
   - Verify all four buttons exist in `editor/title` menu (two existing commands + two new submenus)
   - Verify correct `when` clauses for all entries
   - Verify correct group assignments with proper ordering suffixes (@1, @2, @3, @4)
   - Verify submenu references (`markdown.annotations` and `markdown.formatting`) are valid

2. **Manual Testing**: 
   - Open markdown file and verify all four buttons appear in correct order
   - Verify button order: Markdown Formatting, Markdown Annotations, Previous Change, Next Change
   - Open non-markdown file and verify all buttons are hidden
   - Open diff editor and verify all buttons are hidden
   - Click each submenu button and verify dropdown menus appear with correct commands
   - Click navigation buttons and verify they navigate to prev/next changes

### Property-Based Testing

Property-based tests will validate the configuration structure:

**Library**: fast-check (already in devDependencies)

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with this format:
`// Feature: editor-toolbar-buttons, Property {number}: {property_text}`

**Properties to Test**:

1. **Property 1 Test**: Parse package.json and verify that all entries in `contributes.menus["editor/title"]` that reference Manuscript Markdown commands (`manuscript-markdown.prevChange`, `manuscript-markdown.nextChange`) or markdown submenus (`markdown.annotations`, `markdown.formatting`) have the `when` clause set to `editorLangId == markdown && !isInDiffEditor`.

2. **Property 2 Test**: Parse package.json and verify that all four Manuscript Markdown toolbar entries are in the `navigation` group with explicit ordering suffixes (@1 through @4) and appear in the correct order in the array: formatting (@1), annotations (@2), prevChange (@3), nextChange (@4).

These tests ensure the configuration remains correct as the extension evolves and prevent regressions during future updates.

