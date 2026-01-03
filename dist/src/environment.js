import { _entries, without, isFunction, asyncIter, _prettifyError, indexOf, isString, } from './lib';
import * as compiler from './compiler';
import * as filters from './filters';
import { FileSystemLoader, PrecompiledLoader, } from './loader';
import globals from './globals';
import { Obj, EmitterObj } from './loader';
import runtime from './runtime';
import expressApp from './express-app';
const { handleError, Frame } = runtime;
function waterfall(tasks, done, forceAsync) {
    let i = 0;
    function next(err, res) {
        if (err)
            return done(err);
        const task = tasks[i++];
        if (!task)
            return done(null, res);
        // first task: (cb), others: (res, cb)
        if (task.length <= 1)
            task(next);
        else
            task(res, next);
    }
    next(null, undefined);
}
export const asap = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => {
        Promise.resolve().then(fn);
    };
export function callbackAsap(cb, err, res) {
    asap(() => cb(err, res));
}
const noopTmplSrc = {
    type: 'code',
    obj: {
        root(env, context, frame, runtime, cb) {
            try {
                cb(null, '');
            }
            catch (e) {
                cb(handleError(e, null, null));
            }
        },
    },
};
export class Environment extends EmitterObj {
    throwOnUndefined = false;
    trimBlocks = false;
    lstripBlocks = false;
    dev = true;
    autoescape = true;
    loaders = [new FileSystemLoader(['views'])];
    asyncFilters = [];
    ctx;
    // TODO: figure out types here
    extensionsList = [];
    extensions = {};
    filters = {};
    cache = {};
    tests = {};
    globals;
    constructor(loaders = [], opts) {
        super(loaders, opts);
        this.init(loaders, opts);
    }
    init(loaders = [], opts) {
        this.dev = opts?.dev || true;
        this.throwOnUndefined = opts?.throwOnUndefined || false;
        this.trimBlocks = opts?.trimBlocks || false;
        this.lstripBlocks = opts?.lstripBlocks || false;
        this.autoescape = opts?.autoescape || true;
        this.loaders = loaders;
        // It's easy to use precompiled templates: just include them
        // before you configure nunjucks and this will automatically
        // pick it up and use it
        if (typeof window !== 'undefined' && window.nunjucksPrecompiled) {
            this.loaders.unshift(new PrecompiledLoader(window.nunjucksPrecompiled));
        }
        this._initLoaders();
        this.globals = globals();
        this.filters = {};
        this.tests = {};
        // TODO: Running on init before initialized? Surely not used
        _entries(filters).forEach(([name, filter]) => this.addFilter(name, filter));
        // _entries(tests).forEach(([name, test]) => this.addTest(name, test));
    }
    _initLoaders() {
        this.loaders.forEach((loader) => {
            // Caching and cache busting
            loader.cache = {};
            if (typeof loader.on === 'function') {
                loader.on('update', (name, fullname) => {
                    loader.cache[name] = null;
                    this.emit('update', name, fullname, loader);
                });
                loader.on('load', (name, source) => {
                    this.emit('load', name, source, loader);
                });
            }
        });
    }
    invalidateCache() {
        this.loaders.forEach((loader) => {
            loader.cache = {};
        });
    }
    addExtension(name, extension) {
        extension.__name = name;
        this.extensions[name] = extension;
        this.extensionsList.push(extension);
        return this;
    }
    removeExtension(name) {
        var extension = this.getExtension(name);
        if (!extension) {
            return;
        }
        this.extensionsList = without(this.extensionsList, extension);
        delete this.extensions[name];
    }
    getExtension(name) {
        return this.extensions[name];
    }
    hasExtension(name) {
        return !!this.extensions[name];
    }
    addGlobal(name, value) {
        this.globals[name] = value;
        return this;
    }
    getGlobal(name) {
        if (typeof this.globals[name] === 'undefined') {
            throw new Error('global not found: ' + name);
        }
        return this.globals[name];
    }
    addFilter(name, func, async) {
        var wrapped = func;
        if (async) {
            this.asyncFilters.push(name);
        }
        this.filters[name] = wrapped;
        return this;
    }
    getFilter(name) {
        if (!this.filters[name]) {
            throw new Error('filter not found: ' + name);
        }
        return this.filters[name];
    }
    // addTest(name: string, func: Function): Environment {
    // 	this.tests[name] = func;
    // 	return this;
    // }
    // getTest(name: string) {
    // 	if (!this.tests[name]) {
    // 		throw new Error('test not found: ' + name);
    // 	}
    // 	return this.tests[name];
    // }
    resolveTemplate(loader, parentName, filename) {
        let isRelative = loader.isRelative && parentName ? loader.isRelative(filename) : false;
        return isRelative && loader.resolve
            ? loader.resolve(parentName, filename)
            : filename;
    }
    getTemplate(name, eagerCompile, parentName, ignoreMissing, cb) {
        var that = this;
        var tmpl = null;
        if (name && name.raw) {
            // this fixes autoescape for templates referenced in symbols
            name = name.raw;
        }
        if (isFunction(parentName)) {
            cb = parentName;
            parentName = null;
            eagerCompile = eagerCompile || false;
        }
        if (isFunction(eagerCompile)) {
            cb = eagerCompile;
            eagerCompile = false;
        }
        if (name instanceof Template) {
            tmpl = name;
        }
        else if (typeof name !== 'string') {
            throw new Error('template names must be a string: ' + name);
        }
        else {
            for (let i = 0; i < this.loaders.length; i++) {
                const loader = this.loaders[i];
                tmpl = loader.cache[this.resolveTemplate(loader, parentName, name)];
                if (tmpl) {
                    break;
                }
            }
        }
        if (tmpl) {
            if (eagerCompile) {
                tmpl.compile();
            }
            if (cb) {
                cb(null, tmpl);
                return undefined;
            }
            else {
                return tmpl;
            }
        }
        let syncResult;
        const createTemplate = (err, info) => {
            if (!info && !err && !ignoreMissing) {
                err = new Error('template not found: ' + name);
            }
            if (err) {
                if (cb) {
                    cb(err);
                    return;
                }
                else {
                    throw err;
                }
            }
            let newTmpl;
            if (!info) {
                newTmpl = new Template(noopTmplSrc, this, '', eagerCompile);
            }
            else {
                newTmpl = new Template(info.src, this, info.path, eagerCompile);
                if (!info.noCache) {
                    info.loader.cache[name] = newTmpl;
                }
            }
            if (cb) {
                cb(null, newTmpl);
            }
            else {
                syncResult = newTmpl;
            }
        };
        asyncIter(this.loaders, (loader, i, next, done) => {
            function handle(err, src) {
                if (err) {
                    done(err);
                }
                else if (src) {
                    src.loader = loader;
                    done(null, src);
                }
                else {
                    next();
                }
            }
            // Resolve name relative to parentName
            name = that.resolveTemplate(loader, parentName, name);
            if (loader.async) {
                loader.getSource(name, handle);
            }
            else {
                handle(null, loader.getSource(name));
            }
        }, createTemplate);
        return syncResult;
    }
    express(app) {
        return expressApp(this, app);
    }
    render(name, ctx, cb) {
        if (isFunction(ctx)) {
            cb = ctx;
            ctx = null;
        }
        // We support a synchronous API to make it easier to migrate
        // existing code to async. This works because if you don't do
        // anything async work, the whole thing is actually run
        // synchronously.
        let syncResult = null;
        this.getTemplate(name, (err, tmpl) => {
            if (err && cb) {
                callbackAsap(cb, err);
            }
            else if (err) {
                throw err;
            }
            else {
                syncResult = tmpl.render(ctx, cb);
            }
        });
        return syncResult;
    }
    renderString(src, ctx, opts, cb) {
        if (isFunction(opts)) {
            cb = opts;
            opts = {};
        }
        opts = opts || {};
        const tmpl = new Template(src, this, opts.path);
        return tmpl.render(ctx, cb);
    }
    waterfall(tasks, callback, forceAsync) {
        return waterfall(tasks, callback, forceAsync);
    }
}
export class Context extends Obj {
    env = new Environment();
    ctx = {};
    exported = [];
    blocks = {};
    compiled = false;
    init(ctx = {}, blocks = {}, env = new Environment()) {
        this.env = env;
        this.ctx = { ...ctx };
        Object.keys(blocks).forEach((name) => {
            this.addBlock(name, blocks[name]);
        });
    }
    lookup(name) {
        // This is one of the most called functions, so optimize for
        // the typical case where the name isn't in the globals
        if (name in this.env.globals && !(name in this.ctx)) {
            return this.env.globals[name];
        }
        else {
            return this.ctx[name];
        }
    }
    setVariable(name, val) {
        this.ctx[name] = val;
    }
    getVariables() {
        return this.ctx;
    }
    addBlock(name, block) {
        this.blocks[name] = this.blocks[name] || [];
        this.blocks[name].push(block);
        return this;
    }
    getBlock(name) {
        if (!this.blocks[name]) {
            throw new Error('unknown block "' + name + '"');
        }
        return this.blocks[name][0];
    }
    // TODO: fix any here
    getSuper(env, name, block, frame, runtime, cb) {
        var idx = indexOf(this.blocks[name] || [], block);
        var blk = this.blocks[name][idx + 1];
        var context = this;
        if (idx === -1 || !blk) {
            throw new Error('no super block available for "' + name + '"');
        }
        blk(env, context, frame, runtime, cb);
    }
    addExport(name) {
        this.exported.push(name);
    }
    getExported() {
        var exported = {};
        this.exported.forEach((name) => {
            exported[name] = this.ctx[name];
        });
        return exported;
    }
}
export class Template extends Obj {
    env = new Environment();
    tmplProps = {};
    tmplStr = {};
    path = '';
    blocks;
    compiled = false;
    rootRenderFunc;
    init(src, env = new Environment(), path, eagerCompile) {
        this.env = env;
        if (isString(src)) {
            this.tmplStr = src;
        }
        else {
            switch (src.type) {
                case 'code':
                    this.tmplProps = src.obj;
                    break;
                case 'string':
                    this.tmplStr = src.obj;
                    break;
                default:
                    throw new Error(`Unexpected template object type ${src.type}; expected 'code', or 'string'`);
            }
        }
        // else {
        // 	throw new Error(
        // 		'src must be a string or an object describing the source'
        // 	);
        // }
        this.path = path;
        if (eagerCompile) {
            try {
                this._compile();
            }
            catch (err) {
                throw _prettifyError(this.path, this.env.dev, err);
            }
        }
        else {
            this.compiled = false;
        }
    }
    render(ctx, parentFrame, cb) {
        if (typeof ctx === 'function') {
            cb = ctx;
            ctx = {};
        }
        else if (typeof parentFrame === 'function') {
            cb = parentFrame;
            parentFrame = null;
        }
        // If there is a parent frame, we are being called from internal
        // code of another template, and the internal system
        // depends on the sync/async nature of the parent template
        // to be inherited, so force an async callback
        const forceAsync = !parentFrame;
        // Catch compile errors for async rendering
        try {
            this.compile();
        }
        catch (e) {
            const err = _prettifyError(this.path, this.env.dev, e);
            if (cb) {
                return callbackAsap(cb, err);
            }
            else {
                throw err;
            }
        }
        const context = new Context(ctx || {}, this.blocks, this.env);
        const frame = parentFrame ? parentFrame.push(true) : new Frame();
        frame.topLevel = true;
        let syncResult = null;
        let didError = false;
        // @ts-ignore
        this.rootRenderFunc(this.env, context, frame, runtime, (err, res) => {
            // TODO: this is actually a bug in the compiled template (because waterfall
            // tasks are both not passing errors up the chain of callbacks AND are not
            // causing a return from the top-most render function). But fixing that
            // will require a more substantial change to the compiler.
            if (didError && cb && typeof res !== 'undefined') {
                // prevent multiple calls to cb
                return;
            }
            if (err) {
                err = _prettifyError(this.path, this.env.dev, err);
                didError = true;
            }
            if (cb) {
                if (forceAsync) {
                    callbackAsap(cb, err, res);
                }
                else {
                    cb(err, res);
                }
            }
            else {
                if (err) {
                    throw err;
                }
                syncResult = res;
            }
        });
        return syncResult;
    }
    getExported(ctx, parentFrame, cb) {
        // eslint-disable-line consistent-return
        if (typeof ctx === 'function') {
            cb = ctx;
            ctx = {};
        }
        if (typeof parentFrame === 'function') {
            cb = parentFrame;
            parentFrame = null;
        }
        // Catch compile errors for async rendering
        try {
            this.compile();
        }
        catch (e) {
            if (cb) {
                return cb(e);
            }
            else {
                throw e;
            }
        }
        const frame = parentFrame ? parentFrame.push() : new Frame();
        frame.topLevel = true;
        // Run the rootRenderFunc to populate the context with exported vars
        const context = new Context(ctx || {}, this.blocks, this.env);
        this.rootRenderFunc(this.env, context, frame, runtime, (err) => {
            if (err) {
                cb(err, null);
            }
            else {
                cb(null, context.getExported());
            }
        });
    }
    compile() {
        if (!this.compiled) {
            this._compile();
        }
    }
    _compile() {
        var props;
        if (this.tmplProps) {
            props = this.tmplProps;
        }
        else {
            const source = compiler.compile(this.tmplStr, this.env.asyncFilters, this.env.extensionsList, this.path, {});
            const func = new Function(source); // eslint-disable-line no-new-func
            props = func();
        }
        this.blocks = this._getBlocks(props);
        this.rootRenderFunc = props.root;
        this.compiled = true;
    }
    _getBlocks(props) {
        var blocks = {};
        Object.keys(props).forEach((k) => {
            if (k.slice(0, 2) === 'b_') {
                blocks[k.slice(2)] = props[k];
            }
        });
        return blocks;
    }
}
export default {
    Environment: Environment,
    Template: Template,
};
