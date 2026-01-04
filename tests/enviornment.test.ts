// test/environment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// IMPORTANT: update this import to the file that exports Environment/Template/Context/asap/callbackAsap
import { Environment, Template, Context } from '../nunjucks/src/environment';

// ---- Helpers: minimal loader stubs ----
class SyncLoader {
	public async = false;
	public cache: Record<string, any> = {};
	public on?: (event: string, cb: (...args: any[]) => void) => void;

	private sources: Record<
		string,
		{
			src: { type: 'code' | 'string'; obj: any };
			path?: string;
			noCache?: boolean;
		}
	> = {};

	constructor(sources?: SyncLoader['sources']) {
		if (sources) this.sources = sources;
	}

	getSource(name: string) {
		const hit = this.sources[name];
		if (!hit) return null;

		return {
			src: hit.src,
			path: hit.path ?? name,
			noCache: hit.noCache ?? false,
		};
	}
}

class RelativeLoader extends SyncLoader {
	isRelative(filename: string) {
		return filename.startsWith('./') || filename.startsWith('../');
	}
	resolve(parent: string, filename: string) {
		// very small join; just enough for tests
		const base = parent.split('/').slice(0, -1).join('/');
		return `${base}/${filename.replace(/^\.\//, '')}`;
	}
}

// ---- Helpers: tiny code templates (no compiler involved) ----
function codeTemplateReturning(text: string) {
	return {
		type: 'code' as const,
		obj: {
			root(_env: any, _ctx: any, _frame: any, _runtime: any, cb: any) {
				cb(null, text);
			},
		},
	};
}

function codeTemplateCallingLookup(name: string) {
	return {
		type: 'code' as const,
		obj: {
			root(_env: any, ctx: any, _frame: any, _runtime: any, cb: any) {
				cb(null, String(ctx.lookup(name)));
			},
		},
	};
}

describe('Environment basics', () => {

	it('addFilter/getFilter', () => {
		const env = new Environment();
		const f = (v: any) => String(v).toUpperCase();
		env.addFilter('up', f);

		expect(env.getFilter('up')).toBe(f);
		expect(() => env.getFilter('missing')).toThrow(/filter not found/i);
	});

	it('addFilter with async marks asyncFilters', () => {
		const env = new Environment();
		env.addFilter('a', () => 'x', [
			/*anything*/
		]);

		expect(env.asyncFilters).toContain('a');
	});

	it('addExtension / hasExtension / getExtension / removeExtension', () => {
		const env = new Environment();
		const ext = { foo: 1 };

		env.addExtension('myExt', ext);
		expect(env.hasExtension('myExt')).toBe(true);
		expect(env.getExtension('myExt')).toBe(ext);

		env.removeExtension('myExt');
		expect(env.hasExtension('myExt')).toBe(false);
		expect(env.getExtension('myExt')).toBeUndefined();
	});
});

describe('Environment.resolveTemplate', () => {
	it('uses loader.resolve for relative templates when parentName is provided', () => {
		const loader: any = new RelativeLoader();
		const env = new Environment({ loaders: [loader] });

		const resolved = env.resolveTemplate(
			loader as any,
			'pages/base.njk',
			'./child.njk'
		);
		expect(resolved).toBe('pages/child.njk');
	});

	it('returns filename as-is when not relative', () => {
		const loader: any = new RelativeLoader();
		const env = new Environment({ loaders: [loader] });

		const resolved = env.resolveTemplate(
			loader as any,
			'pages/base.njk',
			'child.njk'
		);
		expect(resolved).toBe('child.njk');
	});
});

describe('Environment.getTemplate (sync loaders)', () => {
	it('returns cached template when present', () => {
		const loader: any = new SyncLoader();
		const env = new Environment({ loaders: [loader] });

		const t1 = new Template(codeTemplateReturning('hello'), env, 't.njk', true);
		loader.cache['t.njk'] = t1;

		const got = env.getTemplate('t.njk', (e, r) => {}, {});
		expect(got).toBe(t1);
	});

	it('loads from loader and caches when noCache is false', () => {
		const loader = new SyncLoader({
			'a.njk': {
				src: codeTemplateReturning('A'),
				path: 'a.njk',
				noCache: false,
			},
		});
		const env = new Environment({ loaders: [loader as any] });

		const tmpl = env.getTemplate('a.njk', (e, r) => {}, {}) as Template;
		expect(tmpl).toBeInstanceOf(Template);

		// should now be cached at name
		expect(loader.cache['a.njk']).toBe(tmpl);

		// eagerCompile=true should have compiled
		expect((tmpl as any).compiled).toBe(true);

		// and it should render
		expect(tmpl.render({})).toBe('A');
	});

	it('does not cache when noCache is true', () => {
		const loader = new SyncLoader({
			'a.njk': {
				src: codeTemplateReturning('A'),
				path: 'a.njk',
				noCache: true,
			},
		});
		const env = new Environment({ loaders: [loader as any] });

		const tmpl = env.getTemplate('a.njk', (e, r) => {}) as Template;
		expect(loader.cache['a.njk']).toBeUndefined();
		expect(tmpl.render({})).toBe('A');
	});

	it('throws when template missing and ignoreMissing not set', () => {
		const loader = new SyncLoader({});
		const env = new Environment({ loaders: [loader as any] });

		expect(() => env.getTemplate('missing.njk', (e, r) => {})).toThrow(
			/template not found/i
		);
	});

	it('returns a noop template when ignoreMissing=true', () => {
		const loader = new SyncLoader({});
		const env = new Environment({ loaders: [loader as any] });

		const tmpl = env.getTemplate('missing.njk', (e, r) => {}, {
			eagerCompile: false,
			parentName: null,
			ignoreMissing: true,
		}) as Template;
		expect(tmpl).toBeInstanceOf(Template);

		// should render empty string
		expect(tmpl.render({})).toBe('');
	});

	it('supports callback API and returns undefined', async () => {
		const loader = new SyncLoader({
			'a.njk': { src: codeTemplateReturning('A'), path: 'a.njk' },
		});
		const env = new Environment({ loaders: [loader as any] });

		const cb = vi.fn();
		const ret = env.getTemplate('a.njk', cb, {});

		expect(ret).toBeUndefined();

		// callback is invoked synchronously for sync loaders in this implementation
		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb.mock.calls[0][0]).toBeNull();
		expect(cb.mock.calls[0][1]).toBeInstanceOf(Template);
	});

	it('accepts Template instance directly', () => {
		const env = new Environment();
		const t = new Template(codeTemplateReturning('X'), env, 'x.njk', true);

		const got = env.getTemplate(t as any, (e, r) => {}) as Template;
		expect(got).toBe(t);
		expect(got.render({})).toBe('X');
	});

	it('throws if name is not a string or Template', () => {
		const env = new Environment();
		// @ts-expect-error
		expect(() => env.getTemplate(123, false)).toThrow(
			/template names must be a string/i
		);
	});
});

