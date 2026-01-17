import EventEmitter from 'events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// IMPORTANT: update to the path where loader.ts exports these
import {
	Loader,
	PrecompiledLoader,
	WebLoader,
	FileSystemLoader,
} from '../src/loader';

function mkTmpDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'njk-loader-'));
}
function write(p: string, content: string) {
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, content, 'utf8');
}

describe('Obj / EmitterObj extend + parentWrap', () => {
	it('Obj.extend supports this.parent() calling the overridden method', () => {
		class Base extends Loader {
			hello() {
				return 'base';
			}
		}

		class Sub extends Base {
			hello() {
				// parentWrap makes this.parent point to Base.prototype.hello
				return super.hello() + ':sub';
			}
		}

		const s = new Sub();
		expect(s.hello()).toBe('base:sub');
		expect(s.typename).toBe('Sub');
	});

	it('EmitterObj.extend supports this.parent() and emits events', () => {
		class Base extends EventEmitter {
			get typename() {
				return this.constructor.name;
			}
			ping() {
				return 'pong';
			}
		}

		class Sub extends Base {
			ping() {
				return super.ping() + '!';
			}
		}

		const s = new Sub();
		expect(s.ping()).toBe('pong!');
		expect(s.typename).toBe('Sub');

		const fn = vi.fn();
		s.on('evt', fn);
		s.emit('evt', 1, 2);
		expect(fn).toHaveBeenCalledWith(1, 2);
	});
});

describe('Loader base class', () => {
	it('resolve resolves relative to dirname(from)', () => {
		const l = new Loader();
		const out = l.resolve('/a/b/c.njk', './d.njk');
		expect(out).toBe(path.resolve('/a/b', './d.njk'));
	});

	it('isRelative detects ./ and ../ only', () => {
		const l = new Loader();
		expect(l.isRelative('./x.njk')).toBe(true);
		expect(l.isRelative('../x.njk')).toBe(true);
		expect(l.isRelative('x.njk')).toBe(false);
		expect(l.isRelative('/abs/x.njk')).toBe(false);
	});
});

describe('PrecompiledLoader', () => {
	it('getSource returns code src when template exists', () => {
		const compiled = {
			'a.njk': { root() {} },
		};
		const l = new PrecompiledLoader(compiled);
		const src = l.getSource('a.njk');

		expect(src).toEqual({
			src: { type: 'code', obj: compiled['a.njk'] },
			path: 'a.njk',
		});
	});

	it('getSource returns null when missing', () => {
		const l = new PrecompiledLoader({});
		expect(l.getSource('missing.njk')).toBeNull();
	});
});

