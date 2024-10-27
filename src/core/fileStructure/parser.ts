import * as vscode from 'vscode';
import { TypeScriptSymbolProvider } from './symbolProvider';

export type StructureNodeType = 'class' | 'function' | 'interface' | 'variable' | 'namespace' | 'enum';

export interface IStructureNode {
    name: string;
    type: StructureNodeType;
    range: vscode.Range;
    children?: IStructureNode[];
}

export class FileStructureParser {
    private static readonly typeScriptKinds = new Map<vscode.SymbolKind, StructureNodeType>([
        [vscode.SymbolKind.Class, 'class'],
        [vscode.SymbolKind.Method, 'function'],
        [vscode.SymbolKind.Function, 'function'],
        [vscode.SymbolKind.Variable, 'variable'],
        [vscode.SymbolKind.Interface, 'interface'],
        [vscode.SymbolKind.Namespace, 'namespace'],
        [vscode.SymbolKind.Enum, 'enum'],
        [vscode.SymbolKind.Constructor, 'function']
    ]);

    private static symbolProvider = new TypeScriptSymbolProvider();

    public static async parse(document: vscode.TextDocument): Promise<IStructureNode[]> {
        try {
            console.log('Parsing document:', document.fileName);

            const symbols = await this.symbolProvider.provideDocumentSymbols(
                document,
                new vscode.CancellationTokenSource().token
            );

            if (!symbols || symbols.length === 0) {
                console.log('No symbols found');
                return [];
            }

            console.log(`Found ${symbols.length} symbols`);
            const nodes = this.convertSymbolsToNodes(symbols);
            console.log('Converted nodes:', nodes);
            
            return nodes;

        } catch (error) {
            console.error('Error parsing file structure:', error);
            return [];
        }
    }

    private static convertSymbolsToNodes(symbols: vscode.DocumentSymbol[]): IStructureNode[] {
        return symbols
            .filter(symbol => this.typeScriptKinds.has(symbol.kind))
            .reduce<IStructureNode[]>((acc, symbol) => {
                const type = this.typeScriptKinds.get(symbol.kind);
                if (type) {
                    const node: IStructureNode = {
                        name: symbol.name,
                        type: type,
                        range: symbol.range,
                    };

                    if (symbol.children?.length > 0) {
                        node.children = this.convertSymbolsToNodes(symbol.children);
                    }

                    acc.push(node);
                }
                return acc;
            }, []);
    }
}
