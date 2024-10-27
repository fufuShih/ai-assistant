import * as vscode from 'vscode';
import { FileSystemScanner } from './core/fileSystem/scanner';
import { FileSystemStorage } from './core/fileSystem/storage';
import { FileExplorerProvider } from './view/fileExplorer';

import { AIConfig } from './core/ai/config';
import { ChatViewProvider } from './webview/chat';

export function activate(context: vscode.ExtensionContext) { 
    console.log('Congratulations, your extension "ai-assistant" is now active!');

    const scanner = new FileSystemScanner(context);
    const storage = new FileSystemStorage(context);

    // 註冊文件瀏覽器
    const fileExplorerProvider = new FileExplorerProvider();
    vscode.window.registerTreeDataProvider('aiAssistantFiles', fileExplorerProvider);

    // 註冊聊天視圖
    const chatViewProvider = new ChatViewProvider(context.extensionUri, context);
    vscode.window.registerWebviewViewProvider('aiAssistantChat', chatViewProvider);

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(file-directory) AI Assistant";
    statusBarItem.tooltip = "Click to show AI Assistant";
    statusBarItem.command = 'ai-assistant.showExplorer';
    statusBarItem.show();
    
    // register commands
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
        vscode.commands.executeCommand('workbench.view.extension.aiAssistant');
    });

    const checkConfigCommand = vscode.commands.registerCommand('ai-assistant.checkConfig', () => {
        if (AIConfig.validateConfig()) {
            vscode.window.showInformationMessage('AI configuration is valid!');
        } else {
            vscode.window.showWarningMessage('Please configure AI API keys in settings.');
        }
    });

    const clearChatCommand = vscode.commands.registerCommand('ai-assistant.clearChat', () => {
        chatViewProvider.clearChat();
        vscode.window.showInformationMessage('Chat history cleared!');
    });

    context.subscriptions.push(
        scanCommand,
        showExplorerCommand,
        checkConfigCommand,
        clearChatCommand,
        statusBarItem
    );

    // 自動掃描工作區
    vscode.commands.executeCommand('ai-assistant.scanWorkspace');
}

export function deactivate() {}
