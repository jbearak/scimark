# Requirements Document

## Introduction

This feature enhances the Manuscript Markdown comment functionality by automatically prepending the author's name to comments. When users invoke comment-related commands from the context menu (Comment, Highlight and Comment, Substitute and Comment, Addition and Comment, Deletion and Comment), the system will retrieve the user's name and insert it in the format `@Name: ` at the beginning of the comment. This makes collaborative editing clearer by identifying who made each comment.

## Glossary

- **Manuscript Markdown Comment**: A comment syntax in the form `{>>comment text<<}`
- **User Name**: The name retrieved from extension settings or OS username
- **Author Prefix**: The formatted string `@Name: ` that precedes comment text
- **Comment Command**: A VS Code command that inserts Manuscript Markdown comment syntax
- **Highlight-and-Comment Command**: A VS Code command that both highlights selected text and adds a comment
- **Extension Setting**: A user-configurable value stored in VS Code's settings system
- **Author Name Setting**: An extension setting that specifies the author name to use in comments
- **Disable Author Names Setting**: An extension setting that prevents author names from being added to comments
- **OS Username**: The system username retrieved from Node.js os.userInfo()

## Requirements

### Requirement 1

**User Story:** As a user, I want my name automatically added to comments I create, so that collaborators can identify who made each comment.

#### Acceptance Criteria

1. WHEN a user invokes the comment command, THE system SHALL attempt to retrieve the user name from VS Code's Git extension API
2. WHEN the user name is available, THE system SHALL insert a comment with the format `{>>@Username: <<}` with the cursor positioned after the colon and space
3. WHEN the user name is not available, THE system SHALL insert a comment with the format `{>><<}` with the cursor positioned between the markers
4. WHEN a user invokes the highlight-and-comment command with selected text, THE system SHALL insert `{==selected text==}{>>@Username: <<}` with the cursor positioned after the colon and space
5. WHEN a user invokes the highlight-and-comment command without selected text, THE system SHALL insert `{====}{>>@Username: <<}` with the cursor positioned in the highlight section

### Requirement 2

**User Story:** As a user, I want to configure how author names are added to comments, so that I can customize the behavior to match my workflow.

#### Acceptance Criteria

1. WHEN the extension setting for author name is configured with a value, THE system SHALL use that value in comments
2. WHEN the extension setting to disable author names is enabled, THE system SHALL insert comments without any author prefix regardless of other settings
3. WHEN the disable setting is enabled, THE system SHALL take precedence over the author name setting
4. WHEN the author name setting is not configured, THE system SHALL use the OS username
5. WHEN the user modifies extension settings, THE system SHALL apply the new settings to subsequent comment insertions without requiring a reload

### Requirement 3

**User Story:** As a developer, I want the username retrieval to be efficient and reliable, so that the extension remains responsive.

#### Acceptance Criteria

1. WHEN the system retrieves the OS username, THE system SHALL use Node.js os.userInfo() to avoid spawning external processes
2. WHEN the OS username retrieval fails, THE system SHALL immediately fall back to inserting a comment without the author prefix without any delay
3. WHEN the user name contains special characters, THE system SHALL insert them without modification or escaping
