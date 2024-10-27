import * as vscode from 'vscode';
import * as path from 'path';
import { IFileMetadata } from '../core/fileSystem/types';

export class FileExplorerProvider implements vscode.TreeDataProvider<FileExplorerItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileExplorerItem | undefined | null | void> = new vscode.EventEmitter<FileExplorerItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileExplorerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private files: IFileMetadata[] = []) {}

    refresh(files: IFileMetadata[]): void {
        this.files = files;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileExplorerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileExplorerItem): Thenable<FileExplorerItem[]> {
        if (!element) {
            return Promise.resolve(
                this.files.map(file => new FileExplorerItem(file))
            );
        }
        return Promise.resolve(
            (element.metadata.children || []).map(child => new FileExplorerItem(child))
        );
    }
}

class FileExplorerItem extends vscode.TreeItem {
    constructor(public readonly metadata: IFileMetadata) {
        super(
            metadata.name,
            metadata.isDirectory 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = metadata.path;
        this.description = this.getDescription();
        
        if (metadata.isDirectory) {
            this.iconPath = new vscode.ThemeIcon('folder');
        } else {
            this.iconPath = new vscode.ThemeIcon('file');
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(metadata.path)]
            };
        }
    }

    private getDescription(): string {
        if (this.metadata.isDirectory) {
            const childCount = this.metadata.children?.length || 0;
            return `${childCount} items`;
        }
        return this.formatFileSize(this.metadata.size);
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}
