import * as vscode from 'vscode';

export class TypeScriptSymbolProvider implements vscode.DocumentSymbolProvider {
    public async provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        try {
            if (!document) {
                console.log('No active document');
                return [];
            }

            console.log(`Providing symbols for ${document.fileName} (${document.languageId})`);

            if (token.isCancellationRequested) {
                return [];
            }

            const supportedLanguages = [
                'typescript',
                'typescriptreact',
                'javascript',
                'javascriptreact'
            ];

            if (!supportedLanguages.includes(document.languageId)) {
                console.log(`Language ${document.languageId} not supported for symbols`);
                return [];
            }

            // 使用 vscode 內建的語言功能來解析符號
            const symbols = await this.parseDocumentSymbols(document);
            return this.processSymbols(symbols);

        } catch (error) {
            console.error('Error providing symbols:', error);
            return [];
        }
    }

    private async parseDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
        const text = document.getText();
        const lines = text.split('\n');
        const symbols: vscode.DocumentSymbol[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 解析類
            if (line.startsWith('class ')) {
                const match = line.match(/class\s+(\w+)/);
                if (match) {
                    const className = match[1];
                    const startPos = new vscode.Position(i, lines[i].indexOf('class'));
                    const endPos = new vscode.Position(i, lines[i].length);
                    symbols.push(new vscode.DocumentSymbol(
                        className,
                        '',
                        vscode.SymbolKind.Class,
                        new vscode.Range(startPos, endPos),
                        new vscode.Range(startPos, endPos)
                    ));
                }
            }

            // 解析函數和方法
            else if (line.match(/^(async\s+)?function\s+\w+/) || line.match(/^\w+\s*=\s*(async\s+)?\(\s*\)\s*=>/)) {
                const match = line.match(/^(?:async\s+)?function\s+(\w+)|\s*(\w+)\s*=\s*(?:async\s+)?\(\s*\)\s*=>/);
                if (match) {
                    const funcName = match[1] || match[2];
                    const startPos = new vscode.Position(i, lines[i].indexOf(funcName));
                    const endPos = new vscode.Position(i, lines[i].length);
                    symbols.push(new vscode.DocumentSymbol(
                        funcName,
                        '',
                        vscode.SymbolKind.Function,
                        new vscode.Range(startPos, endPos),
                        new vscode.Range(startPos, endPos)
                    ));
                }
            }

            // 解析變量
            else if (line.match(/^(?:const|let|var)\s+\w+/)) {
                const match = line.match(/^(?:const|let|var)\s+(\w+)/);
                if (match) {
                    const varName = match[1];
                    const startPos = new vscode.Position(i, lines[i].indexOf(varName));
                    const endPos = new vscode.Position(i, lines[i].length);
                    symbols.push(new vscode.DocumentSymbol(
                        varName,
                        '',
                        vscode.SymbolKind.Variable,
                        new vscode.Range(startPos, endPos),
                        new vscode.Range(startPos, endPos)
                    ));
                }
            }
        }

        return symbols;
    }

    private processSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        try {
            return symbols
                .filter(symbol => this.isRelevantSymbol(symbol))
                .map(symbol => {
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
            if (this.isReactComponent(symbol)) {
                symbol.detail = '(React Component)';
            } else if (this.isReactHook(symbol)) {
                symbol.detail = '(React Hook)';
            } else {
                symbol.detail = symbol.detail || `(${vscode.SymbolKind[symbol.kind].toLowerCase()})`;
            }
            return symbol;
        } catch (error) {
            console.error('Error enhancing symbol:', error);
            return symbol;
        }
    }

    private isRelevantSymbol(symbol: vscode.DocumentSymbol): boolean {
        const relevantKinds = new Set([
            vscode.SymbolKind.Class,
            vscode.SymbolKind.Method,
            vscode.SymbolKind.Function,
            vscode.SymbolKind.Variable,
            vscode.SymbolKind.Interface,
            vscode.SymbolKind.Enum
        ]);

        return relevantKinds.has(symbol.kind);
    }

    private isReactComponent(symbol: vscode.DocumentSymbol): boolean {
        return (
            (symbol.kind === vscode.SymbolKind.Function ||
             symbol.kind === vscode.SymbolKind.Variable ||
             symbol.kind === vscode.SymbolKind.Class) &&
            /^[A-Z][A-Za-z0-9]*$/.test(symbol.name)
        );
    }

    private isReactHook(symbol: vscode.DocumentSymbol): boolean {
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
        
        // 註冊支援的語言
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
    } catch (error) {
        console.error('Error registering symbol provider:', error);
    }
}
