import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IFileMetadata } from './types';

export class FileSystemScanner {
    constructor(private context: vscode.ExtensionContext) {
        this.setupFileWatcher();
    }

    private watcher: vscode.FileSystemWatcher | undefined;

    private setupFileWatcher() {
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        this.watcher.onDidCreate(uri => this.handleFileChange('create', uri));
        this.watcher.onDidChange(uri => this.handleFileChange('change', uri));
        this.watcher.onDidDelete(uri => this.handleFileChange('delete', uri));
        
        this.context.subscriptions.push(this.watcher);
    }

    private async handleFileChange(type: 'create' | 'change' | 'delete', uri: vscode.Uri) {
        console.log(`File ${type}: ${uri.fsPath}`);
    }

    public async scanWorkspace(): Promise<IFileMetadata[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const result: IFileMetadata[] = [];
        for (const folder of workspaceFolders) {
            try {
                const metadata = await this.scanDirectory(folder.uri.fsPath);
                result.push(metadata);
            } catch (error) {
                console.error(`Error scanning workspace folder ${folder.uri.fsPath}:`, error);
            }
        }

        return result;
    }

    private async scanDirectory(dirPath: string): Promise<IFileMetadata> {
        const stats = await fs.stat(dirPath);
        const baseName = path.basename(dirPath);

        const metadata: IFileMetadata = {
            path: dirPath,
            name: baseName,
            size: stats.size,
            modifiedTime: stats.mtimeMs,
            isDirectory: stats.isDirectory(),
            children: []
        };

        if (metadata.isDirectory) {
            try {
                const entries = await fs.readdir(dirPath);
                metadata.children = await Promise.all(
                    entries
                        .filter(entry => !this.shouldIgnore(entry))
                        .map(entry => this.scanDirectory(path.join(dirPath, entry)))
                );
            } catch (error) {
                console.error(`Error scanning directory ${dirPath}:`, error);
            }
        }

        return metadata;
    }

    private shouldIgnore(fileName: string): boolean {
        const ignoredPatterns = [
            'node_modules',
            '.git',
            '.DS_Store',
            'dist',
            'out'
        ];
        return ignoredPatterns.some(pattern => fileName.includes(pattern));
    }
}
