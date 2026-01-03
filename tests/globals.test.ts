import { describe, it, expect } from 'vitest';
import globals, { precompileGlobal } from '../nunjucks-ts/src/globals';

describe('globals()', () => {
	it('returns a fresh object each call (no shared state)', () => {
		const g1 = globals();
		const g2 = globals();

		expect(g1).not.toBe(g2);
		expect(g1.range).not.toBe(g2.range); // methods are new per object literal
	});

	describe('range()', () => {
		it('creates a range from 0..stop-1 when called with one arg', () => {
			const { range } = globals();
			// TS signature says stop is required, but runtime supports one-arg call
			expect((range as any)(5)).toEqual([0, 1, 2, 3, 4]);
		});

		it('creates a range from start..stop-1 with positive step', () => {
			const { range } = globals();
			expect(range(2, 7, 2)).toEqual([2, 4, 6]);
			expect(range(2, 3, 1)).toEqual([2]);
			expect(range(2, 2, 1)).toEqual([]);
		});

		it('creates a descending range when step is negative', () => {
			const { range } = globals();
			expect(range(5, 0, -2)).toEqual([5, 3, 1]);
			expect(range(5, 5, -1)).toEqual([]);
		});

		it('defaults step to 1 if not provided (2-arg call)', () => {
			const { range } = globals();
			expect(range(3, 6)).toEqual([3, 4, 5]);
		});
	});

	describe('cycler()', () => {
		it('cycles through items and updates current', () => {
			const { cycler } = globals();
			const c = cycler('a', 'b', 'c');

			expect(c.current).toBeNull();

			expect(c.next()).toBe('a');
			expect(c.current).toBe('a');

			expect(c.next()).toBe('b');
			expect(c.current).toBe('b');

			expect(c.next()).toBe('c');
			expect(c.current).toBe('c');

			// wraps
			expect(c.next()).toBe('a');
			expect(c.current).toBe('a');
		});

		it('reset() clears state', () => {
			const { cycler } = globals();
			const c = cycler(1, 2);

			c.next();
			expect(c.current).toBe(1);

			c.reset();
			expect(c.current).toBeNull();

			expect(c.next()).toBe(1);
			expect(c.current).toBe(1);
		});

		it('empty cycler always returns null and current stays null', () => {
			const { cycler } = globals();
			const c = cycler();

			expect(c.current).toBeNull();
			expect(c.next()).toBeNull();
			expect(c.next()).toBeNull();
			expect(c.current).toBeNull();
		});

		it('each cycler instance has independent state', () => {
			const { cycler } = globals();
			const a = cycler('x', 'y');
			const b = cycler('x', 'y');

			expect(a.next()).toBe('x');
			expect(a.current).toBe('x');

			expect(b.current).toBeNull();
			expect(b.next()).toBe('x');
			expect(b.current).toBe('x');

			expect(a.next()).toBe('y');
			expect(b.next()).toBe('y');
		});
	});

	describe('joiner()', () => {
		it("returns '' the first time, then the separator afterwards", () => {
			const { joiner } = globals();
			const j = joiner(',');

			expect(j()).toBe('');
			expect(j()).toBe(',');
			expect(j()).toBe(',');
		});

		it("defaults separator to ','", () => {
			const { joiner } = globals();
			const j = joiner();

			expect(j()).toBe('');
			expect(j()).toBe(',');
		});

		it('each joiner has independent state', () => {
			const { joiner } = globals();
			const a = joiner('-');
			const b = joiner('-');

			expect(a()).toBe('');
			expect(a()).toBe('-');

			expect(b()).toBe('');
			expect(b()).toBe('-');
		});
	});
});

describe('precompileGlobal()', () => {
	it('produces a string that registers templates on window.nunjucksPrecompiled', () => {
		const out = precompileGlobal([
			{ name: 'a.njk', template: 'return { root: function(){} }' },
			{ name: 'b.njk', template: 'return { root: function(){} }' },
		]);

		expect(typeof out).toBe('string');

		// basic structure checks
		expect(out).toContain('window.nunjucksPrecompiled');
		expect(out).toContain('["a.njk"]');
		expect(out).toContain('["b.njk"]');
		expect(out).toContain('(function()');
		expect(out).toContain('})();');
	});

	it('embeds the template source and invokes it via an IIFE', () => {
		const tpl = "return { root: function(){ return 'ok' } }";
		const out = precompileGlobal([{ name: 'x', template: tpl }]);

		expect(out).toContain(tpl);
		expect(out).toContain('] = (function() {');
		expect(out).toContain('\n})();\n'); // template IIFE close
	});

	it('includes a render wrapper when opts.isFunction is true', () => {
		const out = precompileGlobal(
			[{ name: 'x', template: 'return { root: function(){} }' }],
			{ isFunction: true }
		);

		expect(out).toContain('return function(ctx, cb)');
		expect(out).toContain('nunjucks.render(');
		expect(out).toContain('"x"');
	});

	it('does not include the render wrapper when opts.isFunction is false/omitted', () => {
		const out1 = precompileGlobal([{ name: 'x', template: 'return {}' }]);
		const out2 = precompileGlobal([{ name: 'x', template: 'return {}' }], {
			isFunction: false,
		});

		expect(out1).not.toContain('return function(ctx, cb)');
		expect(out2).not.toContain('return function(ctx, cb)');
	});

	it('JSON stringifies template names (handles quotes safely)', () => {
		const name = 'weird"name';
		const out = precompileGlobal([{ name, template: 'return {}' }]);

		// JSON.stringify adds escaping
		expect(out).toContain(JSON.stringify(name));
	});
});
