import * as vscode from 'vscode';
import * as changes from './changes';

let debounceTimer: NodeJS.Timeout | undefined;

function triggerUpdateContext(editor: vscode.TextEditor) {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}
	debounceTimer = setTimeout(() => {
		updateNavigationContext(editor);
	}, 200);
}

function updateNavigationContext(editor: vscode.TextEditor) {
	if (editor.document.languageId !== 'markdown') {
		vscode.commands.executeCommand('setContext', 'criticmarkup.hasChanges', false);
		return;
	}

	const ranges = changes.getAllMatches(editor.document);
	vscode.commands.executeCommand('setContext', 'criticmarkup.hasChanges', ranges.length > 0);
}

export function activate(context: vscode.ExtensionContext) {
	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('criticmarkup.nextChange', () => changes.next()),
		vscode.commands.registerCommand('criticmarkup.prevChange', () => changes.prev())
	);

	// Update context when active editor changes
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				updateNavigationContext(editor);
			}
		})
	);

	// Update context when document changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				triggerUpdateContext(editor);
			}
		})
	);

	// Initial context update
	if (vscode.window.activeTextEditor) {
		updateNavigationContext(vscode.window.activeTextEditor);
	}
}

export function deactivate() {}
