// TODO: Sun 4th Jan 2026 WebLoader ideas [WebLoader - ]
import path from 'path';
import fs from 'node:fs';
import EventEmitter from 'events';
import { p } from './lib';

export enum LoaderEnum {
	'default' = 'default',
	'file' = 'file',
	// 'web', 
	'memory' = 'memory',
	'precompiled' = 'precompiled',
	
}

export enum LoaderTypename {
	'File',
	// 'web', 
	'Memory',
	'Precompiled',
	'Default'
}

export interface ILoaderOpts {
	watch: boolean;
	noCache: boolean;
}

export type LoaderSrcType = {	
	type: LoaderEnum;
	obj?: string;
};

export type LoaderSrcCompiled = {
	loader?: Loader
	src: LoaderSrcType;
	path: string;
	noCache: boolean;
}

export interface ILoader {
	watch: boolean;
	noCache: boolean;
	cache: Record<string, any>;
	typename: LoaderTypename;
	resolve: (from: string, to: string) => string;
	isRelative: (filename: string) => boolean;
	getSource: (name: string) => LoaderSrcCompiled;
}
export class Loader extends EventEmitter implements ILoader {
	watch: boolean = false;
	noCache: boolean = false;
	cache: Record<string, any> = {};
	resolve(from: string, to: string) {
		return path.resolve(path.dirname(from), to);
	}

	isRelative(filename: string) {
		return filename.indexOf('./') === 0 || filename.indexOf('../') === 0;
	}

	get typename(): LoaderTypename {
		return LoaderTypename.Default;
	}

	getSource(name: string) {
		return {
			loader: undefined,
			src: {
				type: LoaderEnum.default,
				obj: ''
			},
			path: name,
			noCache: this.noCache
		};
	}
}

export class PrecompiledLoader extends Loader {
	precompiled: Record<string, any>;
	constructor(compiledTemplates: any) {
		super();
		this.precompiled = compiledTemplates || {};
	}
	get typename() {
		return LoaderTypename.Precompiled
	}

	getSource(name: string) {
		return {
			loader: undefined,
			src: {
				type: LoaderEnum.precompiled,
				obj: this.precompiled[name],
			},
			path: name,
			noCache: false
		};
	}
}
// interface IWebLoader extends ILoader {
// 	baseURL: string;
// 	useCache: boolean;
// 	async: boolean;
// 	cache: any;
// 	getSource(name: string, cb?: (err: any, res: any) => void): void;
// 	fetch(
// 		url: string,
// 		cb: (err: { status: number; content: string }, src?: string) => void
// 	): void;
// }



// export class WebLoader extends Loader implements ILoader {
// 	baseURL: string;
// 	useCache: boolean;
// 	async: boolean;

// 	constructor(
// 		baseURL: string = '.',
// 		opts?: { useCache?: boolean; async?: boolean }
// 	) {
// 		super();
// 		this.baseURL = baseURL;
// 		opts = opts || {};
// 		this.useCache = !!opts.useCache; // We default cache to false
// 		this.async = !!opts.async; // We default `async` to false
// 	}
// 	get typename() {
// 		return 'WebLoader'
// 	}

// 	resolve(_: string, _t: string) {
// 		throw new Error('relative templates not support in the browser yet');
// 		return '';
// 	}

// 	async getSource(name: string) {
// 		const useCache = this.useCache;
// 		if (useCache && this.cache && this.cache[name]) {
// 			const cached = this.cache[name];
// 			if (cb) cb(null, cached);
// 			return cached;
// 		}
// 		const url = this.baseURL.replace(/\/$/, '') + '/' + name.replace(/^\//, '');

// 		if (!cb) {
// 			throw new Error(
// 				'WebLoader.getSource(name) without a callback is not supported with fetch (fetch is always async). ' +
// 					'Pass a callback or precompile templates.'
// 			);
// 		}

// 		return this.fetch(url, (err, src) => {
// 			if (err) {
// 				if (err.status === 404) return cb(null, null);
// 				return cb(err, null);
// 			}
// 			const result = {
// 				src,
// 				path: name,
// 				noCache: !useCache,
// 			};
// 			if (useCache) {
// 				this.cache = this.cache || {};
// 				this.cache[name] = result;
// 			}

// 			this.emit('load', name, result);
// 			cb(null, result);
// 			return result
// 		});
// 	}

// 	async fetch(
// 		url: string,
// 		cb: (err: { status: number; content: string }, src?: string) => void
// 	) {
// 		if (typeof window === 'undefined') {
// 			throw new Error('WebLoader can only by used in a browser');
// 		}
// 		const bust = 's=' + Date.now();
// 		const finalUrl = url + (url.includes('?') ? '&' : '?') + bust;

// 		return fetch(finalUrl, { method: 'GET', credentials: 'same-origin' })
// 			.then((res) =>
// 				res.text().then((text) => {
// 					if (res.ok || res.status === 0) {
// 						cb(null as any, text);
// 					} else {
// 						cb({ status: res.status, content: text });
// 					}
// 				})
// 			)
// 			.catch((e) => cb({ status: 0, content: String(e?.message || e) }));
// 	}
// }


export class FileSystemLoader extends Loader {
	pathsToNames: Record<string, any>;
	constructor(public searchPaths: string[] = ['.'], opts?: ILoaderOpts) {
		super();
		if (typeof opts === 'boolean') {
			throw '';
		}
		this.pathsToNames = {};
		this.noCache = opts?.noCache || false;
		this.searchPaths = (
			Array.isArray(searchPaths) ? searchPaths : [searchPaths]
		).map(path.normalize);
	}
	get typename() {
		return LoaderTypename.File
	}

	getSource(name: string) {
		let fullpath = null;

		for (let i = 0; i < this.searchPaths?.length; i++) {
			const basePath = path.resolve(this.searchPaths[i]);
			const _p = path.resolve(this.searchPaths[i], name);
			p.log(_p)
			if (_p.indexOf(basePath) === 0 && fs.existsSync(_p)) {
				fullpath = _p;
				break;
			}
		}

		if (!fullpath) {
			throw new Error('No file found: ' + name)
		}

		this.pathsToNames[fullpath] = name;
		const source = {
			loader: undefined,
			src: {
				type: LoaderEnum.file,
				obj: fs.readFileSync(fullpath, 'utf-8'),
			},
			path: fullpath,
			noCache: this.noCache
		};
		this.emit('load', name, source);
		p.log('src found',source)
		return source;
	}
}

export class MemoryLoader extends Loader {
	constructor(private templates: Record<string, string>) {
		super()
	}
	getSource(name: string) {
		if (!(name in this.templates)) return null;
		return { 
			loader: undefined,
			src: {
				type: LoaderEnum.memory,
				obj: this.templates[name]
			}, 
			path: name, 
			noCache: true
		};
	}
	get typename() {
		return LoaderTypename.Memory
	}
}
