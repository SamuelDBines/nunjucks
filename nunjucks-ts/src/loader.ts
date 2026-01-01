import path from 'path';
import EventEmitter from 'events';

// --- INTERFACES ---
type AnyFn = (...args: any[]) => any;
type Ctor<T = object> = abstract new (...args: any[]) => T;
type WithTypename<T> = T & { readonly typename: string };
type ParentThis = { parent?: AnyFn };

interface IObj {
	init: () => void;
}

interface ILoader {
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
function parentWrap<P>(parent: unknown, prop: P): P {
	if (typeof parent !== 'function' || typeof prop !== 'function') return prop;

	return function (this: ParentThis, ...args: any[]): P {
		const tmp = this.parent;
		this.parent = parent as AnyFn;
		const res = (prop as AnyFn).apply(this, args);
		this.parent = tmp;
		return res;
	};
}

function extendClass(cls, name, props = {}) {
	Object.keys(props).forEach((k: string) => {
		props[k] = parentWrap(cls.prototype[k], props[k]);
	});

	class subclass extends cls {
		get typename() {
			return name;
		}
	}

	Object.assign(subclass.prototype ?? {}, props);

	return subclass;
}

// --- CLASSES ---

export class Obj implements IObj {
	constructor(...args: any[]) {
		this.init(...args);
	}

	init(...args: any[]) {}

	get typename(): string {
		return this.constructor.name;
	}

	static extend(name: any, props: any) {
		if (typeof name === 'object') {
			props = name;
			name = 'anonymous';
		}
		return extendClass(this, name, props);
	}
}

export class EmitterObj extends EventEmitter {
	constructor(...args: any[]) {
		super(...args);
	}

	get typename() {
		return this.constructor.name;
	}

	static extend(name: any, props: any) {
		if (typeof name === 'object') {
			props = name;
			name = 'anonymous';
		}
		return extendClass(this, name, props);
	}
}

export class Loader extends EmitterObj implements ILoader {
	resolve(from: string, to: string) {
		return path.resolve(path.dirname(from), to);
	}

	isRelative(filename: string) {
		return filename.indexOf('./') === 0 || filename.indexOf('../') === 0;
	}
}

export class PrecompiledLoader extends Loader {
	constructor(compiledTemplates) {
		super();
		this.precompiled = compiledTemplates || {};
	}

	getSource(name) {
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
	cache: any;

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

export default {
	EmitterObj,
	Loader,
};
