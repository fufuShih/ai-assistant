import * as vscode from 'vscode';
import { FileSystemScanner } from './core/fileSystem/scanner';
import { FileSystemStorage } from './core/fileSystem/storage';
import { FileExplorerProvider } from './view/fileExplorer';

export function activate(context: vscode.ExtensionContext) { 

	console.log('Congratulations, your extension "ai-assistant" is now active!');

  const scanner = new FileSystemScanner(context);
  const storage = new FileSystemStorage(context);
  const fileExplorerProvider = new FileExplorerProvider();

  vscode.window.registerTreeDataProvider('aiAssistantExplorer', fileExplorerProvider);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = "$(file-directory) AI Assistant";
  statusBarItem.tooltip = "Click to show file explorer";
  statusBarItem.command = 'ai-assistant.showExplorer';
  statusBarItem.show();
  
  // register command
  const scanCommand = vscode.commands.registerCommand('ai-assistant.scanWorkspace', async () => {
      try {
          statusBarItem.text = "$(sync~spin) Scanning...";
          const files = await scanner.scanWorkspace();
          await storage.saveCache(files);
          fileExplorerProvider.refresh(files);
          statusBarItem.text = "$(file-directory) AI Assistant";
          vscode.window.showInformationMessage('Workspace scan completed successfully!');
      } catch (error) {
          statusBarItem.text = "$(error) Scan Failed";
          vscode.window.showErrorMessage('Failed to scan workspace: ' + error);
      }
  });

  const showExplorerCommand = vscode.commands.registerCommand('ai-assistant.showExplorer', () => {
      vscode.commands.executeCommand('workbench.view.extension.aiAssistantExplorer');
  });

  context.subscriptions.push(scanCommand, showExplorerCommand);

  // scan auto
  vscode.commands.executeCommand('ai-assistant.scanWorkspace');
}

export function deactivate() {}
