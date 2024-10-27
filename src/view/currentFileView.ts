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

        // 監聽活動編輯器的變化
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            if (editor) {
                this.currentDocument = editor.document;
                await this.updateStructure();
            } else {
                this.currentDocument = undefined;
                this.nodes = [];
                this._onDidChangeTreeData.fire();
            }
        });

        // 監聽文件變化
        vscode.workspace.onDidChangeTextDocument(async e => {
            if (this.currentDocument && e.document === this.currentDocument) {
                await this.updateStructure();
            }
        });
    }

    public async refresh(document: vscode.TextDocument): Promise<void> {
        if (!document) {
            return;
        }
        this.currentDocument = document;
        await this.updateStructure();
    }

    private async updateStructure() {
        if (this.currentDocument) {
            this.nodes = await FileStructureParser.parse(this.currentDocument);
            this._onDidChangeTreeData.fire();
        }
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

        this.tooltip = node.detail ? `${node.type}: ${node.name}\n${node.detail}` : `${node.type}: ${node.name}`;
        this.description = node.detail || node.type;
        this.iconPath = this.getIconForType(node.type);
        
        this.command = {
            command: 'currentFile.jumpToLine',
            title: 'Jump to Location',
            arguments: [node.range]
        };
    }

    private getIconForType(type: string): vscode.ThemeIcon {
        switch (type) {
            case 'class':
                return new vscode.ThemeIcon('symbol-class');
            case 'function':
                return new vscode.ThemeIcon('symbol-method');
            case 'interface':
                return new vscode.ThemeIcon('symbol-interface');
            case 'variable':
                return new vscode.ThemeIcon('symbol-variable');
            case 'namespace':
                return new vscode.ThemeIcon('symbol-namespace');
            case 'enum':
                return new vscode.ThemeIcon('symbol-enum');
            case 'todo':
                return new vscode.ThemeIcon('tasklist');
            case 'fixme':
                return new vscode.ThemeIcon('warning');
            case 'note':
                return new vscode.ThemeIcon('note');
            default:
                return new vscode.ThemeIcon('symbol-misc');
        }
    }
}
