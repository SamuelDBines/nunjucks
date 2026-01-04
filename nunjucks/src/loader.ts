// DONE: Sat Jan 3
import path from 'path';
import fs from 'node:fs';
import EventEmitter from 'events';
import { p } from './lib';
interface ILoader {
	watch: boolean;
	noCache: boolean;
	resolve: (from: string, to: string) => string;
	isRelative: (filename: string) => boolean;
}
interface IWebLoader extends ILoader {
	baseURL: string;
	useCache: boolean;
	async: boolean;
	cache: any;
	getSource(name: string, cb?: (err: any, res: any) => void): void;
	fetch(
		url: string,
		cb: (err: { status: number; content: string }, src?: string) => void
	): void;
}

// --- FUNCTION ---

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

	get typename() {
		return 'Loader';
	}
}

export class PrecompiledLoader extends Loader {
	precompiled: Record<string, any>;
	constructor(compiledTemplates: any) {
		super();
		this.precompiled = compiledTemplates || {};
	}
	get typename() {
		return 'PrecompiledLoader'
	}

	getSource(name: string): null | {
		src: {
			type: string;
			obj: any;
		};
		path: string;
	} {
		if (this.precompiled[name]) {
			return {
				src: {
					type: 'code',
					obj: this.precompiled[name],
				},
				path: name,
			};
		}
		return null;
	}
}

export class WebLoader extends Loader implements IWebLoader {
	baseURL: string;
	useCache: boolean;
	async: boolean;

	constructor(
		baseURL: string = '.',
		opts?: { useCache?: boolean; async?: boolean }
	) {
		super();
		this.baseURL = baseURL;
		opts = opts || {};
		this.useCache = !!opts.useCache; // We default cache to false
		this.async = !!opts.async; // We default `async` to false
	}
	get typename() {
		return 'WebLoader'
	}

	resolve(_: string, _t: string) {
		throw new Error('relative templates not support in the browser yet');
		return '';
	}

	getSource(name: string, cb?: (err: any, res: any) => void) {
		const useCache = this.useCache;
		if (useCache && this.cache && this.cache[name]) {
			const cached = this.cache[name];
			if (cb) cb(null, cached);
			return cached;
		}
		const url = this.baseURL.replace(/\/$/, '') + '/' + name.replace(/^\//, '');

		if (!cb) {
			throw new Error(
				'WebLoader.getSource(name) without a callback is not supported with fetch (fetch is always async). ' +
					'Pass a callback or precompile templates.'
			);
		}

		return this.fetch(url, (err, src) => {
			if (err) {
				if (err.status === 404) return cb(null, null);
				return cb(err, null);
			}
			const result = {
				src,
				path: name,
				noCache: !useCache,
			};
			if (useCache) {
				this.cache = this.cache || {};
				this.cache[name] = result;
			}

			this.emit('load', name, result);
			cb(null, result);
		});
	}

	fetch(
		url: string,
		cb: (err: { status: number; content: string }, src?: string) => void
	) {
		if (typeof window === 'undefined') {
			throw new Error('WebLoader can only by used in a browser');
		}
		const bust = 's=' + Date.now();
		const finalUrl = url + (url.includes('?') ? '&' : '?') + bust;

		return fetch(finalUrl, { method: 'GET', credentials: 'same-origin' })
			.then((res) =>
				res.text().then((text) => {
					if (res.ok || res.status === 0) {
						cb(null as any, text);
					} else {
						cb({ status: res.status, content: text });
					}
				})
			)
			.catch((e) => cb({ status: 0, content: String(e?.message || e) }));
	}
}

interface ILoaderOpts {
	watch: boolean;
	noCache: boolean;
}
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
		return 'FileSystemLoader'
	}

	getSource(name: string) {
		let fullpath = null;

		for (let i = 0; i < this.searchPaths?.length; i++) {
			const basePath = path.resolve(this.searchPaths[i]);
			const p = path.resolve(this.searchPaths[i], name);
			if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
				fullpath = p;
				break;
			}
		}

		if (!fullpath) {
			return null;
		}

		this.pathsToNames[fullpath] = name;
		p.warn('Try to load file: ', this.pathsToNames, '\nFullpath: ' ,fullpath)
		const source = {
			src: fs.readFileSync(fullpath, 'utf-8'),
			path: fullpath,
			noCache: this.noCache,
		};
		this.emit('load', name, source);
		return source;
	}
}

export class MemoryLoader {
	constructor(private templates: Record<string, string>) {}
	getSource(name: string) {
		if (!(name in this.templates)) return null;
		return { src: this.templates[name], path: name, noCache: true };
	}
	get typename() {
		return 'MemoryLoader'
	}
}
