import EventEmitter from 'events';
import { Loader } from './loader';
import { Callback } from './types';
declare global {
    interface Window {
        nunjucksPrecompiled?: any;
    }
}
type getTemplateOps = {
    eagerCompile?: boolean;
    parentName?: string | null;
    ignoreMissing?: boolean;
};
interface IEnvironmentOpts {
    throwOnUndefined?: boolean;
    autoescape?: boolean;
    trimBlocks?: boolean;
    lstripBlocks?: boolean;
    dev?: boolean;
    loaders?: Loader[];
}
export declare class Environment extends EventEmitter {
    throwOnUndefined: boolean;
    trimBlocks: boolean;
    lstripBlocks: boolean;
    dev: boolean;
    autoescape: boolean;
    loaders: Loader[];
    asyncFilters: string[];
    ctx?: Context;
    extensionsList: any[];
    extensions: Record<string, any>;
    filters: Record<string, any>;
    cache: Record<string, any>;
    globals: any;
    constructor(opts?: IEnvironmentOpts);
    _initLoaders(): void;
    invalidateCache(): void;
    addExtension(name: string, extension: Record<string, any>): this;
    removeExtension(name: string): void;
    getExtension(name: string): any;
    hasExtension(name: string): boolean;
    addFilter(name: string, func: Function, async?: any[]): this;
    getFilter(name: string): any;
    resolveTemplate(loader: Loader, parentName: string, filename: string): string;
    getTemplate(name: any, cb?: Callback, opts?: getTemplateOps): any;
    express(app: any): Environment;
    render(name: string, ctx: any, cb?: Callback): void;
    renderString(src: any, ctx: any, opts: any, cb?: Callback): any;
    get typename(): string;
    waterfall(tasks: any, callback: Callback, forceAsync: any): (tasks: any, done: Callback) => void;
}
export declare class Context {
    ctx: Record<string, any>;
    blocks: Record<string, any>;
    env: Environment;
    lineno: number;
    colno: number;
    exported: any[];
    compiled: boolean;
    constructor(ctx?: Record<string, any>, blocks?: Record<string, any>, env?: Environment, lineno?: number, colno?: number);
    get typename(): string;
    lookup(name: string): any;
    setVariable(name: string, val: any): void;
    getVariables(): Record<string, any>;
    addBlock(name: string, block: any): this;
    getBlock(name: string): any;
    getSuper(env: Environment, name: string, block: any, frame: any, runtime: any, cb: Callback): void;
    addExport(name: string): void;
    getExported(): {};
}
type ITemplateSrc = {
    type: 'code' | 'string';
    obj: any;
};
export declare class Template {
    lineno: number;
    colno: number;
    env: Environment;
    tmplProps?: Record<string, any>;
    tmplStr: string | Record<string, any>;
    path: string;
    blocks: any;
    compiled: boolean;
    rootRenderFunction: any;
    constructor(src: ITemplateSrc | string, env: Environment, path: string, eagerCompile?: any, lineno?: number, colno?: number);
    render(ctx: any, parentFrame?: any, cb?: Callback): any;
    getExported(ctx: any, parentFrame: any, cb: Callback): void;
    compile(): void;
    _compile(): void;
    _getBlocks(props: any): {};
}
export {};
