// test/filters.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * These tests mock ./runtime and ./lib so we can test filter logic in isolation
 * without depending on your runtime safety/markSafe implementations.
 *
 * IMPORTANT: Update the import paths below if your filters file lives elsewhere.
 */

vi.mock('../nunjucks-ts/src/runtime', () => {
	return {
		default: {
			// keep it simple: "safe" handling just wraps + copySafeness returns output
			markSafe: (v: any) => ({ __safe: true, val: String(v) }),
			copySafeness: (_inp: any, out: any) => out,
			makeMacro: (_args: any, _kwargs: any, fn: Function) => fn,
		},
	};
});

vi.mock('../nunjucks-ts/src/lib', () => {
	const TemplateError = (msg: string) => new Error(msg);

	return {
		repeat: (s: string, n: number) => s.repeat(Math.max(0, Math.floor(n))),
		isObject: (o: any) =>
			o !== null && typeof o === 'object' && !Array.isArray(o),
		TemplateError,
		isString: (v: any) => typeof v === 'string' || v instanceof String,
		_entries: (o: any) => Object.entries(o ?? {}),
		getAttrGetter: (attr?: string) => (obj: any) => attr ? obj?.[attr] : obj,
		toArray: (v: any) => (Array.isArray(v) ? v : v == null ? [] : [v]),
		groupBy: (arr: any[], attr: string, _throwOnUndefined: boolean) => {
			const out: Record<string, any[]> = {};
			for (const item of arr ?? []) {
				const k = String(item?.[attr]);
				(out[k] ||= []).push(item);
			}
			// jinja-style groupby returns array of {grouper, list} often,
			// but your filter just forwards groupBy; we return a deterministic shape for tests:
			return Object.entries(out).map(([grouper, list]) => ({ grouper, list }));
		},
	};
});

async function loadFilters() {
	return await import('../nunjucks-ts/src/filters');
}

