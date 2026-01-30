//TODO: Sun 4th Jan 2026 
import _path from 'node:path'
import EventEmitter from 'events';
import {
	without,
	isFunction,
	isString,
	TemplateErr,
	p,
} from './lib';
import * as filters from '../src/filters';
import { Loader, FileSystemLoader, PrecompiledLoader, LoaderEnum } from './loader';
import { Context } from './context';
import { Template } from './template'

import { globals, IGlobals } from './globals';
import { Frame } from './frame';
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

type ITemplateSrc = { type: LoaderEnum; obj: any };

const noopTmplSrc: ITemplateSrc = {
	type: LoaderEnum.default,
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
	ext?: string;
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
	path: string;
	ext?: string;

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
		this.ext = opts?.ext || '.njk'

		if (typeof window !== 'undefined' && window.nunjucksPrecompiled) {
			this.loaders.unshift(new PrecompiledLoader(window.nunjucksPrecompiled));
		}

		this._initLoaders();

		this.globals = globals();
		// TODO: Running on init before initialized? Surely not used
		Object.entries(filters).forEach(([name, filter]) =>
			this.addFilter(name, filter)
		);
		p.log('Filters', filters)
	}

	_initLoaders() {
		this.loaders.forEach((loader) => {
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

	// addExtension(name: string, extension: Record<string, any>) {
	// 	extension.__name = name;
	// 	this.extensions[name] = extension;
	// 	this.extensionsList?.push(extension);
	// 	return this;
	// }

	// removeExtension(name: string) {
	// 	var extension = this.getExtension(name);
	// 	if (!extension) {
	// 		return;
	// 	}

	// 	this.extensionsList = without(this.extensionsList, extension);
	// 	delete this.extensions[name];
	// }

	getExtension(name: string) {
		return this.extensions[name];
	}

	// hasExtension(name: string): boolean {
	// 	return !!this.extensions[name];
	// }

	addFilter(name: string, func: Function) {
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

		this.loaders.forEach((loader, i) => {
			try {	
				const resolved = this.resolveTemplate(loader, parentName, name);
				const src = loader.getSource(resolved)
				done(null, src)
			} catch(err) {
				p.err('getTemplateInfo', err)
				done(err)
			}
		})
		return syncResult;
	}

	getTemplate(name: string | any, cb?: Callback, opts?: getTemplateOps) {
		let tmpl = null;
		const parentName = opts?.parentName || null;
		const eagerCompile = opts?.eagerCompile || false;
		const ignoreMissing = opts?.ignoreMissing || false;
		if (name && name.raw) {
			name = name.raw;
		}
		if(!_path.extname(name)){
			name = name + this.ext
		}

		p.log('name', name )

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
			p.log('Info',info, 'err', err)
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
		this.loaders.forEach((loader, i) => {
			name = this.resolveTemplate(loader, parentName, name);
			try {
				const src = loader.getSource(name);
				console.log(src)
				src.loader = loader	
				p.log('Src ', src)
				createTemplate(null, src);
				// else next()
				
			} catch(err) {
				p.err('environment-','AsyncIter: ',err)
				createTemplate(err, null)
			}
		})

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

		this.getTemplate(name, (err: TemplateErr, tmpl: Template) => {
			if (err) {
				cb(err);
			} else {
				syncResult = tmpl.render(ctx, cb);
			}
		});
		// p.log('ALREADY RETURNED', syncResult);

		return syncResult;
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

}