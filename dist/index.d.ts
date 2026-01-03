import { Environment, Template, Context } from './src/environment';
import { Loader, PrecompiledLoader, WebLoader, FileSystemLoader, NodeResolveLoader } from './src/loader';
import { Callback } from './src/types';
import installJinjaCompat from './src/jinja-compat';
declare function configure(templatesPath?: string, opts?: any): Environment;
declare const _default: {
    Environment: typeof Environment;
    Template: typeof Template;
    Loader: typeof Loader;
    FileSystemLoader: typeof FileSystemLoader;
    NodeResolveLoader: typeof NodeResolveLoader;
    PrecompiledLoader: typeof PrecompiledLoader;
    WebLoader: typeof WebLoader;
    runtime: {
        Frame: typeof import("./src/runtime").Frame;
        makeMacro: (argNames: string[], kwargNames: string[], func: Function) => (this: any, ...macroArgs: any[]) => any;
        makeKeywordArgs: (obj: any) => any;
        numArgs: (args: any[]) => number;
        ensureDefined: typeof import("./src/runtime").ensureDefined;
        memberLookup: typeof import("./src/runtime").memberLookup;
        contextOrFrameLookup: (context: any, frame: import("./src/runtime").Frame, name: string) => any;
        callWrap: (obj: any, name: string, context: Context, args: any[]) => any;
        handleError: (error: any, lineno?: number, colno?: number) => any;
        isArray: (arg: any) => arg is any[];
        keys: {
            (o: object): string[];
            (o: {}): string[];
        };
        copySafeness: (dest: any, target: string) => string;
        markSafe: (val: any) => any;
        asyncEach: (arr: any[], dimen: number, iter: Function, cb: Callback) => void;
        asyncAll: typeof import("./src/runtime").asyncAll;
        inOperator: typeof import("./src/lib").inOperator;
        fromIterator: typeof import("./src/runtime").fromIterator;
    };
    installJinjaCompat: typeof installJinjaCompat;
    configure: typeof configure;
    reset(): void;
    compile(src: any, env: any, path: any, eagerCompile: any): Template;
    render(name: string, ctx: Context, cb: Callback): any;
    renderString(src: any, ctx: Context, cb: Callback): any;
    precompile: (input: any, opts?: {
        isString?: boolean;
        isFunction?: boolean;
        force?: boolean;
        env?: Environment;
        wrapper?: (templates: Template[], opts?: {
            isFunction: boolean;
        }) => string;
        name?: string;
        include?: string[];
        exclude?: string[];
    }) => string;
    precompileString: (str: string, opts?: {
        isString?: boolean;
        isFunction?: boolean;
        force?: boolean;
        env?: Environment;
        wrapper?: (templates: Template[], opts?: {
            isFunction: boolean;
        }) => string;
        name?: string;
        include?: string[];
        exclude?: string[];
    }) => string;
};
export default _default;
export * as lib from './src/lib';
export * as lexer from './src/lexer';
export * as parser from './src/parser';
export * as nodes from './src/nodes';
export * as compiler from './src/compiler';
