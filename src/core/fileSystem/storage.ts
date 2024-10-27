import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IFileMetadata, IFileSystemCache } from './types';

export class FileSystemStorage {
    private static readonly CACHE_KEY = 'fileSystemCache';
    private cacheDir: string;

    constructor(private context: vscode.ExtensionContext) {
        // 在擴展目錄下創建緩存目錄
        this.cacheDir = path.join(context.globalStorageUri.fsPath, 'cache');
        this.initializeCache();
    }

    private async initializeCache(): Promise<void> {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error('Error creating cache directory:', error);
        }
    }

    private getCacheFilePath(workspaceFolder: string): string {
        // 將工作區路徑轉換為有效的文件名
        const safeName = Buffer.from(workspaceFolder).toString('base64');
        return path.join(this.cacheDir, `${safeName}.json`);
    }

    public async saveCache(files: IFileMetadata[]): Promise<void> {
        const cache: IFileSystemCache = {
            lastUpdate: Date.now(),
            files
        };

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        for (const folder of workspaceFolders) {
            const cacheFilePath = this.getCacheFilePath(folder.uri.fsPath);
            try {
                await fs.writeFile(
                    cacheFilePath,
                    JSON.stringify(cache, null, 2),
                    'utf-8'
                );
            } catch (error) {
                console.error('Error saving cache:', error);
            }
        }

        // 同時保存到 globalState 作為備份
        await this.context.globalState.update(FileSystemStorage.CACHE_KEY, cache);
    }

    public async loadCache(): Promise<IFileSystemCache | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        try {
            const cacheFilePath = this.getCacheFilePath(workspaceFolders[0].uri.fsPath);
            const data = await fs.readFile(cacheFilePath, 'utf-8');
            return JSON.parse(data) as IFileSystemCache;
        } catch (error) {
            // 如果讀取文件失敗，嘗試從 globalState 讀取
            return this.context.globalState.get<IFileSystemCache>(FileSystemStorage.CACHE_KEY);
        }
    }

    public async clearCache(): Promise<void> {
        try {
            const files = await fs.readdir(this.cacheDir);
            await Promise.all(
                files.map(file => 
                    fs.unlink(path.join(this.cacheDir, file))
                )
            );
            await this.context.globalState.update(FileSystemStorage.CACHE_KEY, undefined);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}
