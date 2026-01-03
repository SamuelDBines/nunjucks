import EventEmitter from 'events';
import {
	without,
	isFunction,
	asyncIter,
	_prettifyError,
	isString,
	isObject,
} from './lib';
import * as compiler from './compiler';
import * as filters from './filters';
import {
	Loader,
	FileSystemLoader,
	WebLoader,
	PrecompiledLoader,
} from './loader';

import globals from './globals';
import { Obj } from './loader';
import runtime from './runtime';
import { Asap, Callback } from './types';
import expressApp from './express-app';

const { handleError, Frame } = runtime;

function waterfall(tasks, done, forceAsync: any) {
	let i = 0;
	function next(err, res) {
		if (err) return done(err);
		const task = tasks[i++];
		if (!task) return done(null, res);

		// first task: (cb), others: (res, cb)
		if (task.length <= 1) task(next);
		else task(res, next);
	}

	next(null, undefined);
}

// TODO: temporary fix
declare global {
	interface Window {
		nunjucksPrecompiled?: any;
	}
}

export const asap: Asap =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: (fn) => {
				Promise.resolve().then(fn);
		  };

export function callbackAsap<E, R>(
	cb: Callback<E, R>,
	err: E | null,
	res?: R
): void {
	asap(() => cb(err, res));
}

const noopTmplSrc = {
	type: 'code',
	obj: {
		root(
			env: Environment,
			context: Context,
			frame: typeof Frame,
			runtime: typeof runtime,
			cb: Callback
		) {
			try {
				cb(null, '');
			} catch (e) {
				cb(handleError(e, null, null));
			}
		},
	},
};

interface IEnvironmentOpts {
	throwOnUndefined: boolean;
	autoescape: boolean;
	trimBlocks: boolean;
	lstripBlocks: boolean;
	dev: boolean;
}

export class Environment extends EventEmitter {
	throwOnUndefined: boolean = false;
	trimBlocks: boolean = false;
	lstripBlocks: boolean = false;
	dev: boolean = true;
	autoescape: boolean = true;
	loaders: Loader[] = [new FileSystemLoader(['views'])];
	asyncFilters: string[] = [];
	ctx?: Context;

	// TODO: figure out types here

	extensionsList: any[] = [];
	extensions: Record<string, any> = {};
	filters: Record<string, any> = {};
	cache: Record<string, any> = {};
	tests: Record<string, any> = {};
	globals: any;
	constructor(loaders: Loader[] = [], opts?: IEnvironmentOpts) {
		super();
		this.init(loaders, opts);
	}

	init(loaders: Loader[] = [], opts?: IEnvironmentOpts) {
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
		Object.entries(filters).forEach(([name, filter]) =>
			this.addFilter(name, filter)
		);
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

	addExtension(name: string, extension: Record<string, any>) {
		extension.__name = name;
		this.extensions[name] = extension;
		this.extensionsList.push(extension);
		return this;
	}

	removeExtension(name: string) {
		var extension = this.getExtension(name);
		if (!extension) {
			return;
		}

		this.extensionsList = without(this.extensionsList, extension);
		delete this.extensions[name];
	}

	getExtension(name: string) {
		return this.extensions[name];
	}

	hasExtension(name: string): boolean {
		return !!this.extensions[name];
	}

	addGlobal(name: string, value: any): Environment {
		this.globals[name] = value;
		return this;
	}

	getGlobal(name: string) {
		if (typeof this.globals[name] === 'undefined') {
			throw new Error('global not found: ' + name);
		}
		return this.globals[name];
	}

	addFilter(name: string, func: Function, async?: any[]) {
		var wrapped = func;

		if (async) {
			this.asyncFilters.push(name);
		}
		this.filters[name] = wrapped;
		return this;
	}

	getFilter(name: string) {
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

	resolveTemplate(loader: Loader, parentName: string, filename: string) {
		let isRelative =
			loader.isRelative && parentName ? loader.isRelative(filename) : false;
		return isRelative && loader.resolve
			? loader.resolve(parentName, filename)
			: filename;
	}

	getTemplate(
		name: any,
		eagerCompile: any,
		parentName?: string | null,
		ignoreMissing?: boolean,
		cb?: Callback
	) {
		var that = this;
		var tmpl = null;
		if (name && name.raw) {
			// this fixes autoescape for templates referenced in symbols
			name = name.raw;
		}

		if (isFunction(parentName)) {
			cb = parentName as any;
			parentName = null;
			eagerCompile = eagerCompile || false;
		}

		if (isFunction(eagerCompile)) {
			cb = eagerCompile;
			eagerCompile = false;
		}

		if (name instanceof Template) {
			tmpl = name;
		} else if (typeof name !== 'string') {
			throw new Error('template names must be a string: ' + name);
		} else {
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
			} else {
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
				} else {
					throw err;
				}
			}
			let newTmpl;
			if (!info) {
				newTmpl = new Template(noopTmplSrc, this, '', eagerCompile);
			} else {
				newTmpl = new Template(info.src, this, info.path, eagerCompile);
				if (!info.noCache) {
					info.loader.cache[name] = newTmpl;
				}
			}
			if (cb) {
				cb(null, newTmpl);
			} else {
				syncResult = newTmpl;
			}
		};

		asyncIter(
			this.loaders,
			(loader, i, next, done) => {
				function handle(err, src) {
					if (err) {
						done(err);
					} else if (src) {
						src.loader = loader;
						done(null, src);
					} else {
						next();
					}
				}

				// Resolve name relative to parentName
				name = that.resolveTemplate(loader, parentName, name);

				if (loader.async) {
					loader.getSource(name, handle);
				} else {
					handle(null, loader.getSource(name));
				}
			},
			createTemplate
		);

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
			} else if (err) {
				throw err;
			} else {
				syncResult = tmpl.render(ctx, cb);
			}
		});

		return syncResult;
	}

	renderString(src: any[], ctx: Context, opts: any, cb?: Callback) {
		if (isFunction(opts)) {
			cb = opts;
			opts = {};
		}
		opts = opts || {};

		const tmpl: any = new Template(src, this, opts.path);
		return tmpl.render(ctx, cb);
	}

	get typename(): string {
		return this.constructor.name;
	}

	static extend(
		name: string,
		props?: {
			fields: string[];
			init?: (...args: any[]) => void;
		}
	) {
		if (typeof name === 'object') {
			props = name;
			name = 'anonymous';
		}
		return extendClass(this, name, props);
	}

	waterfall(tasks: any, callback: Callback, forceAsync: any) {
		return waterfall(tasks, callback, forceAsync);
	}
}

