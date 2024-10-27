import * as vscode from 'vscode';

export class AIConfig {
    static getOpenAIKey(): string {
        return vscode.workspace.getConfiguration('aiAssistant.openai').get('apiKey') || '';
    }

    static getAnthropicKey(): string {
        return vscode.workspace.getConfiguration('aiAssistant.anthropic').get('apiKey') || '';
    }

    static getDefaultProvider(): string {
        return vscode.workspace.getConfiguration('aiAssistant').get('defaultProvider') || 'openai';
    }

    static validateConfig(): boolean {
        const provider = this.getDefaultProvider();
        const key = provider === 'openai' ? this.getOpenAIKey() : this.getAnthropicKey();
        return !!key;
    }
}
