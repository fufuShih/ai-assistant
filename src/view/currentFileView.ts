// src/view/currentFileView.ts
import * as vscode from 'vscode';
import { FileStructureParser, IStructureNode } from '../core/fileStructure/parser';

export class CurrentFileProvider implements vscode.TreeDataProvider<StructureTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StructureTreeItem | undefined | null | void> = new vscode.EventEmitter<StructureTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StructureTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentDocument: vscode.TextDocument | undefined;
    private nodes: IStructureNode[] = [];

    constructor() {
        if (vscode.window.activeTextEditor) {
            this.currentDocument = vscode.window.activeTextEditor.document;
            this.updateStructure();
        }

        // 監聽編輯器變化
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.currentDocument = editor.document;
                this.updateStructure();
            }
        });

        // 監聽文件變化
        vscode.workspace.onDidChangeTextDocument(e => {
            if (this.currentDocument && e.document === this.currentDocument) {
                this.updateStructure();
            }
        });
    }

    public refresh(document: vscode.TextDocument): void {
        this.currentDocument = document;
        this.updateStructure();
    }

    private async updateStructure(): Promise<void> {
        try {
            if (this.currentDocument && this.isRelevantDocument(this.currentDocument)) {
                this.nodes = await FileStructureParser.parse(this.currentDocument);
            } else {
                this.nodes = [];
            }
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Error updating file structure:', error);
            this.nodes = [];
            this._onDidChangeTreeData.fire();
        }
    }

    private isRelevantDocument(document: vscode.TextDocument): boolean {
        const supportedLanguages = [
            'typescript', 'typescriptreact',
            'javascript', 'javascriptreact'
        ];
        return supportedLanguages.includes(document.languageId);
    }

    getTreeItem(element: StructureTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StructureTreeItem): Thenable<StructureTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.nodes.map(node => new StructureTreeItem(node)));
        }
        return Promise.resolve(
            (element.node.children || []).map(child => new StructureTreeItem(child))
        );
    }
}

class StructureTreeItem extends vscode.TreeItem {
    constructor(public readonly node: IStructureNode) {
        super(
            node.name,
            node.children && node.children.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );

        // 添加詳細信息
        this.tooltip = this.createTooltip(node);
        this.description = this.createDescription(node);
        this.iconPath = this.getIconForSymbolKind(node.kind);

        // 設置跳轉命令
        this.command = {
            command: 'currentFile.jumpToLine',
            title: 'Jump to Line',
            arguments: [node.range]
        };
    }

    private createTooltip(node: IStructureNode): string {
        const kind = this.getSymbolKindString(node.kind);
        return `${kind}: ${node.name}\nLine ${node.range.start.line + 1}`;
    }

    private createDescription(node: IStructureNode): string {
        const parts = [
            this.getSymbolKindString(node.kind),
            node.detail,
            `Line ${node.range.start.line + 1}`
        ].filter(Boolean);
        return parts.join(' - ');
    }

    private getSymbolKindString(kind: vscode.SymbolKind): string {
        return vscode.SymbolKind[kind].toLowerCase();
    }

    private getIconForSymbolKind(kind: vscode.SymbolKind): vscode.ThemeIcon {
        switch (kind) {
            case vscode.SymbolKind.Class:
                return new vscode.ThemeIcon('symbol-class');
            case vscode.SymbolKind.Interface:
                return new vscode.ThemeIcon('symbol-interface');
            case vscode.SymbolKind.Enum:
                return new vscode.ThemeIcon('symbol-enum');
            case vscode.SymbolKind.Function:
                return new vscode.ThemeIcon('symbol-method');
            case vscode.SymbolKind.Method:
                return new vscode.ThemeIcon('symbol-method');
            case vscode.SymbolKind.Property:
                return new vscode.ThemeIcon('symbol-property');
            case vscode.SymbolKind.Variable:
                return new vscode.ThemeIcon('symbol-variable');
            case vscode.SymbolKind.Constructor:
                return new vscode.ThemeIcon('symbol-constructor');
            case vscode.SymbolKind.Field:
                return new vscode.ThemeIcon('symbol-field');
            case vscode.SymbolKind.Module:
            case vscode.SymbolKind.Namespace:
                return new vscode.ThemeIcon('symbol-namespace');
            default:
                return new vscode.ThemeIcon('symbol-misc');
        }
    }
}

export function registerJumpToLineCommand() {
    return vscode.commands.registerCommand('currentFile.jumpToLine', async (range: vscode.Range) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        }
    });
}
