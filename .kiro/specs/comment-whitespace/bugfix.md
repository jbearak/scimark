# Bugfix Requirements Document

## Introduction

CriticMarkup comments placed after a CriticMarkup element with intervening whitespace fail to associate with that element in the markdown preview. In authored CriticMarkup documents, a space between the element and its comment (e.g., `{==text==} {>>comment<<}`) is common. The `associateCommentsRule` Pass 3 in the preview plugin checks only the immediately preceding token in the rebuilt children array for a CriticMarkup close type. When whitespace separates the two, a text token containing the space is the immediate predecessor instead, causing the comment to render as a standalone indicator rather than associating with the element.

This bug affects all CriticMarkup element types that support comment association: highlights, additions, deletions, substitutions, and format highlights.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a CriticMarkup comment `{>>comment<<}` immediately follows a CriticMarkup element with one or more whitespace characters between them (e.g., `{==text==} {>>comment<<}`) THEN the system renders the comment as a standalone indicator instead of associating it with the preceding element

1.2 WHEN multiple whitespace characters (spaces, tabs) separate a CriticMarkup element and its comment (e.g., `{++added++}  {>>comment<<}`) THEN the system renders the comment as a standalone indicator instead of associating it with the preceding element

1.3 WHEN a CriticMarkup comment follows a CriticMarkup element with whitespace, and the element is any of the supported types (addition, deletion, substitution, highlight, format highlight) THEN the system fails to set the `data-comment` attribute on the element's open token

### Expected Behavior (Correct)

2.1 WHEN a CriticMarkup comment `{>>comment<<}` follows a CriticMarkup element with only whitespace characters between them (e.g., `{==text==} {>>comment<<}`) THEN the system SHALL associate the comment with the preceding element by setting `data-comment` on its open token, and the intervening whitespace SHALL be preserved in the rendered output

2.2 WHEN multiple whitespace characters separate a CriticMarkup element and its comment (e.g., `{++added++}  {>>comment<<}`) THEN the system SHALL associate the comment with the preceding element by setting `data-comment` on its open token

2.3 WHEN a CriticMarkup comment follows any supported CriticMarkup element type (addition, deletion, substitution, highlight, format highlight) with whitespace between them THEN the system SHALL associate the comment with that element identically to the no-whitespace case

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a CriticMarkup comment immediately follows a CriticMarkup element with no whitespace (e.g., `{==text==}{>>comment<<}`) THEN the system SHALL CONTINUE TO associate the comment with the preceding element

3.2 WHEN a CriticMarkup comment appears with non-whitespace text between it and a preceding CriticMarkup element (e.g., `{==text==}some text{>>comment<<}`) THEN the system SHALL CONTINUE TO render the comment as a standalone indicator

3.3 WHEN a CriticMarkup comment has no preceding CriticMarkup element THEN the system SHALL CONTINUE TO render the comment as a standalone indicator

3.4 WHEN an ID-based comment (`{#id>>comment<<}`) is used THEN the system SHALL CONTINUE TO handle it via Pass 2 range marker association

3.5 WHEN an empty comment `{>><<}` appears THEN the system SHALL CONTINUE TO remove it silently

3.6 WHEN multiple comments are associated with the same element (with or without whitespace) THEN the system SHALL CONTINUE TO concatenate them with newline separators in the `data-comment` attribute
