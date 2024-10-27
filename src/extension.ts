import * as vscode from 'vscode';
import { FileSystemScanner } from './core/fileSystem/scanner';
import { FileSystemStorage } from './core/fileSystem/storage';
import { FileExplorerProvider } from './view/fileExplorer';
import { AIConfig } from './core/ai/config';
import { ChatViewProvider } from './webview/chat';
import { CurrentFileProvider } from './view/currentFileView';
import { registerSymbolProvider } from './core/fileStructure/symbolProvider';

export function activate(context: vscode.ExtensionContext) { 
    try {
        console.log('Activating AI Assistant extension...');

        // 初始化核心服務
        const scanner = new FileSystemScanner(context);
        const storage = new FileSystemStorage(context);

        // 註冊文件瀏覽器
        const fileExplorerProvider = new FileExplorerProvider();
        const fileExplorerDisposable = vscode.window.registerTreeDataProvider(
            'aiAssistantFiles', 
            fileExplorerProvider
        );
        context.subscriptions.push(fileExplorerDisposable);

        // 註冊聊天視圖
        const chatViewProvider = new ChatViewProvider(context.extensionUri, context);
        const chatViewDisposable = vscode.window.registerWebviewViewProvider(
            'aiAssistantChat', 
            chatViewProvider
        );
        context.subscriptions.push(chatViewDisposable);

        // 註冊符號提供器
        registerSymbolProvider(context);

        // 註冊當前文件視圖
        const currentFileProvider = new CurrentFileProvider();
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('aiAssistantCurrentFile', currentFileProvider)
        );

        // 註冊跳轉命令
        context.subscriptions.push(
            vscode.commands.registerCommand('currentFile.jumpToLine', (range: vscode.Range) => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor.selection = new vscode.Selection(range.start, range.end);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                }
            })
        );

        // 註冊重新整理命令
        const refreshCommand = vscode.commands.registerCommand('ai-assistant.refreshCurrentFile', async () => {
            if (vscode.window.activeTextEditor) {
                await currentFileProvider.refresh(vscode.window.activeTextEditor.document);
            }
        });
        context.subscriptions.push(refreshCommand);

        // 初始化狀態欄
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = "$(file-directory) AI Assistant";
        statusBarItem.tooltip = "Click to show AI Assistant";
        statusBarItem.command = 'ai-assistant.showExplorer';
        statusBarItem.show();
        
        // 註冊其他命令
        const commands = [
            vscode.commands.registerCommand('ai-assistant.scanWorkspace', async () => {
                try {
                    statusBarItem.text = "$(sync~spin) Scanning...";
                    const files = await scanner.scanWorkspace();
                    await storage.saveCache(files);
                    fileExplorerProvider.refresh(files);
                    statusBarItem.text = "$(file-directory) AI Assistant";
                    vscode.window.showInformationMessage('Workspace scan completed successfully!');
                } catch (error) {
                    console.error('Scan error:', error);
                    statusBarItem.text = "$(error) Scan Failed";
                    vscode.window.showErrorMessage('Failed to scan workspace: ' + error);
                }
            }),
            
            vscode.commands.registerCommand('ai-assistant.showExplorer', () => {
                vscode.commands.executeCommand('workbench.view.extension.aiAssistant');
            }),
            
            vscode.commands.registerCommand('ai-assistant.checkConfig', () => {
                if (AIConfig.validateConfig()) {
                    vscode.window.showInformationMessage('AI configuration is valid!');
                } else {
                    vscode.window.showWarningMessage('Please configure AI API keys in settings.');
                }
            }),
            
            vscode.commands.registerCommand('ai-assistant.clearChat', () => {
                chatViewProvider.clearChat();
                vscode.window.showInformationMessage('Chat history cleared!');
            })
        ];

        // 註冊命令
        commands.forEach(command => context.subscriptions.push(command));

        // 註冊狀態欄
        context.subscriptions.push(statusBarItem);

        // 自動掃描工作區
        vscode.commands.executeCommand('ai-assistant.scanWorkspace');

        console.log('AI Assistant extension activated successfully!');
        
    } catch (error) {
        console.error('Error activating extension:', error);
        vscode.window.showErrorMessage('Failed to activate AI Assistant extension');
    }
}

export function deactivate() {
    try {
        console.log('Deactivating AI Assistant extension...');
    } catch (error) {
        console.error('Error deactivating extension:', error);
    }
}
