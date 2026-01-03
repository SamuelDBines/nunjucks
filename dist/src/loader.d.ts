import EventEmitter from 'events';
interface IObj {
    typename: string;
    init: () => void;
}
interface ILoader {
    watch: boolean;
    noCache: boolean;
    resolve: (from: string, to: string) => string;
    isRelative: (filename: string) => boolean;
}
interface IWebLoader extends ILoader {
    baseURL: string;
    useCache: boolean;
    async: boolean;
    cache: any;
    getSource(name: string, cb?: (err: any, res: any) => void): void;
    fetch(url: string, cb: (err: {
        status: number;
        content: string;
    }, src?: string) => void): void;
}
export declare class Obj implements IObj {
    extname?: string;
    __typename?: string;
    constructor(...args: any[]);
    init(...args: any[]): void;
    get typename(): string;
    static extend(name: any, props?: any): any;
}
export declare class EmitterObj extends EventEmitter {
    constructor(...args: any[]);
    get typename(): string;
    static extend(name: any | string, props?: any): any;
}
export declare class Loader extends EmitterObj implements ILoader {
    watch: boolean;
    noCache: boolean;
    cache: Record<string, any>;
    resolve(from: string, to: string): string;
    isRelative(filename: string): boolean;
}
export declare class PrecompiledLoader extends Loader {
    precompiled: Record<string, any>;
    constructor(compiledTemplates: any);
    getSource(name: string): null | {
        src: {
            type: string;
            obj: any;
        };
        path: string;
    };
}
export declare class WebLoader extends Loader implements IWebLoader {
    baseURL: string;
    useCache: boolean;
    async: boolean;
    constructor(baseURL?: string, opts?: {
        useCache?: boolean;
        async?: boolean;
    });
    resolve(_: string, _t: string): string;
    getSource(name: string, cb?: (err: any, res: any) => void): any;
    fetch(url: string, cb: (err: {
        status: number;
        content: string;
    }, src?: string) => void): Promise<void>;
}
interface ILoaderOpts {
    watch: boolean;
    noCache: boolean;
}
export declare class FileSystemLoader extends Loader {
    searchPaths: string[];
    pathsToNames: Record<string, any>;
    constructor(searchPaths: string[], opts?: ILoaderOpts);
    getSource(name: string): {
        src: string;
        path: any;
        noCache: boolean;
    };
}
export declare class NodeResolveLoader extends Loader {
    pathsToNames: Record<string, any>;
    watcher: any;
    constructor(opts?: ILoaderOpts);
    getSource(name: string): {
        src: string;
        path: any;
        noCache: boolean;
    };
}
export {};
