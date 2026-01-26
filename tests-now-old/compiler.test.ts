// test/compilers.test.ts
import { describe, it, expect } from 'vitest';

// IMPORTANT: adjust import paths to match your repo layout
import * as compilers from '../src/lcompiler.unused';

const compile = (
	src: string,
	opts: any = {},
	asyncFilters: string[] = [],
	extensions: any[] = [],
	name = 'test.njk'
) => compilers.compile(src, asyncFilters, extensions, name, opts);

describe('compilers.ts', () => {
	it('emits a root render function wrapper', () => {
		const code = compile('hello');
		expect(code).toContain('function root(env, context, frame, runtime, cb)');
		expect(code).toContain('var output = ""');
		expect(code).toContain('cb(null, output)');
	});

	it('compiles TemplateData as direct string concat (no suppressValue)', () => {
		const code = compile('hello world');
		expect(code).toMatch(/output\s*\+=\s*".*hello world.*";/);
		expect(code).not.toContain('runtime.suppressValue("hello world"');
	});

	it('compiles {{ name }} using suppressValue + contextOrFrameLookup', () => {
		const code = compile('{{ name }}');
		expect(code).toContain('runtime.suppressValue(');
		expect(code).toContain(
			'runtime.contextOrFrameLookup(context, frame, "name")'
		);
		expect(code).toContain(', env.opts.autoescape);');
	});

	it('when throwOnUndefined is true, wraps expressions with runtime.ensureDefined', () => {
		const code = compile('{{ name }}', { throwOnUndefined: true });
		expect(code).toContain('runtime.ensureDefined(');
		expect(code).toMatch(/runtime\.ensureDefined\([^)]*,\s*\d+,\s*\d+\)/);
	});

	it('compiles filters: {{ name | title }}', () => {
		const code = compile('{{ name | title }}');
		expect(code).toContain('env.getFilter("title").call(context,');
		expect(code).toContain(
			'runtime.contextOrFrameLookup(context, frame, "name")'
		);
	});

	it('compiles lookup: {{ user.name }} to runtime.memberLookup(target, val)', () => {
		const code = compile('{{ user.name }}');
		expect(code).toContain('runtime.memberLookup((');
		expect(code).toContain(
			'runtime.contextOrFrameLookup(context, frame, "user")'
		);
		expect(code).toContain('"name"');
	});

	it('compiles inline if: {{ a if b else c }}', () => {
		const code = compile('{{ a if b else c }}');
		expect(code).toContain('?');
		expect(code).toContain(':');
		expect(code).toContain('runtime.contextOrFrameLookup(context, frame, "a")');
		expect(code).toContain('runtime.contextOrFrameLookup(context, frame, "b")');
		expect(code).toContain('runtime.contextOrFrameLookup(context, frame, "c")');
	});

	it('compiles comparisons: {{ 1 < 2 }}', () => {
		const code = compile('{{ 1 < 2 }}');
		expect(code).toMatch(/1\s*<\s*2/);
	});

	it('escapes literal strings in generated JS', () => {
		const code = compile('{{ "a\\n\\"b\\"" }}');
		expect(code).toContain('"a\\n\\"b\\""');
	});

	it('compiles set assignment: {% set x = 3 %}', () => {
		const code = compile('{% set x = 3 %}');
		expect(code).toContain('frame.set("x"');
		expect(code).toContain('context.setVariable("x"');
	});

	it('compiles for-loop: {% for x in arr %}{{ x }}{% endfor %}', () => {
		const code = compile('{% for x in arr %}{{ x }}{% endfor %}');
		expect(code).toContain('frame = frame.push();');
		expect(code).toContain('runtime.fromIterator(');
		expect(code).toContain('for(var');
		expect(code).toContain('frame.set("x"');
		expect(code).toContain('frame.set("loop.index"');
		expect(code).toContain('frame.set("loop.last"');
	});

	it('compiles blocks and returns blocks object with b_<name>', () => {
		const code = compile('{% block content %}Hi{% endblock %}');
		expect(code).toContain(
			'function b_content(env, context, frame, runtime, cb)'
		);
		expect(code).toContain('return {');
		expect(code).toContain('b_content: b_content');
		expect(code).toContain('root: root');
	});

	it('compiles extends: sets parentTemplate and adds parent blocks', () => {
		const code = compile('{% extends "base.njk" %}');
		expect(code).toContain('parentTemplate = ');
		expect(code).toContain('context.addBlock');
	});

	it('compiles include: uses env.getTemplate and env.waterfall tasks', () => {
		const code = compile('{% include "partial.njk" %}');
		expect(code).toContain('env.getTemplate(');
		expect(code).toContain('env.waterfall(tasks');
	});

	it('runs extension preprocessors before parse/compile', () => {
		const ext = {
			preprocess(src: string) {
				return src.replace('[[NAME]]', '{{ name }}');
			},
		};

		const code = compile('Hello [[NAME]]', {}, [], [ext]);
		expect(code).toContain(
			'runtime.contextOrFrameLookup(context, frame, "name")'
		);
	});

	it('throws when dict keys are not string literals or names', () => {
		expect(() => compile('{{ { 1: 2 } }}')).toThrow(
			/Dict keys must be strings or names/i
		);
	});

	// ---------------------------
	// SMOKE EXECUTION TESTS
	// ---------------------------

	it('smoke: generated JS is valid and returns an object with root()', () => {
		const code = compile('hello');
		const props = new Function(code)(); // <-- should not throw
		expect(props).toBeTruthy();
		expect(typeof props.root).toBe('function');
	});

	it('smoke: root() executes and renders expected output', async () => {
		const code = compile('Hello {{ name }}');
		const props = new Function(code)();

		const env = {
			opts: { autoescape: true },
			getFilter: () => {
				throw new Error('not used in this template');
			},
			getTest: () => {
				throw new Error('not used in this template');
			},
			getExtension: () => {
				throw new Error('not used in this template');
			},
			waterfall: () => {
				throw new Error('not used in this template');
			},
			getTemplate: () => {
				throw new Error('not used in this template');
			},
		};

		const context: any = {
			ctx: { name: 'Sam' },
			// only needed for some tags; safe to include
			getVariables() {
				return this.ctx;
			},
			setVariable(k: string, v: any) {
				this.ctx[k] = v;
			},
			addExport() {},
			getBlock() {
				throw new Error('not used');
			},
		};

		const frame: any = {}; // minimal frame for this template

		const runtime = {
			suppressValue(val: any) {
				// nunjucks would autoescape; for smoke test, just stringify
				return val == null ? '' : String(val);
			},
			contextOrFrameLookup(ctx: any, _frame: any, key: string) {
				return ctx?.ctx?.[key];
			},
			handleError(e: any) {
				return e;
			},
		};

		const out = await new Promise<string>((resolve, reject) => {
			props.root(env, context, frame, runtime, (err: any, res: string) => {
				if (err) reject(err);
				else resolve(res);
			});
		});

		expect(out).toBe('Hello Sam');
	});
});
