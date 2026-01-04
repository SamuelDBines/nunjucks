//TODO: Sun 4th Jan 2026 
import EventEmitter from 'events';
import {
	without,
	isFunction,
	asyncIter,
	_prettifyError,
	isString,
	TemplateErr,
	p,
} from './lib';
import * as compiler from './compiler';
import * as filters from './filters';
import { Loader, FileSystemLoader, PrecompiledLoader } from './loader';

import { globals, IGlobals } from './globals';
import { Frame } from './runtime';
import { Callback } from './types';
import { express as expressApp } from './express-app';
import * as runtime from './runtime';

// TODO: temporary fix
declare global {
	interface Window {
		nunjucksPrecompiled?: any;
	}
}

type RootRenderFunctionProps = (
	env: Environment,
	context: Context,
	frame: typeof Frame,
	_runtime: typeof runtime,
	cb: Callback
) => void;

type getTemplateOps = {
	eagerCompile?: boolean;
	parentName?: string | null;
	ignoreMissing?: boolean;
};

type TemplateInfo = { src: string; path: string; noCache?: boolean; loader: any };

// const rootHelper: RootRenderFunctionProps = (cb) => (env, context, frame, runtime, cb) => {
// 	try {
// 		cb(null, 'hello');
// 	} catch (e) {
// 		cb(e, null);
// 	}
// };
const root: RootRenderFunctionProps = (env, context, frame, runtime, cb) => {
	try {
		cb(null, 'hello');
	} catch (e) {
		cb(e, null);
	}
};

const noopTmplSrc: ITemplateSrc = {
	type: 'code',
	obj: {
		root: root,
	},
};

interface IEnvironmentOpts {
	path?: string;
	throwOnUndefined?: boolean;
	autoescape?: boolean;
	trimBlocks?: boolean;
	lstripBlocks?: boolean;
	dev?: boolean;
	loaders?: Loader[];
}

export class Environment extends EventEmitter {
	//State
	ctx?: Context;
	globals?: IGlobals;
	throwOnUndefined: boolean = false;
	trimBlocks: boolean = false;
	lstripBlocks: boolean = false;
	dev: boolean = true;
	autoescape: boolean = true;
	loaders: Loader[] = [new FileSystemLoader(['views'])];
	asyncFilters: string[] = [];
	path: string;


	// TODO: figure out types here

	extensionsList: any[] = [];
	extensions: Record<string, any> = {};
	filters: Record<string, any> = {}; //typeof filters to set later
	cache: Record<string, any> = {};

