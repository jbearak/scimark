import * as vscode from 'vscode';
import * as changes from './changes';
import * as formatting from './formatting';
import { criticmarkupPlugin } from './preview/criticmarkup-plugin';

export function activate(context: vscode.ExtensionContext) {
	// Register existing navigation commands
	context.subscriptions.push(
		vscode.commands.registerCommand('criticmarkup.nextChange', () => changes.next()),
		vscode.commands.registerCommand('criticmarkup.prevChange', () => changes.prev())
	);

	// Register CriticMarkup annotation commands
	context.subscriptions.push(
		vscode.commands.registerCommand('criticmarkup.markAddition', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '{++', '++}'))
		),
		vscode.commands.registerCommand('criticmarkup.markDeletion', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '{--', '--}'))
		),
		vscode.commands.registerCommand('criticmarkup.markSubstitution', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '{~~', '~>~~}', text.length + 4))
		),
		vscode.commands.registerCommand('criticmarkup.highlight', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '{==', '==}'))
		),
		vscode.commands.registerCommand('criticmarkup.insertComment', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '{>>', '<<}', 3))
		),
		vscode.commands.registerCommand('criticmarkup.highlightAndComment', () => 
			applyFormatting((text) => formatting.highlightAndComment(text))
		),
		vscode.commands.registerCommand('criticmarkup.substituteAndComment', () => 
			applyFormatting((text) => formatting.substituteAndComment(text))
		),
		vscode.commands.registerCommand('criticmarkup.additionAndComment', () => 
			applyFormatting((text) => formatting.additionAndComment(text))
		),
		vscode.commands.registerCommand('criticmarkup.deletionAndComment', () => 
			applyFormatting((text) => formatting.deletionAndComment(text))
		)
	);

	// Register Markdown formatting commands
	context.subscriptions.push(
		vscode.commands.registerCommand('markdown.formatBold', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '**', '**'))
		),
		vscode.commands.registerCommand('markdown.formatItalic', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '_', '_'))
		),
		vscode.commands.registerCommand('markdown.formatBoldItalic', () => 
			applyFormatting((text) => formatting.formatBoldItalic(text))
		),
		vscode.commands.registerCommand('markdown.formatUnderline', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '<u>', '</u>'))
		),
		vscode.commands.registerCommand('markdown.formatInlineCode', () => 
			applyFormatting((text) => formatting.wrapSelection(text, '`', '`'))
		),
		vscode.commands.registerCommand('markdown.formatCodeBlock', () => 
			applyFormatting((text) => formatting.wrapCodeBlock(text))
		),
		vscode.commands.registerCommand('markdown.formatBulletedList', () => 
			applyFormatting((text) => formatting.wrapLines(text, '- '))
		),
		vscode.commands.registerCommand('markdown.formatNumberedList', () => 
			applyFormatting((text) => formatting.wrapLinesNumbered(text))
		),
		vscode.commands.registerCommand('markdown.formatQuoteBlock', () => 
			applyFormatting((text) => formatting.wrapLines(text, '> ', true))
		)
	);

	// Register heading commands (use line-based formatting)
	context.subscriptions.push(
		vscode.commands.registerCommand('markdown.formatHeading1', () => 
			applyLineBasedFormatting((text) => formatting.formatHeading(text, 1))
		),
		vscode.commands.registerCommand('markdown.formatHeading2', () => 
			applyLineBasedFormatting((text) => formatting.formatHeading(text, 2))
		),
		vscode.commands.registerCommand('markdown.formatHeading3', () => 
			applyLineBasedFormatting((text) => formatting.formatHeading(text, 3))
		),
		vscode.commands.registerCommand('markdown.formatHeading4', () => 
			applyLineBasedFormatting((text) => formatting.formatHeading(text, 4))
		),
		vscode.commands.registerCommand('markdown.formatHeading5', () => 
			applyLineBasedFormatting((text) => formatting.formatHeading(text, 5))
		),
		vscode.commands.registerCommand('markdown.formatHeading6', () => 
			applyLineBasedFormatting((text) => formatting.formatHeading(text, 6))
		)
	);

	// Return markdown-it plugin for preview integration
	return {
		extendMarkdownIt(md: any) {
			return md.use(criticmarkupPlugin);
		}
	};
}

/**
 * Helper function to apply formatting to the current selection(s)
 * @param formatter - Function that takes text and returns a TextTransformation
 */
function applyFormatting(formatter: (text: string) => formatting.TextTransformation): void {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	// Store original selections and their transformations before the edit
	const selectionsData = editor.selections.map(selection => {
		const text = editor.document.getText(selection);
		const transformation = formatter(text);
		return {
			selection,
			transformation,
			text
		};
	});

	editor.edit(editBuilder => {
		// Process each selection (supports multi-cursor)
		for (const data of selectionsData) {
			editBuilder.replace(data.selection, data.transformation.newText);
		}
	}).then(success => {
		if (success) {
			// Handle cursor positioning for commands that need it
			const newSelections: vscode.Selection[] = [];
			
			for (const data of selectionsData) {
				if (data.transformation.cursorOffset !== undefined) {
					// Position cursor at the specified offset from the start of the replaced text
					const newPosition = data.selection.start.translate(0, data.transformation.cursorOffset);
					newSelections.push(new vscode.Selection(newPosition, newPosition));
				} else {
					// Keep the default selection behavior (select the newly inserted text)
					const endPosition = data.selection.start.translate(0, data.transformation.newText.length);
					newSelections.push(new vscode.Selection(data.selection.start, endPosition));
				}
			}
			
			// Update selections if we have any cursor positioning
			if (newSelections.length > 0) {
				editor.selections = newSelections;
			}
		}
	});
}

/**
 * Helper function to apply line-based formatting to the current selection(s)
 * Expands selections to include full lines before applying formatting
 * @param formatter - Function that takes text and returns a TextTransformation
 */
function applyLineBasedFormatting(formatter: (text: string) => formatting.TextTransformation): void {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	editor.edit(editBuilder => {
		// Process each selection (supports multi-cursor)
		for (const selection of editor.selections) {
			// Expand selection to include full lines
			const startLine = selection.start.line;
			const endLine = selection.end.line;
			const fullLineRange = new vscode.Range(
				editor.document.lineAt(startLine).range.start,
				editor.document.lineAt(endLine).range.end
			);
			
			const text = editor.document.getText(fullLineRange);
			const transformation = formatter(text);
			editBuilder.replace(fullLineRange, transformation.newText);
		}
	});
}

export function deactivate() {}
