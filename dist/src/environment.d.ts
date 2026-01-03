import { Loader } from './loader';
import { Obj, EmitterObj } from './loader';
import { Asap, Callback } from './types';
declare global {
    interface Window {
        nunjucksPrecompiled?: any;
    }
}
export declare const asap: Asap;
export declare function callbackAsap<E, R>(cb: Callback<E, R>, err: E | null, res?: R): void;
interface IEnvironmentOpts {
    throwOnUndefined: boolean;
    autoescape: boolean;
    trimBlocks: boolean;
    lstripBlocks: boolean;
    dev: boolean;
}
export declare class Environment extends EmitterObj {
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
    tests: Record<string, any>;
    globals: any;
    constructor(loaders?: Loader[], opts?: IEnvironmentOpts);
    init(loaders?: Loader[], opts?: IEnvironmentOpts): void;
    _initLoaders(): void;
    invalidateCache(): void;
    addExtension(name: string, extension: Record<string, any>): this;
    removeExtension(name: string): void;
    getExtension(name: string): any;
    hasExtension(name: string): boolean;
    addGlobal(name: string, value: any): Environment;
    getGlobal(name: string): any;
    addFilter(name: string, func: Function, async?: any[]): this;
    getFilter(name: string): any;
    resolveTemplate(loader: Loader, parentName: string, filename: string): string;
    getTemplate(name: any, eagerCompile: any, parentName?: string | null, ignoreMissing?: boolean, cb?: Callback): any;
    express(app: any): Environment;
    render(name: any, ctx: any, cb: any): any;
    renderString(src: any[], ctx: Context, opts: any, cb?: Callback): any;
    waterfall(tasks: any, callback: Callback, forceAsync: any): void;
}
export declare class Context extends Obj {
    env: Environment;
    ctx: Record<string, any>;
    exported: any[];
    blocks: Record<string, any>;
    compiled: boolean;
    init(ctx?: Record<string, any>, blocks?: Record<string, any>, env?: Environment): void;
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
export declare class Template extends Obj {
    env: Environment;
    tmplProps: Record<string, any>;
    tmplStr: string | Record<string, any>;
    path: string;
    blocks: any;
    compiled: boolean;
    rootRenderFunc: any;
    init(src: ITemplateSrc | string, env: Environment, path: string, eagerCompile: any): void;
    render(ctx: any, parentFrame: any, cb: Callback): any;
    getExported(ctx: any, parentFrame: any, cb: Callback): void;
    compile(): void;
    _compile(): void;
    _getBlocks(props: any): {};
}
declare const _default: {
    Environment: typeof Environment;
    Template: typeof Template;
};
export default _default;
