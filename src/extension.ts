import * as vscode from 'vscode';
import { FileSystemScanner } from './core/fileSystem/scanner';
import { FileSystemStorage } from './core/fileSystem/storage';
import { FileExplorerProvider } from './view/fileExplorer';
import { AIConfig } from './core/ai/config';
import { ChatViewProvider } from './webview/chat';
import { CurrentFileProvider, registerJumpToLineCommand } from './view/currentFileView';
import { TypeScriptSymbolProvider, registerSymbolProvider } from './core/fileStructure/symbolProvider';

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

        // 註冊符號提供器（同時支援新舊兩種方式）
        // 方式一：使用獨立的註冊函數
        registerSymbolProvider(context);

        // 註冊當前文件結構視圖
        const currentFileProvider = new CurrentFileProvider();
        const currentFileDisposable = vscode.window.registerTreeDataProvider(
            'aiAssistantCurrentFile', 
            currentFileProvider
        );
        context.subscriptions.push(currentFileDisposable);

        // 註冊重新整理命令
        const refreshCommand = vscode.commands.registerCommand('ai-assistant.refreshCurrentFile', async () => {
            try {
                console.log('Manually refreshing current file structure...');
                if (vscode.window.activeTextEditor) {
                    await currentFileProvider.refresh(vscode.window.activeTextEditor.document);
                    vscode.window.showInformationMessage('Current file structure refreshed');
                } else {
                    console.log('No active editor found');
                    vscode.window.showInformationMessage('No active file to refresh');
                }
            } catch (error) {
                console.error('Error refreshing current file structure:', error);
                vscode.window.showErrorMessage('Failed to refresh current file structure');
            }
        });
        context.subscriptions.push(refreshCommand);

        // 註冊跳轉命令
        const jumpToLineCommand = registerJumpToLineCommand();
        context.subscriptions.push(jumpToLineCommand);

        // 初始化狀態欄
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = "$(file-directory) AI Assistant";
        statusBarItem.tooltip = "Click to show AI Assistant";
        statusBarItem.command = 'ai-assistant.showExplorer';
        statusBarItem.show();
        
        // 註冊命令
        const commands = [
            refreshCommand,
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

        // 註冊所有命令
        commands.forEach(command => context.subscriptions.push(command));

        // 監聽編輯器變化
        const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                currentFileProvider.refresh(editor.document);
            }
        });

        // 監聽文件變化
        const documentChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document === vscode.window.activeTextEditor?.document) {
                currentFileProvider.refresh(event.document);
            }
        });

        // 註冊監聽器
        context.subscriptions.push(
            editorChangeListener,
            documentChangeListener,
            statusBarItem
        );

        // 初始化當前文件結構
        if (vscode.window.activeTextEditor) {
            currentFileProvider.refresh(vscode.window.activeTextEditor.document);
        }

        // 自動掃描工作區
        vscode.commands.executeCommand('ai-assistant.scanWorkspace');

        console.log('AI Assistant extension activated successfully!');
        
    } catch (error) {
        console.error('Error activating extension:', error);
        vscode.window.showErrorMessage('Failed to activate AI Assistant extension. Check console for details.');
    }
}

export function deactivate() {
    try {
        console.log('Deactivating AI Assistant extension...');
    } catch (error) {
        console.error('Error deactivating extension:', error);
    }
}
