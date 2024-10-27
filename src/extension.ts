import * as vscode from 'vscode';
import { FileSystemScanner } from './core/fileSystem/scanner';

export function activate(context: vscode.ExtensionContext) { 

	console.log('Congratulations, your extension "ai-assistant" is now active!');

  const scanner = new FileSystemScanner(context);

	const disposable = vscode.commands.registerCommand('ai-assistant.scanWorkspace', async () => {
    try {
        vscode.window.showInformationMessage('Starting workspace scan...');
        const files = await scanner.scanWorkspace();
        console.log('Scan result:', files);
        vscode.window.showInformationMessage('Workspace scan completed!');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to scan workspace: ' + error);
    }
  });

	context.subscriptions.push(disposable);
}

export function deactivate() {}
