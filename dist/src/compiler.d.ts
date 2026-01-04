interface ICompilerOpts {
    codebuf?: any[];
    lastId?: number;
    buffer?: any;
    bufferStack?: Buffer[];
    _scopeClosers?: string;
    inBlock?: boolean;
    throwOnUndefined?: boolean;
}
export declare const compile: (src: string, //TODO: check this is true
asyncFilters: readonly string[], extensions: any[], name: string, opts?: ICompilerOpts) => string;
export {};