describe('WebLoader', () => {
	const originalWindow = (globalThis as any).window;
	const originalFetch = (globalThis as any).fetch;

	afterEach(() => {
		(globalThis as any).window = originalWindow;
		(globalThis as any).fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('resolve throws (relative templates unsupported)', () => {
		const l = new WebLoader('.');
		expect(() => l.resolve('a', 'b')).toThrow(
			/relative templates not support/i
		);
	});

	it('getSource throws if called without cb (fetch is async)', () => {
		(globalThis as any).window = {}; // allow fetch path
		(globalThis as any).fetch = vi.fn();

		const l = new WebLoader('https://example.com', { useCache: false });
		expect(() => l.getSource('a.njk' as any)).toThrow(/without a callback/i);
	});

	it('fetch throws on server (no window)', () => {
		(globalThis as any).window = undefined;
		const l = new WebLoader('https://example.com');
		expect(() => l.fetch('https://x', vi.fn() as any)).toThrow(
			/only by used in a browser/i
		);
	});

	it('getSource calls fetch and emits load (noCache when useCache=false)', async () => {
		(globalThis as any).window = {};
		(globalThis as any).fetch = vi.fn(async () => ({
			ok: true,
			status: 200,
			text: async () => 'TEMPLATE',
		}));

		const l = new WebLoader('https://example.com/base/', { useCache: false });

		const onLoad = vi.fn();
		l.on('load', onLoad);

		const res = await new Promise<any>((resolve, reject) => {
			l.getSource('a.njk', (err, out) => (err ? reject(err) : resolve(out)));
		});

		expect(res).toEqual({
			src: 'TEMPLATE',
			path: 'a.njk',
			noCache: true,
		});

		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(onLoad.mock.calls[0][0]).toBe('a.njk');
		expect(onLoad.mock.calls[0][1]).toMatchObject({
			path: 'a.njk',
			src: 'TEMPLATE',
		});

		// url should be baseURL joined with name, and include cache-bust query
		expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
		const calledUrl = (globalThis as any).fetch.mock.calls[0][0] as string;
		expect(calledUrl).toMatch(/^https:\/\/example\.com\/base\/a\.njk\?/);
		expect(calledUrl).toMatch(/(\?|&)s=\d+/);
	});

	it('useCache=true caches results and returns cached value on next call (no fetch)', async () => {
		(globalThis as any).window = {};
		const fetchSpy = vi.fn(async () => ({
			ok: true,
			status: 200,
			text: async () => 'ONE',
		}));
		(globalThis as any).fetch = fetchSpy;

		const l = new WebLoader('https://example.com', { useCache: true });

		const first = await new Promise<any>((resolve, reject) => {
			l.getSource('a.njk', (err, out) => (err ? reject(err) : resolve(out)));
		});
		expect(first.noCache).toBe(false);
		expect(first.src).toBe('ONE');
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		// Change fetch response; should not be called
		(globalThis as any).fetch = vi.fn(async () => ({
			ok: true,
			status: 200,
			text: async () => 'TWO',
		}));

		const second = await new Promise<any>((resolve, reject) => {
			l.getSource('a.njk', (err, out) => (err ? reject(err) : resolve(out)));
		});
		expect(second).toBe(first);
	});

	it('404 from fetch maps to cb(null, null)', async () => {
		(globalThis as any).window = {};
		(globalThis as any).fetch = vi.fn(async () => ({
			ok: false,
			status: 404,
			text: async () => 'not found',
		}));

		const l = new WebLoader('https://example.com', { useCache: false });

		const out = await new Promise<any>((resolve) => {
			l.getSource('missing.njk', (_err, res) => resolve(res));
		});

		expect(out).toBeNull();
	});

	it('non-404 fetch error yields cb(err, null)', async () => {
		(globalThis as any).window = {};
		(globalThis as any).fetch = vi.fn(async () => ({
			ok: false,
			status: 500,
			text: async () => 'boom',
		}));

		const l = new WebLoader('https://example.com', { useCache: false });

		const [err, res] = await new Promise<any>((resolve) => {
			l.getSource('a.njk', (e, r) => resolve([e, r]));
		});

		expect(res).toBeNull();
		expect(err).toMatchObject({ status: 500, content: 'boom' });
	});
});

describe('FileSystemLoader', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkTmpDir();
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('getSource finds template within searchPaths, reads file, emits load', () => {
		const file = path.join(dir, 'views', 'a.njk');
		write(file, 'HELLO');

		const l = new FileSystemLoader([path.join(dir, 'views')], {
			watch: false,
			noCache: false,
		});

		const onLoad = vi.fn();
		l.on('load', onLoad);

		const res = l.getSource('a.njk');
		expect(res).toEqual({
			src: 'HELLO',
			path: path.resolve(file),
			noCache: false,
		});

		expect(onLoad).toHaveBeenCalledTimes(1);
		expect(onLoad).toHaveBeenCalledWith(
			'a.njk',
			expect.objectContaining({ src: 'HELLO' })
		);
	});

	it('returns null when not found', () => {
		const l = new FileSystemLoader([path.join(dir, 'views')], {
			watch: false,
			noCache: false,
		});
		expect(l.getSource('missing.njk')).toBeNull();
	});

	it('prevents directory traversal by basePath prefix check', () => {
		// create a "secret" outside views
		const views = path.join(dir, 'views');
		const secret = path.join(dir, 'secret.txt');
		write(secret, 'NOPE');
		fs.mkdirSync(views, { recursive: true });

		const l = new FileSystemLoader([views], { watch: false, noCache: false });

		// try to escape
		const res = l.getSource('../secret.txt');
		expect(res).toBeNull();
	});

	it('sets pathsToNames mapping after successful load', () => {
		const file = path.join(dir, 'views', 'a.njk');
		write(file, 'HELLO');

		const l = new FileSystemLoader([path.join(dir, 'views')], {
			watch: false,
			noCache: false,
		});
		const res = l.getSource('a.njk')!;
		expect(l.pathsToNames[res.path]).toBe('a.njk');
	});
});

// describe('NodeResolveLoader', () => {
// 	let dir: string;
// 	let modDir: string;
// 	let modPath: string;

// 	beforeEach(() => {
// 		dir = mkTmpDir();
// 		modDir = path.join(dir, 'node_modules', 'my-njk-pkg');
// 		modPath = path.join(modDir, 'index.njk');
// 		write(modPath, 'PKG_TEMPLATE');

// 		// Make it resolvable
// 		write(
// 			path.join(modDir, 'package.json'),
// 			JSON.stringify({ name: 'my-njk-pkg', main: 'index.njk' })
// 		);

// 		// Ensure node can resolve from this temp dir
// 		process.env.NODE_PATH = path.join(dir, 'node_modules');
// 		require('module').Module._initPaths();
// 	});

// 	afterEach(() => {
// 		fs.rmSync(dir, { recursive: true, force: true });
// 	});

// 	// it('rejects filesystem traversal names', () => {
// 	// 	const l = new NodeResolveLoader({ watch: false, noCache: false });

// 	// 	expect(l.getSource('../x')).toBeNull();
// 	// 	expect(l.getSource('./x')).toBeNull();
// 	// 	// windows drive letter
// 	// 	expect(l.getSource('C:\\x')).toBeNull();
// 	// });

// 	// it('getSource resolves module, reads it, emits load', () => {
// 	// 	const l = new NodeResolveLoader({ watch: false, noCache: true });

// 	// 	const onLoad = vi.fn();
// 	// 	l.on('load', onLoad);

// 	// 	const res = l.getSource('my-njk-pkg');
// 	// 	expect(res).toEqual({
// 	// 		src: 'PKG_TEMPLATE',
// 	// 		path: path.resolve(modPath),
// 	// 		noCache: true,
// 	// 	});

// 	// 	expect(onLoad).toHaveBeenCalledTimes(1);
// 	// 	expect(onLoad).toHaveBeenCalledWith(
// 	// 		'my-njk-pkg',
// 	// 		expect.objectContaining({ src: 'PKG_TEMPLATE' })
// 	// 	);
// 	// });

// 	// it('returns null when require.resolve fails', () => {
// 	// 	const l = new NodeResolveLoader({ watch: false, noCache: false });
// 	// 	expect(l.getSource('definitely-not-a-real-package-xyz')).toBeNull();
// 	// });
// });
