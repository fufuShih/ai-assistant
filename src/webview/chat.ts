import * as vscode from 'vscode';
import { ChatService } from '../core/ai/chatService';
import { IMessage } from '../core/ai/types';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private chatService: ChatService;
    private messages: IMessage[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        this.chatService = new ChatService();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 設置消息處理
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleMessage(data.message);
                    break;
            }
        });
    }

    private async handleMessage(content: string) {
        try {
            // 添加用戶消息
            this.messages.push({ role: 'user', content });
            
            // 在 UI 中顯示用戶消息
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: content,
                    role: 'user'
                });
            }

            // 獲取 AI 響應
            const response = await this.chatService.chat(this.messages);
            
            // 添加 AI 響應到消息列表
            this.messages.push({ role: 'assistant', content: response.content });
            
            // 在 UI 中顯示 AI 響應
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: response.content,
                    role: 'assistant'
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Chat error: ${error}`);
        }
    }

    public clearChat() {
        this.messages = [];
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearChat' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styles = `
            body { 
                padding: 0; 
                color: var(--vscode-editor-foreground);
                background: var(--vscode-editor-background);
            }
            .chat-container { 
                display: flex; 
                flex-direction: column; 
                height: 100vh;
                max-width: 100%;
            }
            .messages { 
                flex: 1; 
                overflow-y: auto; 
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .input-container { 
                padding: 10px;
                border-top: 1px solid var(--vscode-widget-border);
            }
            .message { 
                padding: 8px 12px;
                border-radius: 6px;
                max-width: 85%;
                word-wrap: break-word;
            }
            .user { 
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                align-self: flex-end;
            }
            .assistant { 
                background: var(--vscode-editor-inactiveSelectionBackground);
                color: var(--vscode-editor-foreground);
                align-self: flex-start;
            }
            textarea { 
                width: 100%;
                min-height: 60px;
                padding: 8px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                resize: vertical;
                font-family: var(--vscode-font-family);
            }
            textarea:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
        `;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>${styles}</style>
            </head>
            <body>
                <div class="chat-container">
                    <div class="messages" id="messages"></div>
                    <div class="input-container">
                        <textarea 
                            id="input" 
                            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                        ></textarea>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const messagesContainer = document.getElementById('messages');
                    const input = document.getElementById('input');

                    // 保存狀態
                    let previousState = vscode.getState() || { messages: [] };
                    previousState.messages.forEach(msg => addMessage(msg.content, msg.role));

                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const message = input.value.trim();
                            if (message) {
                                vscode.postMessage({ type: 'sendMessage', message });
                                input.value = '';
                            }
                        }
                    });

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        switch (message.type) {
                            case 'addMessage':
                                addMessage(message.message, message.role);
                                // 保存到狀態
                                const state = vscode.getState() || { messages: [] };
                                state.messages.push({
                                    content: message.message,
                                    role: message.role
                                });
                                vscode.setState(state);
                                break;
                            case 'clearChat':
                                messagesContainer.innerHTML = '';
                                vscode.setState({ messages: [] });
                                break;
                        }
                    });

                    function addMessage(content, role) {
                        const div = document.createElement('div');
                        div.className = 'message ' + role;
                        div.textContent = content;
                        messagesContainer.appendChild(div);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                </script>
            </body>
            </html>`;
    }
}
