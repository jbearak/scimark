import * as vscode from 'vscode';
import * as changes from './changes';

export function activate(context: vscode.ExtensionContext) {
	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('criticmarkup.nextChange', () => changes.next()),
		vscode.commands.registerCommand('criticmarkup.prevChange', () => changes.prev())
	);
}

export function deactivate() {}