export class Context {
	extname?: string;
	__typename?: string;
	exported: any[] = [];
	compiled: boolean = false;
	constructor(
		public ctx: Record<string, any> = {},
		public blocks: Record<string, any> = {},
		public env = new Environment(),
		public lineno: number,
		public colno: number
	) {
		this.ctx = { ...ctx };

		Object.keys(blocks).forEach((name) => {
			this.addBlock(name, blocks[name]);
		});
	}

	get typename(): string {
		return 'Context';
	}

	lookup(name: string) {
		// This is one of the most called functions, so optimize for
		// the typical case where the name isn't in the globals
		if (name in this.env.globals && !(name in this.ctx)) {
			return this.env.globals[name];
		} else {
			return this.ctx[name];
		}
	}

	setVariable(name: string, val: any) {
		this.ctx[name] = val;
	}

	getVariables() {
		return this.ctx;
	}

	addBlock(name: string, block) {
		this.blocks[name] = this.blocks[name] || [];
		this.blocks[name].push(block);
		return this;
	}

	getBlock(name: string) {
		if (!this.blocks[name]) {
			throw new Error('unknown block "' + name + '"');
		}

		return this.blocks[name][0];
	}

	// TODO: fix any here
	getSuper(
		env: Environment,
		name: string,
		block: any,
		frame: any,
		runtime: any,
		cb: Callback
	) {
		var idx = (this.blocks[name] || []).indexOf(block);
		var blk = this.blocks[name][idx + 1];
		var context = this;

		if (idx === -1 || !blk) {
			throw new Error('no super block available for "' + name + '"');
		}

		blk(env, context, frame, runtime, cb);
	}

	addExport(name: string) {
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

type ITemplateSrc = { type: 'code' | 'string'; obj: any };
export class Template {
	env: Environment = new Environment();
	tmplProps: Record<string, any> = {};
	tmplStr: string | Record<string, any> = {};
	path: string = '';
	blocks: any;
	compiled: boolean = false;
	rootRenderFunc: any;
	constructor(
		src: ITemplateSrc | string,
		env = new Environment(),
		path: string,
		eagerCompile: any,
		public lineno: number,
		public colno: number
	) {
		this.env = env;

		if (isString(src)) {
			this.tmplStr = src;
		} else {
			switch (src.type) {
				case 'code':
					this.tmplProps = src.obj;
					break;
				case 'string':
					this.tmplStr = src.obj;
					break;
				default:
					throw new Error(
						`Unexpected template object type ${src.type}; expected 'code', or 'string'`
					);
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
			} catch (err: any) {
				throw _prettifyError(this.path, this.env.dev, err);
			}
		} else {
			this.compiled = false;
		}
	}

	render(ctx: any, parentFrame?: any, cb?: Callback) {
		if (typeof ctx === 'function') {
			cb = ctx;
			ctx = {};
		} else if (typeof parentFrame === 'function') {
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
		} catch (e) {
			const err = _prettifyError(this.path, this.env.dev, e);
			if (cb) {
				return callbackAsap(cb, err);
			} else {
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
				} else {
					cb(err, res);
				}
			} else {
				if (err) {
					throw err;
				}
				syncResult = res;
			}
		});

		return syncResult;
	}

	getExported(ctx: any, parentFrame: any, cb: Callback) {
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
		} catch (e) {
			if (cb) {
				return cb(e);
			} else {
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
			} else {
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
		} else {
			const source = compiler.compile(
				this.tmplStr as string,
				this.env.asyncFilters,
				this.env.extensionsList,
				this.path,
				{}
			);

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
