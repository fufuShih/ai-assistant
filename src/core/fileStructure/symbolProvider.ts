// src/core/fileStructure/symbolProvider.ts
import * as vscode from 'vscode';

export class TypeScriptSymbolProvider implements vscode.DocumentSymbolProvider {
    public async provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        try {
            // 使用 VS Code 內建的符號提供器
            const builtInSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (!builtInSymbols) {
                console.log('No symbols found');
                return [];
            }

            console.log(`Found ${builtInSymbols.length} symbols in ${document.fileName}`);
            
            // 過濾並整理符號
            return this.processSymbols(builtInSymbols);
        } catch (error) {
            console.error('Error providing symbols:', error);
            return [];
        }
    }

    private processSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        return symbols
            .filter(symbol => this.isRelevantSymbol(symbol))
            .map(symbol => {
                // 如果有子符號，遞迴處理
                if (symbol.children && symbol.children.length > 0) {
                    symbol.children = this.processSymbols(symbol.children);
                }
                return this.enhanceSymbol(symbol);
            })
            .sort((a, b) => a.range.start.line - b.range.start.line);
    }

    private enhanceSymbol(symbol: vscode.DocumentSymbol): vscode.DocumentSymbol {
        // 為符號添加額外信息
        let detail = '';
        
        switch (symbol.kind) {
            case vscode.SymbolKind.Function:
                detail = '(function)';
                break;
            case vscode.SymbolKind.Method:
                detail = '(method)';
                break;
            case vscode.SymbolKind.Property:
                detail = '(property)';
                break;
            case vscode.SymbolKind.Variable:
                detail = '(variable)';
                break;
            case vscode.SymbolKind.Class:
                detail = '(class)';
                break;
            case vscode.SymbolKind.Interface:
                detail = '(interface)';
                break;
            case vscode.SymbolKind.Constructor:
                detail = '(constructor)';
                break;
        }

        symbol.detail = detail;
        return symbol;
    }

    private isRelevantSymbol(symbol: vscode.DocumentSymbol): boolean {
        const relevantKinds = [
            vscode.SymbolKind.Class,
            vscode.SymbolKind.Interface,
            vscode.SymbolKind.Function,
            vscode.SymbolKind.Method,
            vscode.SymbolKind.Property,
            vscode.SymbolKind.Variable,
            vscode.SymbolKind.Constructor,
            vscode.SymbolKind.Enum,
            vscode.SymbolKind.Field,
            vscode.SymbolKind.Module,
            vscode.SymbolKind.Namespace,
            vscode.SymbolKind.Package,
            vscode.SymbolKind.TypeParameter
        ];

        // React 組件特殊處理
        if (
            (symbol.kind === vscode.SymbolKind.Function || 
             symbol.kind === vscode.SymbolKind.Variable) &&
            /^[A-Z]/.test(symbol.name)
        ) {
            return true;
        }

        return relevantKinds.includes(symbol.kind);
    }
}

export function registerSymbolProvider(context: vscode.ExtensionContext): void {
    // 註冊符號提供器
    const supportedLanguages = [
        { language: 'typescript', scheme: 'file' },
        { language: 'typescriptreact', scheme: 'file' },
        { language: 'javascript', scheme: 'file' },
        { language: 'javascriptreact', scheme: 'file' }
    ];

    const symbolProvider = new TypeScriptSymbolProvider();
    
    const registration = vscode.languages.registerDocumentSymbolProvider(
        supportedLanguages,
        symbolProvider
    );

    context.subscriptions.push(registration);
}
