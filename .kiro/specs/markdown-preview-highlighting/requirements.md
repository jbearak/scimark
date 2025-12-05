# Requirements Document

## Introduction

This feature adds CriticMarkup syntax highlighting support to VS Code's built-in Markdown Preview. Currently, the extension provides syntax highlighting only in the editor view through TextMate grammar injection. This enhancement will render CriticMarkup annotations visually in the preview pane, allowing users to see styled additions, deletions, substitutions, comments, and highlights when previewing their Markdown documents.

## Glossary

- **CriticMarkup**: A lightweight markup syntax for tracking changes and annotations in plain text documents, using patterns like `{++addition++}`, `{--deletion--}`, `{~~old~>new~~}`, `{>>comment<<}`, and `{==highlight==}`
- **Markdown Preview**: VS Code's built-in HTML preview panel that renders Markdown documents
- **Markdown-it Plugin**: An extension mechanism for the markdown-it parser that VS Code uses to render Markdown previews
- **Extension**: The VS Code CriticMarkup extension being enhanced
- **Preview Stylesheet**: CSS file that defines visual styling for rendered elements in the Markdown Preview

## Requirements

### Requirement 1

**User Story:** As a user, I want to see CriticMarkup additions rendered with visual styling in the Markdown Preview, so that I can easily identify suggested additions when reviewing documents.

#### Acceptance Criteria

1. WHEN the Markdown Preview renders a document containing `{++text++}` THEN the Extension SHALL display the text with addition styling
2. WHEN multiple additions appear in a document THEN the Extension SHALL render each addition with consistent styling
3. WHEN an addition spans multiple lines THEN the Extension SHALL preserve the line breaks and apply styling to all lines
4. WHEN an addition contains nested Markdown syntax THEN the Extension SHALL render both the Markdown formatting and the addition styling

### Requirement 2

**User Story:** As a user, I want to see CriticMarkup deletions rendered with visual styling in the Markdown Preview, so that I can easily identify suggested deletions when reviewing documents.

#### Acceptance Criteria

1. WHEN the Markdown Preview renders a document containing `{--text--}` THEN the Extension SHALL display the text with deletion styling
2. WHEN multiple deletions appear in a document THEN the Extension SHALL render each deletion with consistent styling
3. WHEN a deletion spans multiple lines THEN the Extension SHALL preserve the line breaks and apply styling to all lines
4. WHEN a deletion contains nested Markdown syntax THEN the Extension SHALL render both the Markdown formatting and the deletion styling

### Requirement 3

**User Story:** As a user, I want to see CriticMarkup substitutions rendered with visual styling in the Markdown Preview, so that I can easily identify suggested text replacements when reviewing documents.

#### Acceptance Criteria

1. WHEN the Markdown Preview renders a document containing `{~~old~>new~~}` THEN the Extension SHALL display both the old text with deletion styling and the new text with addition styling
2. WHEN multiple substitutions appear in a document THEN the Extension SHALL render each substitution with consistent styling
3. WHEN a substitution spans multiple lines THEN the Extension SHALL preserve the line breaks and apply styling to all parts
4. WHEN a substitution contains nested Markdown syntax THEN the Extension SHALL render both the Markdown formatting and the substitution styling

### Requirement 4

**User Story:** As a user, I want to see CriticMarkup comments rendered with visual styling in the Markdown Preview, so that I can easily identify editorial comments when reviewing documents.

#### Acceptance Criteria

1. WHEN the Markdown Preview renders a document containing `{>>comment<<}` THEN the Extension SHALL display the comment with comment styling
2. WHEN multiple comments appear in a document THEN the Extension SHALL render each comment with consistent styling
3. WHEN a comment spans multiple lines THEN the Extension SHALL preserve the line breaks and apply styling to all lines
4. WHEN a comment contains nested Markdown syntax THEN the Extension SHALL render both the Markdown formatting and the comment styling

### Requirement 5

**User Story:** As a user, I want to see CriticMarkup highlights rendered with visual styling in the Markdown Preview, so that I can easily identify highlighted sections when reviewing documents.

#### Acceptance Criteria

1. WHEN the Markdown Preview renders a document containing `{==text==}` THEN the Extension SHALL display the text with highlight styling
2. WHEN multiple highlights appear in a document THEN the Extension SHALL render each highlight with consistent styling
3. WHEN a highlight spans multiple lines THEN the Extension SHALL preserve the line breaks and apply styling to all lines
4. WHEN a highlight contains nested Markdown syntax THEN the Extension SHALL render both the Markdown formatting and the highlight styling

### Requirement 6

**User Story:** As a user, I want the preview styling to match the editor syntax highlighting colors, so that I have a consistent visual experience across both views.

#### Acceptance Criteria

1. WHEN the Extension renders CriticMarkup in the preview THEN the Extension SHALL use colors consistent with the editor syntax highlighting
2. WHEN a user customizes editor token colors for CriticMarkup THEN the Extension SHALL apply those same colors in the preview
3. WHEN default colors are used THEN the Extension SHALL use green for additions, red for deletions, orange for substitutions, blue for comments, and purple for highlights

### Requirement 7

**User Story:** As a developer, I want the preview rendering to use a markdown-it plugin architecture, so that the solution integrates cleanly with VS Code's Markdown Preview system.

#### Acceptance Criteria

1. WHEN the Extension activates THEN the Extension SHALL register a markdown-it plugin with the Markdown Preview
2. WHEN the markdown-it parser processes a document THEN the Extension SHALL parse CriticMarkup syntax before standard Markdown rendering
3. WHEN the plugin transforms CriticMarkup syntax THEN the Extension SHALL generate HTML elements with appropriate CSS classes
4. WHEN the preview updates THEN the Extension SHALL apply the plugin transformations without requiring a reload

### Requirement 8

**User Story:** As a user, I want CriticMarkup syntax to be parsed correctly even when mixed with standard Markdown, so that I can use both markup systems together without conflicts.

#### Acceptance Criteria

1. WHEN CriticMarkup appears inside Markdown bold or italic text THEN the Extension SHALL render both the Markdown formatting and the CriticMarkup styling
2. WHEN CriticMarkup appears inside Markdown lists THEN the Extension SHALL preserve the list structure and apply CriticMarkup styling
3. WHEN CriticMarkup appears inside Markdown code blocks THEN the Extension SHALL treat it as literal text without applying CriticMarkup styling
4. WHEN CriticMarkup appears inside Markdown inline code THEN the Extension SHALL treat it as literal text without applying CriticMarkup styling
****