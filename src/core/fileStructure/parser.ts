import * as vscode from 'vscode';
import { TypeScriptSymbolProvider } from './symbolProvider';

export type StructureNodeType = 
    'class' | 
    'function' | 
    'interface' | 
    'variable' | 
    'namespace' | 
    'enum' | 
    'todo' |
    'fixme' |
    'note';

export interface IStructureNode {
    name: string;
    type: StructureNodeType;
    range: vscode.Range;
    detail?: string;
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

    private static readonly commentTags = new Set([
        'TODO',
        'FIXME',
        'NOTE',
        'XXX',
        'HACK'
    ]);

    private static symbolProvider = new TypeScriptSymbolProvider();

    public static async parse(document: vscode.TextDocument): Promise<IStructureNode[]> {
        try {
            console.log('Parsing document:', document.fileName);

            const [symbols, comments] = await Promise.all([
                this.symbolProvider.provideDocumentSymbols(
                    document,
                    new vscode.CancellationTokenSource().token
                ),
                this.parseComments(document)
            ]);

            const nodes: IStructureNode[] = [];

            // 添加符號節點
            if (symbols && symbols.length > 0) {
                nodes.push(...this.convertSymbolsToNodes(symbols));
            }

            // 添加註釋節點
            if (comments.length > 0) {
                nodes.push(...comments);
            }

            // 按照行號排序
            return nodes.sort((a, b) => a.range.start.line - b.range.start.line);

        } catch (error) {
            console.error('Error parsing file structure:', error);
            return [];
        }
    }

    private static async parseComments(document: vscode.TextDocument): Promise<IStructureNode[]> {
        const commentNodes: IStructureNode[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // 正則表達式匹配不同類型的註釋
        const singleLineCommentRegex = /\/\/\s*(TODO|FIXME|NOTE|XXX|HACK):\s*(.+)$/;
        const multiLineCommentRegex = /\/\*\s*(TODO|FIXME|NOTE|XXX|HACK):\s*([^*]+)\*\//g;
        const jsdocCommentRegex = /\/\*\*\s*\n\s*\*\s*(TODO|FIXME|NOTE|XXX|HACK):\s*([^*]+)\*\//g;

        // 處理單行註釋
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(singleLineCommentRegex);
            
            if (match) {
                const [, tag, content] = match;
                const startPos = new vscode.Position(i, lines[i].indexOf(tag));
                const endPos = new vscode.Position(i, lines[i].length);
                
                commentNodes.push({
                    name: content.trim(),
                    type: this.getCommentType(tag),
                    range: new vscode.Range(startPos, endPos),
                    detail: tag
                });
            }
        }

        // 處理多行註釋
        const fullText = text;
        let multiLineMatch;
        
        while ((multiLineMatch = multiLineCommentRegex.exec(fullText)) !== null) {
            const [fullMatch, tag, content] = multiLineMatch;
            const startIndex = multiLineMatch.index;
            const endIndex = startIndex + fullMatch.length;
            
            const startPos = document.positionAt(startIndex);
            const endPos = document.positionAt(endIndex);
            
            commentNodes.push({
                name: content.trim().replace(/\n\s*\*\s*/g, ' '),
                type: this.getCommentType(tag),
                range: new vscode.Range(startPos, endPos),
                detail: tag
            });
        }

        return commentNodes;
    }

    private static getCommentType(tag: string): StructureNodeType {
        switch (tag.toUpperCase()) {
            case 'TODO': return 'todo';
            case 'FIXME': return 'fixme';
            case 'NOTE':
            case 'XXX':
            case 'HACK':
                return 'note';
            default: return 'note';
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
                        detail: symbol.detail
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
