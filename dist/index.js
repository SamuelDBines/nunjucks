import { isObject } from './src/lib';
import { Environment, Template } from './src/environment';
import { Loader, PrecompiledLoader, WebLoader, FileSystemLoader, NodeResolveLoader, } from './src/loader';
import precompile from './src/precompile';
import runtime from './src/runtime';
import installJinjaCompat from './src/jinja-compat';
let e = new Environment();
function configure(templatesPath = '.', opts = {}) {
    let tmp = opts;
    if (isObject(templatesPath)) {
        tmp = templatesPath;
    }
    let TemplateLoader;
    if (FileSystemLoader) {
        TemplateLoader = new FileSystemLoader([templatesPath], {
            watch: opts.watch,
            noCache: opts.noCache,
        });
    }
    else if (WebLoader) {
        TemplateLoader = new WebLoader(templatesPath, {
            useCache: opts.web && opts.web.useCache,
            async: opts.web && opts.web.async,
        });
    }
    if (!TemplateLoader)
        return;
    e = new Environment([TemplateLoader], opts);
    if (opts && opts.express) {
        e.express(opts.express);
    }
    return e;
}
export default {
    Environment,
    Template: Template,
    Loader: Loader,
    FileSystemLoader: FileSystemLoader,
    NodeResolveLoader: NodeResolveLoader,
    PrecompiledLoader,
    WebLoader,
    runtime: runtime,
    installJinjaCompat: installJinjaCompat,
    configure: configure,
    reset() {
        e = new Environment();
    },
    compile(src, env, path, eagerCompile) {
        if (!e) {
            configure();
        }
        return new Template(src, env, path, eagerCompile);
    },
    render(name, ctx, cb) {
        if (!e) {
            configure();
        }
        return e.render(name, ctx, cb);
    },
    renderString(src, ctx, cb) {
        if (!e) {
            configure();
        }
        return e.renderString(src, ctx, cb);
    },
    precompile: precompile ? precompile.precompile : undefined,
    precompileString: precompile ? precompile.precompileString : undefined,
};
export * as lib from './src/lib';
export * as lexer from './src/lexer';
export * as parser from './src/parser';
export * as nodes from './src/nodes';
export * as compiler from './src/compiler';