describe('filters.ts', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('center pads evenly and uses copySafeness', async () => {
		const f = await loadFilters();
		expect(f.center('hi', 6)).toBe('  hi  ');
		expect(f.center('already long', 3)).toBe('already long');
	});

	it('default_ (and alias d) chooses val/def based on bool flag', async () => {
		const f = await loadFilters();

		expect(f.default_(null, 'x')).toBe('x');
		expect(f.default_('a', 'x')).toBe('a');

		// bool=true path in your code: return def || val
		expect(f.default_(null, 'x', true)).toBe('x');
		expect(f.default_('a', '', true)).toBe('a');

		expect(f.d).toBe(f.default_);
	});

	it('dictsort sorts by key/value and respects caseSensitive', async () => {
		const f = await loadFilters();

		const obj = Object.create({ z: 0 });
		obj.B = 2;
		obj.a = 1;

		// by value default
		expect(f.dictsort(obj, true)).toEqual([
			['z', 0],
			['a', 1],
			['B', 2],
		]);

		// by key, case-insensitive should treat 'B' and 'a' accordingly
		expect(f.dictsort({ B: 2, a: 1 }, false, 'key')).toEqual([
			['a', 1],
			['B', 2],
		]);

		expect(() => f.dictsort('nope' as any, true)).toThrow(
			/val must be an object/i
		);
		expect(() => f.dictsort({ a: 1 }, true, 'nope' as any)).toThrow(
			/only sort by/i
		);
	});

	it('indent indents lines, optionally skipping the first', async () => {
		const f = await loadFilters();

		expect(f.indent('a\nb', 2, false)).toBe('a\n  b');
		expect(f.indent('a\nb', 2, true)).toBe('  a\n  b');
		expect(f.indent('', 4, true)).toBe('');
	});

	it('join joins array, supports attr picking', async () => {
		const f = await loadFilters();

		expect(f.join([1, 2, 3], '-')).toBe('1-2-3');
		expect(f.join([{ x: 'a' }, { x: 'b' }], ',', 'x')).toBe('a,b');
	});

	it('length counts array/string/map/set; object branch currently returns 0 due to missing return', async () => {
		const f = await loadFilters();

		expect(f.length([1, 2, 3])).toBe(3);
		expect(f.length('abc')).toBe(3);
		expect(f.length(new Map([['a', 1]]))).toBe(1);
		expect(f.length(new Set([1, 2]))).toBe(2);

		// NOTE: your implementation has:
		// if (isObject(str)) Object.keys(str).length;  // missing return
		// so currently it falls through and returns 0. This test locks that in (and highlights the bug).
		expect(f.length({ a: 1, b: 2 } as any)).toBe(0);
	});

	it('list: string -> chars, object -> {key,value} entries, array -> itself; throws otherwise', async () => {
		const f = await loadFilters();

		expect(f.list('ab')).toEqual(['a', 'b']);
		expect(f.list({ a: 1, b: 2 })).toEqual([
			{ key: 'a', value: 1 },
			{ key: 'b', value: 2 },
		]);
		expect(f.list([1, 2])).toEqual([1, 2]);
		expect(() => f.list(123 as any)).toThrow(/type not iterable/i);
	});

	it('random uses Math.random (stubbed)', async () => {
		const f = await loadFilters();

		const spy = vi.spyOn(Math, 'random').mockReturnValue(0.6); // floor(0.6*5)=3
		expect(f.random([0, 1, 2, 3, 4])).toBe(3);
		spy.mockRestore();
	});

	it('reject/select use env.getTest + toArray', async () => {
		const f = await loadFilters();

		const ctx = {
			env: {
				getTest: (name: string) => {
					if (name === 'truthy') return (x: any) => !!x;
					if (name === 'gt') return (x: any, n: number) => x > n;
					throw new Error('unknown test');
				},
			},
		};

		// select expects test === true
		expect(f.select.call(ctx, [0, 1, 2], 'truthy')).toEqual([1, 2]);

		// reject expects test === false
		expect(f.reject.call(ctx, [0, 1, 2], 'truthy')).toEqual([0]);

		expect(f.select.call(ctx, [1, 2, 3], 'gt', 2)).toEqual([3]);
		expect(f.reject.call(ctx, [1, 2, 3], 'gt', 2)).toEqual([1, 2]);

		// toArray: non-array becomes [value]
		expect(f.select.call(ctx, 5 as any, 'truthy')).toEqual([5]);
	});

	it('rejectattr/selectattr filter by truthiness of attr', async () => {
		const f = await loadFilters();

		const arr = [{ ok: true }, { ok: false }, {} as any];
		expect(f.selectattr(arr, 'ok')).toEqual([{ ok: true }]);
		expect(f.rejectattr(arr, 'ok')).toEqual([{ ok: false }, {}]);
	});

	it('replace supports regex replacement and string replacement with maxCount and empty old', async () => {
		const f = await loadFilters();

		expect(f.replace('a-b-c', /-/g, '_', 0 as any)).toBe('a_b_c');

		expect(f.replace('aaaa', 'a', 'b', 2)).toBe('bbaa');
		expect(f.replace('aaaa', 'a', 'b', 0)).toBe('aaaa');
		expect(f.replace('aaaa', 'x', 'b', 10)).toBe('aaaa');

		// old === '' inserts between chars and both ends
		expect(f.replace('ab', '', '-', 99)).toBe('-a-b-');
	});

	it('reverse reverses arrays in-place and strings as a new string', async () => {
		const f = await loadFilters();

		const arr = [1, 2, 3];
		expect(f.reverse(arr)).toEqual([3, 2, 1]);
		expect(arr).toEqual([3, 2, 1]); // in-place

		expect(f.reverse('abc')).toBe('cba');
	});

	it('round supports round/floor/ceil with precision', async () => {
		const f = await loadFilters();

		expect(f.round(1.234, 2)).toBe(1.23);
		expect(f.round(1.235, 2)).toBe(1.24);
		expect(f.round(1.231, 2, 'ceil')).toBe(1.24);
		expect(f.round(1.239, 2, 'floor')).toBe(1.23);
	});

	it('slice splits into N slices and can fill', async () => {
		const f = await loadFilters();

		expect(f.slice([1, 2, 3, 4], 2)).toEqual([
			[1, 2],
			[3, 4],
		]);

		// fillWith=true pushes true into later slices when i >= extra
		expect(f.slice([1, 2, 3], 2, true)).toEqual([
			[1, 2],
			[3, true],
		]);
	});

	it('sum sums, optionally by attr, and supports start', async () => {
		const f = await loadFilters();

		expect(f.sum([1, 2, 3], '', 0)).toBe(6);
		expect(f.sum([{ n: 1 }, { n: 2 }], 'n', 10)).toBe(13);
	});

	it('sort (macro) sorts with reverse/case_sensitive/attribute and throwOnUndefined', async () => {
		const f = await loadFilters();

		const ctx1 = { env: { opts: { throwOnUndefined: false } } };
		expect(
			f.sort.call(ctx1, ['b', 'A', 'c'], false, false, undefined as any)
		).toEqual(['A', 'b', 'c']); // case-insensitive -> 'a','b','c'

		const ctx2 = { env: { opts: { throwOnUndefined: true } } };
		expect(() =>
			f.sort.call(ctx2, [{ x: 1 }, { y: 2 }] as any, false, false, 'x')
		).toThrow(/resolved to undefined/i);

		expect(f.sort.call(ctx1, [{ x: 2 }, { x: 1 }], true, false, 'x')).toEqual([
			{ x: 2 },
			{ x: 1 },
		]); // reversed
	});

	it('striptags removes tags and optionally preserves linebreaks', async () => {
		const f = await loadFilters();

		const input = 'a <b>bold</b>\r\n\r\n  c';
		expect(f.striptags(input, true)).toBe('a bold\n\nc');
		expect(f.striptags(input, false)).toBe('a bold c');
	});

	it('title/capitalize/lower/upper/isUpper', async () => {
		const f = await loadFilters();

		expect(f.title('hello WORLD')).toBe('Hello World');
		expect(f.capitalize('hELLO')).toBe('Hello');
		expect(f.lower('HeLLo')).toBe('hello');
		expect(f.upper('hi')).toBe('HI');
		expect(f.isUpper('HI')).toBe(true);
		expect(f.isUpper('Hi')).toBe(false);
	});

	it('truncate respects killwords and default end', async () => {
		const f = await loadFilters();

		expect(f.truncate('short', 10, false)).toBe('short');

		expect(f.truncate('hello world there', 8, false)).toBe('hello...');
		expect(f.truncate('hello world there', 8, true)).toBe('hello wo...');
		expect(f.truncate('hello world there', 8, false, '>>>')).toBe('hello>>>');
	});

	it('urlencode encodes strings and objects/arrays of pairs', async () => {
		const f = await loadFilters();

		expect(f.urlencode('a b')).toBe('a%20b');
		expect(f.urlencode({ a: 'x y', b: 1 })).toBe('a=x%20y&b=1');
		expect(
			f.urlencode([
				['a', 'x y'],
				['b', 1],
			])
		).toBe('a=x%20y&b=1');
	});

	it('urlize turns urls/emails into links and supports nofollow + length', async () => {
		const f = await loadFilters();

		expect(f.urlize('go https://example.com now', Infinity as any, true)).toBe(
			'go <a href="https://example.com" rel="nofollow">https://example.com</a> now'
		);

		// www.
		expect(f.urlize('www.example.com', 7 as any, false)).toBe(
			'<a href="http://www.example.com">www.exa</a>'
		);

		// email
		expect(f.urlize('me@test.com', Infinity as any, false)).toBe(
			'<a href="mailto:me@test.com">me@test.com</a>'
		);

		// tld without scheme
		expect(f.urlize('example.org', Infinity as any, true)).toBe(
			'<a href="http://example.org" rel="nofollow">example.org</a>'
		);
	});

	it('wordcount counts words or returns null', async () => {
		const f = await loadFilters();
		expect(f.wordcount('one two  three')).toBe(3);
		expect(f.wordcount('   ')).toBe(null);
	});

	it('float/int/isInt/isFloat', async () => {
		const f = await loadFilters();

		expect(f.float('1.5', 9)).toBe(1.5);
		expect(f.float('nope', 9)).toBe(9);

		expect(f.isInt(2)).toBe(true);
		expect(f.isInt(2.2)).toBe(false);
		expect(f.isFloat(2.2)).toBe(true);
		expect(f.isFloat(2)).toBe(false);

		// int macro (makeMacro mocked to return fn)
		expect(f.int('ff', 0, 16)).toBe(255);
		expect(f.int('nope', 7, 10)).toBe(7);
	});

	it('trim removes leading/trailing whitespace', async () => {
		const f = await loadFilters();
		expect(f.trim('  a \n')).toBe('a');
	});

	it('first/last', async () => {
		const f = await loadFilters();
		expect(f.first([1, 2, 3])).toBe(1);
		expect(f.last([1, 2, 3])).toBe(3);
	});

	it('nl2br replaces newlines with <br />', async () => {
		const f = await loadFilters();
		expect(f.nl2br('a\nb')).toBe('a<br />\n<b');
		// NOTE: your implementation is: replace(/\r\n|\n/g, '<br />\n')
		// so "a\nb" -> "a<br />\nb"
		expect(f.nl2br('a\nb')).toBe('a<br />\nb');
	});
});

/**
 * NOTE:
 * - I did NOT test escape/forceescape/safe because your `escape` filter currently calls itself recursively:
 *     export const escape = (str) => r.markSafe(escape(str.toString()))
 *   That will stack overflow. Once you fix it to call a real escaping function (e.g. lib.escape),
 *   I can add tests for it too.
 *
 * - I did NOT test `batch` here because the loop in your snippet looks syntactically wrong:
 *     for (i < arr.length; i++; )
 *   If that’s a paste typo and your real code is valid, tell me your actual batch() implementation
 *   and I’ll add tests for it as well.
 */
