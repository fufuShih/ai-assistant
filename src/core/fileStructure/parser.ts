// src/core/fileStructure/parser.ts
import * as vscode from 'vscode';

export interface IStructureNode {
    name: string;
    detail?: string;
    range: vscode.Range;
    kind: vscode.SymbolKind;
    children?: IStructureNode[];
}

export class FileStructureParser {
    public static async parse(document: vscode.TextDocument): Promise<IStructureNode[]> {
        try {
            // 直接使用 VS Code 的符號提供器
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (!symbols) {
                return [];
            }

            return this.convertToStructureNodes(symbols);
        } catch (error) {
            console.error('Error parsing file structure:', error);
            return [];
        }
    }

    private static convertToStructureNodes(symbols: vscode.DocumentSymbol[]): IStructureNode[] {
        return symbols.map(symbol => ({
            name: symbol.name,
            detail: symbol.detail,
            range: symbol.range,
            kind: symbol.kind,
            children: symbol.children && symbol.children.length > 0
                ? this.convertToStructureNodes(symbol.children)
                : undefined
        }));
    }
}
