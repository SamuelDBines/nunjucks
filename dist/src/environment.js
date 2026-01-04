"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = exports.Context = exports.Environment = void 0;
const events_1 = __importDefault(require("events"));
const lib_1 = require("./lib");
const compiler = __importStar(require("./compiler"));
const filters = __importStar(require("./filters"));
const loader_1 = require("./loader");
const globals_1 = require("./globals");
const runtime_1 = require("./runtime");
const express_app_1 = require("./express-app");
const runtime = __importStar(require("./runtime"));
// const rootHelper: RootRenderFunctionProps = (cb) => (env, context, frame, runtime, cb) => {
// 	try {
// 		cb(null, 'hello');
// 	} catch (e) {
// 		cb(e, null);
// 	}
// };
const root = (env, context, frame, runtime, cb) => {
    try {
        cb(null, 'hello');
    }
    catch (e) {
        cb(e, null);
    }
};
const noopTmplSrc = {
    type: 'code',
    obj: {
        root: root,
    },
};
class Environment extends events_1.default {
    throwOnUndefined = false;
    trimBlocks = false;
    lstripBlocks = false;
    dev = true;
    autoescape = true;
    loaders = [new loader_1.FileSystemLoader(['views'])];
    asyncFilters = [];
    ctx;
    // TODO: figure out types here
    extensionsList = [];
    extensions = {};
    filters = {};
    cache = {};
    globals;
    constructor(opts) {
        super();
        this.dev = opts?.dev || true;
        this.throwOnUndefined = opts?.throwOnUndefined || false;
        this.trimBlocks = opts?.trimBlocks || false;
        this.lstripBlocks = opts?.lstripBlocks || false;
        this.autoescape = opts?.autoescape || true;
        this.loaders = opts?.loaders || [new loader_1.FileSystemLoader(['views'])];
        if (typeof window !== 'undefined' && window.nunjucksPrecompiled) {
            this.loaders.unshift(new loader_1.PrecompiledLoader(window.nunjucksPrecompiled));
        }
        this._initLoaders();
        this.globals = (0, globals_1.globals)();
        this.filters = {};
        // TODO: Running on init before initialized? Surely not used
        Object.entries(filters).forEach(([name, filter]) => this.addFilter(name, filter));
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
        this.extensionsList?.push(extension);
        return this;
    }
    removeExtension(name) {
        var extension = this.getExtension(name);
        if (!extension) {
            return;
        }
        this.extensionsList = (0, lib_1.without)(this.extensionsList, extension);
        delete this.extensions[name];
    }
    getExtension(name) {
        return this.extensions[name];
    }
    hasExtension(name) {
        return !!this.extensions[name];
    }
    addFilter(name, func, async) {
        var wrapped = func;
        if (async) {
            this.asyncFilters?.push(name);
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
    resolveTemplate(loader, parentName, filename) {
        let isRelative = loader.isRelative && parentName ? loader.isRelative(filename) : false;
        return isRelative && loader.resolve
            ? loader.resolve(parentName, filename)
            : filename;
    }
    getTemplate(name, cb, opts) {
        lib_1.p.log('Getting template');
        let that = this;
        let tmpl = null;
        const parentName = opts?.parentName || null;
        const eagerCompile = opts?.eagerCompile || false;
        const ignoreMissing = opts?.ignoreMissing || false;
        if (name && name.raw) {
            name = name.raw;
        }
        if (name instanceof Template) {
            tmpl = name;
        }
        else if (!(0, lib_1.isString)(name)) {
            throw new Error('template names must be a string: ' + name);
        }
        else {
            for (let i = 0; i < this.loaders?.length; i++) {
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
                return;
            }
            return tmpl;
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
                throw err;
            }
            const newTmpl = new Template(info?.src || noopTmplSrc, this, info.path || '', eagerCompile);
            if (!info.noCache) {
                info.loader.cache[name] = newTmpl;
            }
            if (cb) {
                cb(null, newTmpl);
            }
            else {
                syncResult = newTmpl;
            }
        };
        (0, lib_1.asyncIter)(this.loaders, (loader, _i, next, done) => {
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
        return (0, express_app_1.express)(this, app);
    }
    render(name, ctx, cb) {
        lib_1.p.warn('TRYING TO RENDER', ctx);
        if ((0, lib_1.isFunction)(ctx)) {
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
                cb(err);
            }
            else if (err) {
                throw err;
            }
            else {
                lib_1.p.log('Getting template');
                syncResult = tmpl.render(ctx, cb);
            }
        });
        // p.log('ALREADY RETURNED', syncResult);
        // return syncResult;
    }
    renderString(src, ctx, opts, cb) {
        if ((0, lib_1.isFunction)(opts)) {
            cb = opts;
            opts = {};
        }
        opts = opts || {};
        return new Template(src, this, opts.path).render(ctx, cb);
    }
    get typename() {
        return this.constructor.name;
    }
    waterfall(tasks, callback, forceAsync) {
        return function waterfall(tasks, done) {
            let i = 0;
            function next(err, res) {
                if (err) {
                    lib_1.p.err(err);
                    return done(err);
                }
                const task = tasks[i++];
                if (!task)
                    return done(null, res);
                // first task: (cb), others: (res, cb)
                if (task?.length <= 1)
                    task(next);
                else
                    task(res, next);
            }
            next(null, undefined);
        };
    }
}
exports.Environment = Environment;
class Context {
    ctx;
    blocks;
    env;
    lineno;
    colno;
    exported = [];
    compiled = false;
    constructor(ctx = {}, blocks = {}, env = new Environment(), lineno = 0, colno = 0) {
        this.ctx = ctx;
        this.blocks = blocks;
        this.env = env;
        this.lineno = lineno;
        this.colno = colno;
        this.ctx = { ...ctx };
        Object.keys(blocks).forEach((name) => {
            this.addBlock(name, blocks[name]);
        });
    }
    get typename() {
        return 'Context';
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
        lib_1.p.warn('\nBlocks added are: ', this.blocks[name], block);
        if (typeof this.blocks[name]?.push === 'function')
            this.blocks[name]?.push(block);
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
        var idx = (this.blocks[name] || []).indexOf(block);
        var blk = this.blocks[name][idx + 1];
        var context = this;
        if (idx === -1 || !blk) {
            throw new Error('no super block available for "' + name + '"');
        }
        blk(env, context, frame, runtime, cb);
    }
    addExport(name) {
        this.exported?.push(name);
    }
    getExported() {
        var exported = {};
        this.exported.forEach((name) => {
            exported[name] = this.ctx[name];
        });
        return exported;
    }
}
exports.Context = Context;
class Template {
    lineno;
    colno;
    env = new Environment();
    tmplProps;
    tmplStr = {};
    path = '';
    blocks;
    compiled = false;
    rootRenderFunction;
    constructor(src, env = new Environment(), path, eagerCompile, lineno = 0, colno = 0) {
        this.lineno = lineno;
        this.colno = colno;
        this.env = env;
        if ((0, lib_1.isString)(src)) {
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
                    lib_1.p.err(src);
                    throw new Error(`Unexpected template object type ${src.type}; expected 'code', or 'string'`);
            }
        }
        this.path = path;
        if (eagerCompile) {
            try {
                this._compile();
            }
            catch (err) {
                throw (0, lib_1._prettifyError)(this.path, this.env.dev, err);
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
            lib_1.p.log('Parent frame set as cb');
            cb = parentFrame;
            parentFrame = null;
        }
        // If there is a parent frame, we are being called from internal
        // code of another template, and the internal system
        // depends on the sync/async nature of the parent template
        // to be inherited, so force an async callback
        // Catch compile errors for async rendering
        try {
            this.compile();
        }
        catch (e) {
            const err = (0, lib_1._prettifyError)(this.path, this.env.dev, e);
            if (cb) {
                return cb(err);
            }
            else {
                throw err;
            }
        }
        const context = new Context(ctx || {}, this.blocks, this.env);
        const frame = parentFrame ? parentFrame?.push(true) : new runtime_1.Frame();
        frame.topLevel = true;
        let syncResult = null;
        let didError = false;
        // p.log(
        // 	'Before setup: ',
        // 	this.env,
        // 	'\nctx:',
        // 	context,
        // 	'\nFrame: ',
        // 	frame,
        // 	'\nRuntime: ',
        // 	runtime
        // );
        // p.log(this.env, context, frame, runtime);
        if (!this.rootRenderFunction)
            this.rootRenderFunction = root;
        this.rootRenderFunction(this.env, context, frame, runtime, (err, res) => {
            // TODO: this is actually a bug in the compiled template (because waterfall
            // tasks are both not passing errors up the chain of callbacks AND are not
            // causing a return from the top-most render function). But fixing that
            // will require a more substantial change to the compiler.
            // if (cb && typeof res !== 'undefined') {
            // 	// prevent multiple calls to cb
            // 	p.log('SOMEHOW HERE');
            // 	resolve('Somehow here');
            // 	return;
            // }
            if (didError && cb && typeof res !== 'undefined') {
                // prevent multiple calls to cb
                return;
            }
            if (err) {
                lib_1.p.err('err: ', err);
                err = (0, lib_1._prettifyError)(this.path, this.env.dev, err);
                cb(err);
                didError = true;
                return;
            }
            if (cb) {
                cb(err, res);
            }
            else {
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
        const frame = parentFrame ? parentFrame?.push() : new runtime_1.Frame();
        frame.topLevel = true;
        // Run the rootRenderFunc to populate the context with exported vars
        const context = new Context(ctx || {}, this.blocks, this.env);
        // p.log(
        // 	'Before setup: ',
        // 	this.env,
        // 	'\nctx:',
        // 	context,
        // 	'\nFrame: ',
        // 	frame,
        // 	'\nRuntime: ',
        // 	runtime
        // );
        // p.log('rootRenderFunc: ', this.rootRenderFunc);
        if (!this.rootRenderFunction)
            this.rootRenderFunction = root;
        lib_1.p.err('rootRenderFunction', this.rootRenderFunction);
        this.rootRenderFunction(this.env, context, frame, runtime, (err) => {
            if (err) {
                cb(err, null);
            }
            else {
                cb(null, context.getExported());
            }
        });
    }
    compile() {
        if (!this.compiled)
            this._compile();
    }
    _compile() {
        let props;
        if (this.tmplProps) {
            lib_1.p.log('tmplProps is: ', this.tmplProps);
            props = this.tmplProps;
        }
        else {
            const source = compiler.compile(this.tmplStr, this.env.asyncFilters, this.env.extensionsList, this.path, {});
            lib_1.p.log('Source is: ', source);
            const func = new Function(source); // eslint-disable-line no-new-func
            props = func();
        }
        this.blocks = this._getBlocks(props);
        lib_1.p.log('Props root render function: ', props, props.root);
        this.rootRenderFunction = props.root;
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
exports.Template = Template;
