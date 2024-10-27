export interface IFileMetadata {
    path: string;
    name: string;
    size: number;
    modifiedTime: number;
    isDirectory: boolean;
    children?: IFileMetadata[];
}

export interface IFileSystemCache {
    lastUpdate: number;
    files: IFileMetadata[];
}