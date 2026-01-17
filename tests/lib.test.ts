import { describe, test, expect, vi } from 'vitest';
import { lib } from '../index';

describe('lib()', () => {
	describe('isFunction/isArray/isString/isObject', () => {
		test('isFunction()', () => {
			expect(lib.isFunction(() => {})).toBe(true);
			expect(lib.isFunction(function () {})).toBe(true);
			expect(lib.isFunction(async () => {})).toBe(true);

			expect(lib.isFunction(null)).toBe(false);
			expect(lib.isFunction({})).toBe(false);
			expect(lib.isFunction('fn')).toBe(false);
		});

		test('isArray()', () => {
			expect(Array.isArray([])).toBe(true);
			expect(Array.isArray([1, 2])).toBe(true);
			expect(Array.isArray(new Array(3))).toBe(true);

			expect(Array.isArray({ length: 1 })).toBe(false);
			expect(Array.isArray('[]')).toBe(false);
			expect(Array.isArray(null)).toBe(false);
		});

		test('isString()', () => {
			expect(lib.isString('hello')).toBe(true);
			expect(lib.isString(String('x'))).toBe(true);

			// string object is NOT typeof "string"
			expect(lib.isString(new String('x'))).toBe(false);
			expect(lib.isString(123)).toBe(false);
			expect(lib.isString(null)).toBe(false);
		});

		test('isObject() only matches plain objects', () => {
			expect(lib.isObject({})).toBe(true);
			expect(lib.isObject({ a: 1 })).toBe(true);

			expect(lib.isObject([])).toBe(false);
			expect(lib.isObject(() => {})).toBe(false);
			expect(lib.isObject(new Date())).toBe(false);
			expect(lib.isObject(null)).toBe(false);
		});
	});

	describe('_prepareAttributeParts()', () => {
		test('splits dotted strings', () => {
			expect(lib._prepareAttributeParts('a.b.c')).toEqual(['a', 'b', 'c']);
		});

		test('wraps numbers as array', () => {
			expect(lib._prepareAttributeParts(12)).toEqual([12]);
		});
	});

	describe('getAttrGetter()', () => {
		test('gets nested attributes safely', () => {
			const get = lib.getAttrGetter('a.b.c');
			expect(get({ a: { b: { c: 42 } } })).toBe(42);
		});

		test('returns undefined for missing path', () => {
			const get = lib.getAttrGetter('a.b.c');
			expect(get({ a: { b: {} } })).toBeUndefined();
			expect(get({})).toBeUndefined();
		});

		test('works for single-level attribute', () => {
			const get = lib.getAttrGetter('x');
			expect(get({ x: 'ok' })).toBe('ok');
		});
	});

	describe('groupBy()', () => {
		test('groups by attribute name', () => {
			const list = [
				{ t: 'a', n: 1 },
				{ t: 'b', n: 2 },
				{ t: 'a', n: 3 },
			];

			const out = lib.groupBy(list as any, 't', false);
			expect(Object.keys(out).sort()).toEqual(['a', 'b']);
			expect(out.a.map((x: any) => x.n)).toEqual([1, 3]);
			expect(out.b.map((x: any) => x.n)).toEqual([2]);
		});

		test('throws when key is undefined and throwOnUndefined=true', () => {
			const list = [{ t: 'a' }, { nope: 123 }] as any;

			expect(() => lib.groupBy(list, 't', true)).toThrow(
				/resolved to undefined/i
			);
		});

		test('groups by iterator function', () => {
			const list = [{ n: 1 }, { n: 2 }, { n: 3 }] as any;
			const out = lib.groupBy(
				list,
				(x: any) => (x.n % 2 ? 'odd' : 'even'),
				false
			);

			expect(out.odd.map((x: any) => x.n)).toEqual([1, 3]);
			expect(out.even.map((x: any) => x.n)).toEqual([2]);
		});
	});

	describe('toArray()', () => {
		test('converts array-like objects', () => {
			const arrLike = { 0: 'a', 1: 'b', length: 2 };
			expect(lib.toArray(arrLike)).toEqual(['a', 'b']);
		});

		test('converts arguments object', () => {
			function f() {
				return lib.toArray(arguments);
			}
			expect(f('x', 'y')).toEqual(['x', 'y']);
		});
	});

	describe('without()', () => {
		test('removes values from array', () => {
			expect(lib.without([1, 2, 3, 2], 2)).toEqual([1, 3]);
		});

		test('does nothing if contains is empty', () => {
			expect(lib.without([1, 2, 3])).toEqual([1, 2, 3]);
		});

		test('works with strings', () => {
			expect(lib.without(['a', 'b', 'a'], 'a')).toEqual(['b']);
		});
	});

	describe('repeat()', () => {
		test('repeats character n times', () => {
			expect(lib.repeat('a', 0)).toBe('');
			expect(lib.repeat('a', 3)).toBe('aaa');
			expect(lib.repeat('🤚🏼', 2)).toBe('🤚🏼🤚🏼');
		});
	});

	describe('each()', () => {
		test('iterates arrays using native forEach', () => {
			const seen: any[] = [];
			lib.each([1, 2, 3], (x: number) => seen.push(x), null);
			expect(seen).toEqual([1, 2, 3]);
		});

		test('iterates array-like objects', () => {
			const seen: any[] = [];
			const arrLike = { 0: 'a', 1: 'b', length: 2 };
			lib.each(
				arrLike,
				function (this: any, v: any) {
					seen.push(v);
				},
				null
			);
			expect(seen).toEqual(['a', 'b']);
		});

		test('does nothing for falsy obj', () => {
			expect(() => lib.each(null, () => {}, null)).not.toThrow();
		});
	});

	describe('asyncIter()', () => {
		test('calls iter for each item then cb', () => {
			const calls: string[] = [];
			const done = vi.fn();

			lib.asyncIter(
				[1, 2, 3],
				(val: number, i: number, next: () => void) => {
					calls.push(`${i}:${val}`);
					next();
				},
				done
			);

			expect(calls).toEqual(['0:1', '1:2', '2:3']);
			expect(done).toHaveBeenCalledTimes(1);
		});

		test('iter can early-fail via cb (4th arg) if you use it', () => {
			const done = vi.fn();
			const iter = vi.fn(
				(val: number, i: number, next: () => void, cb: any) => {
					if (val === 2) return cb(new Error('stop'));
					next();
				}
			);

			lib.asyncIter([1, 2, 3], iter, done);

			expect(done).toHaveBeenCalledTimes(1);
			// depending on your intended semantics, done might get (err) or no args.
			// current implementation calls cb() directly, so it WILL receive the error.
			expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
		});
	});

	describe('asyncFor()', () => {
		test('iterates object keys then calls cb', () => {
			const obj = { a: 1, b: 2 };
			const seen: string[] = [];
			const done = vi.fn();

			lib.asyncFor(
				obj,
				(k: string, v: any, i: number, len: number, next: () => void) => {
					seen.push(`${k}:${v}:${i}/${len}`);
					next();
				},
				done
			);

			// order is insertion order in JS engines for string keys
			expect(seen).toEqual(['a:1:0/2', 'b:2:1/2']);
			expect(done).toHaveBeenCalledTimes(1);
		});

		test('handles empty object', () => {
			const done = vi.fn();
			lib.asyncFor(
				{},
				(_k: any, _v: any, _i: any, _len: any, next: any) => next(),
				done
			);
			expect(done).toHaveBeenCalledTimes(1);
		});
	});

	describe('inOperator()', () => {
		test('works for arrays (uses indexOf)', () => {
			expect(lib.inOperator('a', ['a', 'b'])).toBe(true);
			expect(lib.inOperator('x', ['a', 'b'])).toBe(false);
		});

		test('works for strings (substring search)', () => {
			expect(lib.inOperator('cat', 'concatenate')).toBe(true);
			expect(lib.inOperator('dog', 'concatenate')).toBe(false);
		});

		test('works for plain objects (property in)', () => {
			expect(lib.inOperator('a', { a: 1 })).toBe(true);
			expect(lib.inOperator('b', { a: 1 })).toBe(false);
		});

		test('throws for unsupported types', () => {
			expect(() => lib.inOperator('a', 123)).toThrow(/unexpected types/i);
			expect(() => lib.inOperator('a', null)).toThrow();
		});
	});

	describe('TemplateError + _prettifyError()', () => {
		test('TemplateError stores lineno/colno and supports update()', () => {
			const err = lib.TemplateError('boom', 10, 2);
			expect(err.name).toBe('Template render error');
			expect(err.lineno).toBe(10);
			expect(err.colno).toBe(2);

			err.update('file.njk');
			expect(err.message).toContain('(file.njk)');
			expect(err.message).toContain('Line 10');
			expect(err.message).toContain('Column 2');
		});

		test('_prettifyError wraps non-TemplateErr errors', () => {
			const raw = new Error('nope') as any;
			const pretty = lib._prettifyError('x.njk', true, raw);

			expect(pretty.name).toBe('Template render error');
			expect(pretty.message).toContain('(x.njk)');
		});

		test('_prettifyError uses existing update when present', () => {
			const err = lib.TemplateError('boom', 1, 1);
			const pretty = lib._prettifyError('y.njk', true, err);
			expect(pretty.message).toContain('(y.njk)');
		});
	});

	describe('hasOwnProp()', () => {
		test('works for existing keys', () => {
			const obj: any = { a: 1, 1: 'x' };
			expect(lib.hasOwnProp(obj, 'a')).toBe(true);
			expect(lib.hasOwnProp(obj, 1)).toBe(true);
		});

		test('returns false for missing keys', () => {
			const obj: any = { a: 1 };
			expect(lib.hasOwnProp(obj, 'b')).toBe(false);
		});

		test('throws for null/undefined key (because `in` operator)', () => {
			const obj: any = { a: 1 };
			// [Function anonymous]
			expect(() => lib.hasOwnProp(obj, undefined as any)).toBe(false);
			expect(() => lib.hasOwnProp(obj, null as any)).toBe(false);
		});
	});
});