	constructor(opts?: IEnvironmentOpts) {
		super();
		this.path = opts?.path || 'views'
		this.dev = opts?.dev || true;
		this.throwOnUndefined = opts?.throwOnUndefined || false;
		this.trimBlocks = opts?.trimBlocks || false;
		this.lstripBlocks = opts?.lstripBlocks || false;
		this.autoescape = opts?.autoescape || true;
		this.loaders = opts?.loaders || [new FileSystemLoader([this.path])];

		if (typeof window !== 'undefined' && window.nunjucksPrecompiled) {
			this.loaders.unshift(new PrecompiledLoader(window.nunjucksPrecompiled));
		}

		this._initLoaders();

		this.globals = globals();
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
		this.extensionsList?.push(extension);
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

	addFilter(name: string, func: Function, async?: any[]) {
		if (async) {
			this.asyncFilters?.push(name);
		}
		this.filters[name] = func;
		return this;
	}

	getFilter(name: string) {
		if (!this.filters[name]) {
			p.err('filter not found: ' + name)
			throw new Error('filter not found: ' + name);
		}
		return this.filters[name];
	}

	resolveTemplate(loader: Loader, parentName: string, filename: string) {
		let isRelative =
			loader.isRelative && parentName ? loader.isRelative(filename) : false;
		p.warn('Is relative: ', isRelative, parentName, loader, '\n',loader.typename)
		return isRelative && loader.resolve
			? loader.resolve(parentName, filename)
			: filename;
	}

	getTemplateInfo(
		name: string,
		opts?: getTemplateOps,
		cb?: (err: any, info?: TemplateInfo | null) => void
	):  TemplateInfo | undefined  {
		const parentName = opts?.parentName || null;
		const ignoreMissing = opts?.ignoreMissing || false;
		const that = this;
		let syncResult: TemplateInfo | undefined;
		const done = (err: any, info?: any) => {
			if (!info && !err && !ignoreMissing) err = new Error("template not found: " + name);
			if (err) {
				if (cb) return cb(err);
				throw err;
			}
			const out: TemplateInfo = { src: info.src, path: info.path || "", noCache: info.noCache, loader: info.loader };
			if (cb) cb(null, out);
			else syncResult = out;
		};

		asyncIter(
			this.loaders,
			(loader, _i, next, finish) => {
				function handle(err: any, src: any) {
					if (err) finish(err);
					else if (src) {
						src.loader = loader;
						finish(null, src);
					} else next();
				}
				const resolved = that.resolveTemplate(loader, parentName, name);
				if (loader.async) loader.getSource(resolved, handle);
				else handle(null, loader.getSource(resolved));
			},
			done
		);
		return syncResult;
	}

	getTemplate(name: any, cb?: Callback, opts?: getTemplateOps) {
		p.log('Getting template');
		let that = this;
		let tmpl = null;
		const parentName = opts?.parentName || null;
		p.err('Parent name is: ', parentName, name)
		const eagerCompile = opts?.eagerCompile || false;
		const ignoreMissing = opts?.ignoreMissing || false;
		if (name && name.raw) {
			name = name.raw;
		}

		if (name instanceof Template) {
			tmpl = name;
		} else if (!isString(name)) {
			p.err('template names must be a string: ' + name)
			throw new Error('template names must be a string: ' + name);
		} else {
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
		const createTemplate = (err: any, info) => {
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
			const newTmpl = new Template(
				info?.src || noopTmplSrc,
				this,
				info.path || '',
				eagerCompile
			);
			if (!info.noCache) {
				info.loader.cache[name] = newTmpl;
			}

			if (cb) {
				cb(null, newTmpl);
			} else {
				syncResult = newTmpl;
			}
		};

		asyncIter(
			this.loaders,
			(loader, _i, next, done) => {

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
				name = that.resolveTemplate(loader, parentName, name);
				p.log('Name is: ',  name, parentName, loader)
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

	render(name: string, ctx: any, cb?: Callback) {
		p.warn('TRYING TO RENDER', ctx);
		if (isFunction(ctx)) {
			cb = ctx;
			ctx = null;
		}

		// We support a synchronous API to make it easier to migrate
		// existing code to async. This works because if you don't do
		// anything async work, the whole thing is actually run
		// synchronously.
		let syncResult = null;

		this.getTemplate(name, (err: TemplateErr, tmpl: any) => {
			if (err && cb) {
				cb(err);
			} else if (err) {
				throw err;
			} else {
				p.log('Getting template');
				syncResult = tmpl.render(ctx, cb);
			}
		});
		// p.log('ALREADY RETURNED', syncResult);

		// return syncResult;
	}

	renderString(src: any, ctx: any, opts: any, cb?: Callback) {
		if (isFunction(opts)) {
			cb = opts;
			opts = {};
		}
		opts = opts || {};

		return new Template(src, this, opts.path).render(ctx, cb);
	}

	get typename(): string {
		return this.constructor.name;
	}

	waterfall(tasks: any, callback: Callback, forceAsync: any) {
		return function waterfall(tasks, done: Callback) {
			let i = 0;
			function next(err, res) {
				if (err) {
					p.err(err);
					return done(err);
				}
				const task = tasks[i++];
				if (!task) return done(null, res);

				// first task: (cb), others: (res, cb)
				if (task?.length <= 1) task(next);
				else task(res, next);
			}

			next(null, undefined);
		};
	}
}

export class Context {
	exported: any[] = [];
	compiled: boolean = false;

	constructor(
		public ctx: Record<string, any> = {},
		public blocks: Record<string, any> = {},
		public env = new Environment(),
		public lineno: number = 0,
		public colno: number = 0
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
			p.debug('ctx local:', this.ctx, name);
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
		p.warn('\nBlocks added are: ', this.blocks[name], block);
		if (typeof this.blocks[name]?.push === 'function')
			this.blocks[name]?.push(block);
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

type ITemplateSrc = { type: 'code' | 'string'; obj: any };
export class Template {
	env: Environment = new Environment();
	tmplProps?: Record<string, any>;
	tmplStr: string | Record<string, any> = {};
	path: string = '';
	blocks: any;
	compiled: boolean = false;
	rootRenderFunction: any;
	constructor(
		src: ITemplateSrc | string,
		env = new Environment(),
		path: string,
		eagerCompile?: any,
		public lineno: number = 0,
		public colno: number = 0
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
					p.err(src);
					throw new Error(
						`Unexpected template object type ${src.type}; expected 'code', or 'string'`
					);
			}
		}
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
			p.log('Parent frame set as cb');
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
		} catch (e) {
			const err = _prettifyError(this.path, this.env.dev, e);
			if (cb) {
				return cb(err);
			} else {
				throw err;
			}
		}

		const context = new Context(ctx || {}, this.blocks, this.env);
		const frame = parentFrame ? parentFrame?.push(true) : new Frame();
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
		if (!this.rootRenderFunction) this.rootRenderFunction = root;
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
				p.err('err: ', err);
				err = _prettifyError(this.path, this.env.dev, err as TemplateErr);
				cb(err);
				didError = true;
				return;
			}

			if (cb) {
				cb(err, res);
			} else {
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

		const frame = parentFrame ? parentFrame?.push() : new Frame();
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
		if (!this.rootRenderFunction) this.rootRenderFunction = root;
		p.err('rootRenderFunction', this.rootRenderFunction);
		this.rootRenderFunction(this.env, context, frame, runtime, (err) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, context.getExported());
			}
		});
	}

	compile() {
		if (!this.compiled) this._compile();
	}

	_compile() {
		let props;

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
			p.log('Source is: ', source);

			const func = new Function(source); // eslint-disable-line no-new-func
			props = func();
		}

		this.blocks = this._getBlocks(props);
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