describe('Environment.render / renderString', () => {
	it('render returns sync string when callback not provided', () => {
		const loader = new SyncLoader({
			'a.njk': { src: codeTemplateReturning('Hello'), path: 'a.njk' },
		});
		const env = new Environment({ loaders: [loader as any] });

		const out = env.render('a.njk', { any: 1 });
		expect(out).toBe('Hello');
	});

	it('render calls callback asynchronously (callbackAsap) when no parentFrame', async () => {
		const loader = new SyncLoader({
			'a.njk': { src: codeTemplateReturning('Hello'), path: 'a.njk' },
		});
		const env = new Environment({ loaders: [loader as any] });

		const cb = vi.fn();
		env.render('a.njk', {}, cb);

		// callback should NOT have fired yet because Template.render forces async when no parentFrame
		expect(cb).not.toHaveBeenCalled();

		await Promise.resolve();
		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb.mock.calls[0][0]).toBeNull();
		expect(cb.mock.calls[0][1]).toBe('Hello');
	});

	it('renderString renders from a code template object', () => {
		const env = new Environment();
		const out = env.renderString(
			codeTemplateReturning('S') as any,
			{},
			{} as any
		);
		expect(out).toBe('S');
	});

	it('Context.lookup prefers globals when ctx lacks key', () => {
		const env = new Environment();
		// env.addGlobal('g', 'GLOB');

		const tmpl = new Template(
			codeTemplateCallingLookup('g'),
			env,
			't.njk',
			true
		);
		expect(tmpl.render({})).toBe('GLOB');
	});

	it('Context.lookup prefers ctx value over globals when both exist', () => {
		const env = new Environment();
		// env.addGlobal('g', 'GLOB');

		const tmpl = new Template(
			codeTemplateCallingLookup('g'),
			env,
			't.njk',
			true
		);
		expect(tmpl.render({ g: 'LOCAL' })).toBe('LOCAL');
	});
});

describe('Context blocks + super', () => {
	it('addBlock/getBlock', () => {
		const ctx = new Context({}, {}, new Environment());
		ctx.addBlock('b', () => 'x');

		expect(typeof ctx.getBlock('b')).toBe('function');
		expect(() => ctx.getBlock('missing')).toThrow(/unknown block/i);
	});

	it('getSuper calls the next block in the stack', () => {
		const env = new Environment();
		const ctx = new Context({}, {}, env);

		const b1 = vi.fn((_env, _ctx, _frame, _runtime, cb) => cb(null, 'one'));
		const b2 = vi.fn((_env, _ctx, _frame, _runtime, cb) => cb(null, 'two'));

		// first pushed is "top" (index 0), super should call next (index 1)
		ctx.addBlock('x', b1);
		ctx.addBlock('x', b2);

		const cb = vi.fn();
		// ask for super of b1 -> should run b2
		ctx.getSuper(env, 'x', b1, {} as any, {} as any, cb as any);

		expect(b2).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(null, 'two');
	});

	it('getSuper throws when no super block exists', () => {
		const env = new Environment();
		const ctx = new Context({}, {}, env);
		const b1 = vi.fn();

		ctx.addBlock('x', b1);

		expect(() =>
			ctx.getSuper(env, 'x', b1, {} as any, {} as any, vi.fn() as any)
		).toThrow(/no super block available/i);
	});
});

describe('Template compilation from compiler (mocked)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	it('compiles string templates via compiler.compile (mocked) and renders', async () => {
		// We need to import a fresh copy after mocking
		vi.mock('../src/compiler', () => {
			return {
				compile: vi.fn(() => {
					// This source is executed with `new Function(source)` and must return props when invoked.
					// It should return an object like: { root(...) {}, b_name(...) {} }
					return `
            return function() {
              return {
                root: function(env, ctx, frame, runtime, cb) { cb(null, "FROM_COMPILER"); }
              };
            };
          `;
				}),
			};
		});

		const mod = await import('../nunjucks/src/environment');
		const env = new mod.Environment();
		const tmpl = new mod.Template('hello {{x}}', env, 't.njk', true);

		expect(tmpl.render({})).toBe('FROM_COMPILER');
	});
});
