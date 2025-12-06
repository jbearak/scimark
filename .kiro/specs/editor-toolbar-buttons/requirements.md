# Requirements Document

## Introduction

This feature adds toolbar buttons to the VS Code editor title bar that provide quick access to the existing "Markdown Annotations" and "Markdown Formatting" submenus. Currently, these menus are only accessible via right-click context menu. Adding toolbar buttons will improve discoverability and provide faster access to frequently-used CriticMarkup and Markdown formatting commands.

## Glossary

- **Editor Title Bar**: The horizontal bar at the top of the editor pane containing file name, tabs, and action buttons
- **Toolbar Button**: A clickable icon in the editor title bar that triggers a command or opens a menu
- **Submenu**: A nested menu containing related commands (e.g., "Markdown Annotations" submenu)
- **CriticMarkup Extension**: The VS Code extension that provides CriticMarkup syntax support
- **Context Menu**: The right-click menu in the editor
- **Menu Contribution Point**: VS Code API mechanism for adding commands to menus

## Requirements

### Requirement 1

**User Story:** As a user editing Markdown files, I want to access Markdown Annotations commands from a toolbar button, so that I can quickly apply CriticMarkup annotations without right-clicking.

#### Acceptance Criteria

1. WHEN a Markdown file is open in the editor THEN the CriticMarkup Extension SHALL display a toolbar button for Markdown Annotations in the editor title bar
2. WHEN the user clicks the Markdown Annotations toolbar button THEN the CriticMarkup Extension SHALL display a dropdown menu containing all annotation commands
3. WHEN the user is not editing a Markdown file THEN the CriticMarkup Extension SHALL hide the Markdown Annotations toolbar button
4. WHEN the user is in diff editor mode THEN the CriticMarkup Extension SHALL hide the Markdown Annotations toolbar button
5. THE Markdown Annotations toolbar button SHALL use an appropriate icon that visually represents annotations or markup

### Requirement 2

**User Story:** As a user editing Markdown files, I want to access Markdown Formatting commands from a toolbar button, so that I can quickly format text without right-clicking.

#### Acceptance Criteria

1. WHEN a Markdown file is open in the editor THEN the CriticMarkup Extension SHALL display a toolbar button for Markdown Formatting in the editor title bar
2. WHEN the user clicks the Markdown Formatting toolbar button THEN the CriticMarkup Extension SHALL display a dropdown menu containing all formatting commands
3. WHEN the user is not editing a Markdown file THEN the CriticMarkup Extension SHALL hide the Markdown Formatting toolbar button
4. WHEN the user is in diff editor mode THEN the CriticMarkup Extension SHALL hide the Markdown Formatting toolbar button
5. THE Markdown Formatting toolbar button SHALL use an appropriate icon that visually represents text formatting

### Requirement 3

**User Story:** As a user, I want all CriticMarkup toolbar buttons to be grouped together, so that the interface feels organized and all related functionality is in one place.

#### Acceptance Criteria

1. THE CriticMarkup Extension SHALL position all four toolbar buttons (Previous Change, Next Change, Markdown Annotations, Markdown Formatting) in the same navigation group
2. THE CriticMarkup Extension SHALL order the buttons logically: Markdown Formatting, Markdown Annotations, Previous Change, Next Change
3. WHEN the toolbar buttons are displayed THEN the CriticMarkup Extension SHALL maintain consistent visual grouping and spacing between all four buttons
