// src/core/fileStructure/symbolProvider.ts
import * as vscode from 'vscode';

export class TypeScriptSymbolProvider implements vscode.DocumentSymbolProvider {
    public async provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        try {
            // 檢查文件是否有效
            if (!document) {
                console.log('No active document');
                return [];
            }

            console.log(`Providing symbols for ${document.fileName} (${document.languageId})`);

            // 直接使用 VS Code 內建的語言服務
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (!symbols || symbols.length === 0) {
                console.log('No symbols found by VS Code provider');
                // 嘗試使用備用的符號提供方式
                return await this.getSymbolsFromLanguageFeatures(document);
            }

            console.log(`Found ${symbols.length} symbols`);
            return this.processSymbols(symbols);
        } catch (error) {
            console.error('Error providing symbols:', error);
            return [];
        }
    }

    private async getSymbolsFromLanguageFeatures(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        try {
            // 使用 TypeScript 語言服務
            const symbols = await vscode.languages.getLanguages().then(async languages => {
                if (languages.includes(document.languageId)) {
                    return vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                        'vscode.executeDocumentSymbolProvider',
                        document.uri,
                        { language: document.languageId }
                    );
                }
                return null;
            });

            if (symbols) {
                console.log('Found symbols using language features');
                return this.processSymbols(symbols);
            }
        } catch (error) {
            console.error('Error getting symbols from language features:', error);
        }
        return [];
    }

    private processSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        try {
            return symbols
                .filter(symbol => this.isRelevantSymbol(symbol))
                .map(symbol => {
                    // 遞迴處理子符號
                    if (symbol.children?.length > 0) {
                        symbol.children = this.processSymbols(symbol.children);
                    }
                    return this.enhanceSymbol(symbol);
                })
                .sort((a, b) => a.range.start.line - b.range.start.line);
        } catch (error) {
            console.error('Error processing symbols:', error);
            return symbols;
        }
    }

    private enhanceSymbol(symbol: vscode.DocumentSymbol): vscode.DocumentSymbol {
        try {
            // 添加特定類型的處理
            if (this.isReactComponent(symbol)) {
                symbol.detail = '(React Component)';
            } else if (this.isReactHook(symbol)) {
                symbol.detail = '(React Hook)';
            } else {
                symbol.detail = `(${vscode.SymbolKind[symbol.kind].toLowerCase()})`;
            }

            return symbol;
        } catch (error) {
            console.error('Error enhancing symbol:', error);
            return symbol;
        }
    }

    private isRelevantSymbol(symbol: vscode.DocumentSymbol): boolean {
        // 包含所有可能的符號類型
        const relevantKinds = new Set([
            vscode.SymbolKind.File,
            vscode.SymbolKind.Module,
            vscode.SymbolKind.Namespace,
            vscode.SymbolKind.Package,
            vscode.SymbolKind.Class,
            vscode.SymbolKind.Method,
            vscode.SymbolKind.Property,
            vscode.SymbolKind.Field,
            vscode.SymbolKind.Constructor,
            vscode.SymbolKind.Enum,
            vscode.SymbolKind.Interface,
            vscode.SymbolKind.Function,
            vscode.SymbolKind.Variable,
            vscode.SymbolKind.Constant,
            vscode.SymbolKind.String,
            vscode.SymbolKind.Number,
            vscode.SymbolKind.Boolean,
            vscode.SymbolKind.Array,
            vscode.SymbolKind.Object,
            vscode.SymbolKind.Key,
            vscode.SymbolKind.Event,
            vscode.SymbolKind.TypeParameter
        ]);

        return (
            relevantKinds.has(symbol.kind) ||
            this.isReactComponent(symbol) ||
            this.isReactHook(symbol)
        );
    }

    private isReactComponent(symbol: vscode.DocumentSymbol): boolean {
        // 檢查是否是 React 組件（以大寫字母開頭的函數或變量）
        return (
            (symbol.kind === vscode.SymbolKind.Function ||
             symbol.kind === vscode.SymbolKind.Variable ||
             symbol.kind === vscode.SymbolKind.Class) &&
            /^[A-Z][A-Za-z0-9]*$/.test(symbol.name)
        );
    }

    private isReactHook(symbol: vscode.DocumentSymbol): boolean {
        // 檢查是否是 React Hook
        return (
            symbol.kind === vscode.SymbolKind.Function &&
            symbol.name.startsWith('use') &&
            /^use[A-Z]/.test(symbol.name)
        );
    }
}

export function registerSymbolProvider(context: vscode.ExtensionContext): void {
    try {
        const provider = new TypeScriptSymbolProvider();
        
        // 註冊所有支援的語言
        const disposable = vscode.languages.registerDocumentSymbolProvider(
            [
                { scheme: 'file', language: 'typescript' },
                { scheme: 'file', language: 'typescriptreact' },
                { scheme: 'file', language: 'javascript' },
                { scheme: 'file', language: 'javascriptreact' }
            ],
            provider
        );

        context.subscriptions.push(disposable);
        
        // 添加額外的語言支援
        vscode.languages.getLanguages().then(languages => {
            languages.forEach(language => {
                if (!['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(language)) {
                    const disposable = vscode.languages.registerDocumentSymbolProvider(
                        { scheme: 'file', language },
                        provider
                    );
                    context.subscriptions.push(disposable);
                }
            });
        });
    } catch (error) {
        console.error('Error registering symbol provider:', error);
    }
}
