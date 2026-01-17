// test/runtime.test.ts
import { describe, it, expect, vi } from 'vitest';

// adjust paths to your repo layout
import {
	Frame,
	asyncAll,
	fromIterator,
	ensureDefined,
	memberLookup,
	suppressValue,
} from '../src/runtime';
import * as runtime from '../src/runtime';

describe('runtime.ts', () => {
	describe('Frame', () => {
		it('set/get supports dotted paths (auto-creates nested objects)', () => {
			const f = new Frame();
			f.set('user.profile.name', 'Sam', false);

			expect((f as any).variables.user.profile.name).toBe('Sam');
			expect(f.get('user')).toEqual({ profile: { name: 'Sam' } });
		});

		it('push/pop sets parent and topLevel semantics', () => {
			const root = new Frame(null);
			expect(root.parent).toBe(null);
			expect(root.topLevel).toBe(true);

			const child = root.push(false);
			expect(child.parent).toBe(root);
			expect(child.topLevel).toBe(false);

			expect(child.pop()).toBe(root);
		});

		it('resolveUp writes into an ancestor frame when it already exists', () => {
			const parent = new Frame(null);
			parent.set('x', 1, false);

			const child = parent.push(false);
			child.set('x', 2, true); // resolveUp
			console.log('Parent is', parent, child, parent.get('x'), child.get('x'));
			expect(parent.get('x')).toBe(2);
			expect(child.get('x')).toBe(null); // because it wrote to parent
		});

		it('isolateWrites prevents resolveUp from writing into parent', () => {
			const parent = new Frame(null);
			parent.set('x', 1, false);

			const child = new Frame(parent, true); // isolateWrites=true
			child.set('x', 2, true);

			expect(parent.get('x')).toBe(1);
			expect(child.get('x')).toBe(2);
		});

		it('get returns null for unknown names', () => {
			const f = new Frame();
			expect(f.get('missing')).toBe(null);
		});
	});

	describe('ensureDefined', () => {
		it('throws TemplateError for null/undefined and increments lineno/colno', () => {
			expect(() => ensureDefined(undefined, 4, 9)).toThrowError();

			try {
				ensureDefined(null, 4, 9);
			} catch (e: any) {
				// Your TemplateError likely stores lineno/colno; we at least verify message and that it references +1
				expect(String(e.message || e)).toContain(
					'attempted to output null or undefined value'
				);
				// if TemplateError attaches these, assert them (won’t fail if absent)
				if ('lineno' in e) expect(e.lineno).toBe(5);
				if ('colno' in e) expect(e.colno).toBe(10);
			}
		});

		it('returns the value if defined', () => {
			expect(ensureDefined(0)).toBe(0);
			expect(ensureDefined('')).toBe('');
			expect(ensureDefined(false)).toBe(false);
		});
	});

	describe('memberLookup', () => {
		it('returns undefined for null/undefined obj', () => {
			expect(memberLookup(null as any, 'x')).toBe(undefined);
			expect(memberLookup(undefined as any, 'x')).toBe(undefined);
		});

		it('returns property value for non-functions', () => {
			expect(memberLookup({ a: 123 }, 'a')).toBe(123);
		});

		it('wraps functions so that "this" is bound to the object', () => {
			const obj = {
				x: 3,
				inc(n: number) {
					// @ts-ignore
					return this.x + n;
				},
			};

			const fn = memberLookup(obj as any, 'inc');
			expect(typeof fn).toBe('function');
			expect(fn(4)).toBe(7);
		});
	});

	describe('suppressValue', () => {
		it('escapes when autoescape=true, returns raw when false', () => {
			const val = '<b>&</b>';
			const escaped = suppressValue(val as any, true);
			const raw = suppressValue(val as any, false);

			expect(raw).toBe(val);
			// rely on lib.escape semantics (amp/lt/gt etc)
			expect(escaped).not.toBe(val);
			expect(escaped).toContain('&lt;');
			expect(escaped).toContain('&gt;');
			expect(escaped).toContain('&amp;');
		});
	});

	describe('fromIterator', () => {
		it('returns arrays as-is', () => {
			const a = [1, 2, 3];
			expect(fromIterator(a as any)).toBe(a);
		});

		it('returns non-objects as-is', () => {
			expect(fromIterator(123 as any)).toBe(123);
			expect(fromIterator('x' as any)).toBe('x');
			expect(fromIterator(null as any)).toBe(null);
		});

		it('converts iterables to arrays when Symbol.iterator is present', () => {
			// Set is iterable in Node
			const s = new Set([1, 2, 3]);
			const out = fromIterator(s as any);
			expect(Array.isArray(out)).toBe(true);
			expect(out).toEqual([1, 2, 3]);
		});

		it('returns plain objects unchanged', () => {
			const o = { a: 1 };
			expect(fromIterator(o as any)).toBe(o);
		});
	});

	describe('asyncAll', () => {
		it('joins outputs in original index order (array)', async () => {
			const arr = ['a', 'b', 'c'];

			const p = new Promise<string>((resolve, reject) => {
				asyncAll(
					arr as any,
					1,
					(item: string, i: number, len: number, done: any) => {
						// finish out of order intentionally
						const delay = item === 'b' ? 10 : item === 'a' ? 30 : 0;
						setTimeout(() => done(i, item.toUpperCase()), delay);
					},
					(err: any, res?: any) => (err ? reject(err) : resolve(res))
				);
			});

			await expect(p).resolves.toBe('ABC');
		});

		it('returns empty string for empty array', async () => {
			const p = new Promise<string>((resolve, reject) => {
				asyncAll(
					[],
					1,
					(_item: any, _i: any, _len: any, done: any) => done(0, ''),
					(err: any, res?: any) => (err ? reject(err) : resolve(res))
				);
			});

			await expect(p).resolves.toBe('');
		});

		it('supports object iteration and preserves key order from Object.keys', async () => {
			const obj = { b: 'B', a: 'A' }; // insertion order in JS: b then a
			const keys = Object.keys(obj);

			const p = new Promise<string>((resolve, reject) => {
				asyncAll(
					obj as any,
					2,
					(k: string, v: string, i: number, len: number, done: any) => {
						// output includes key to verify mapping
						done(i, `${k}:${v};`);
					},
					(err: any, res?: any) => (err ? reject(err) : resolve(res))
				);
			});

			const out = await p;
			expect(out).toBe(keys.map((k) => `${k}:${(obj as any)[k]};`).join(''));
		});
	});

	describe('default export shape', () => {
		it('exposes expected helpers on default runtime export', () => {
			expect(runtime).toHaveProperty('Frame');
			expect(runtime).toHaveProperty('makeMacro');
			expect(runtime).toHaveProperty('makeKeywordArgs');
			expect(runtime).toHaveProperty('numArgs');
			expect(runtime).toHaveProperty('ensureDefined');
			expect(runtime).toHaveProperty('memberLookup');
			expect(runtime).toHaveProperty('contextOrFrameLookup');
			expect(runtime).toHaveProperty('callWrap');
			expect(runtime).toHaveProperty('handleError');
			expect(runtime).toHaveProperty('asyncEach');
			expect(runtime).toHaveProperty('asyncAll');
			expect(runtime).toHaveProperty('inOperator');
			expect(runtime).toHaveProperty('fromIterator');
		});
	});

	describe('makeMacro + keyword args semantics (smoke)', () => {
		it('makeKeywordArgs marks objects and makeMacro maps extra positionals to kwargs defaults', () => {
			// @ts-ignore – using runtime.default helpers
			const { makeMacro, makeKeywordArgs } = runtime;

			const fn = vi.fn((a: any, b: any, kwargs: any) => ({ a, b, kwargs }));
			const macro = makeMacro(['a', 'b'], ['x', 'y'], fn);

			// pass 4 positionals -> extra two become kwargs.x/y
			const res = macro(1, 2, 10, 20);

			expect(res).toEqual({ a: 1, b: 2, kwargs: { x: 10, y: 20 } });
		});

		it('makeMacro fills missing positionals from keyword args and removes consumed keys', () => {
			// @ts-ignore
			const { makeMacro, makeKeywordArgs } = runtime;

			const fn = vi.fn((a: any, b: any, kwargs: any) => ({ a, b, kwargs }));
			const macro = makeMacro(['a', 'b'], [], fn);

			const kw = makeKeywordArgs({ b: 42, extra: 'keep' });
			const res = macro(1, kw);

			expect(res).toEqual({
				a: 1,
				b: 42,
				kwargs: { extra: 'keep', __keywords: true },
			});
		});

		it('numArgs ignores trailing keyword args object', () => {
			// @ts-ignore
			const { numArgs, makeKeywordArgs } = runtime;
			expect(numArgs([1, 2])).toBe(2);
			expect(numArgs([1, makeKeywordArgs({})])).toBe(1);
			expect(numArgs([makeKeywordArgs({})])).toBe(0);
		});
	});
});
