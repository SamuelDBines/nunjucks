import { describe, it, expect } from 'vitest';
import { renderAST } from '../nunjucks-ts/src/interpreter';
import * as Runtime from '../nunjucks-ts/src/runtime';
import { Environment, Context } from '../nunjucks-ts/src/environment';
import { MemoryLoader } from '../nunjucks-ts/src/loader';
import {
	Root,
	Output,
	TemplateData,
	Symbol,
	Literal,
	Add,
} from '../nunjucks-ts/src/nodes';

import { parse } from '../nunjucks-ts/src/parser'; // whatever your parse entry is
import { transform } from '../nunjucks-ts/src/transformer';

function makeEnv() {
	const env = new Environment({
		autoescape: true,
		throwOnUndefined: false,
	});

	// add a couple baseline filters
	env.addFilter?.('upper', (s: any) => String(s).toUpperCase());
	env.addFilter?.('join', (arr: any, sep = ',') => (arr ?? []).join(sep));

	return env;
}

async function renderString(src: string, ctx: any = {}, env = makeEnv()) {
	const ast = transform(parse(src, [], env), []); // adjust args to your parse/transform signatures
	return renderAST(env, ast, ctx, Runtime);
}

describe('renderAST (manual AST)', () => {
	it('renders template data', async () => {
		const env = new Environment();
		const ast = new Root(0, 0);
		ast.children = [new Output(0, 0, [new TemplateData(0, 0, 'hello')])];

		const out = await renderAST(env, ast, {}, Runtime);
		expect(out).toBe('hello');
	});

	it('renders a variable lookup', async () => {
		const env = new Environment();
		const ast = new Root(0, 0);
		ast.children = [new Output(0, 0, [new Symbol(0, 0, 'name')])];

		const out = await renderAST(env, ast, { name: 'Sam' }, Runtime);
		expect(out).toBe('Sam');
	});

	it('renders an expression', async () => {
		const env = new Environment();
		const ast = new Root(0, 0);
		ast.children = [
			new Output(0, 0, [
				new Add(0, 0, new Literal(0, 0, 1), new Literal(0, 0, 2)),
			]),
		];

		const out = await renderAST(env, ast, {}, Runtime);
		expect(out).toBe('3');
	});
});

describe('renderString', () => {
	it('renders interpolation', async () => {
		const out = await renderString('Hello {{ name }}', { name: 'Sam' });
		expect(out).toBe('Hello Sam');
	});

	it('renders if', async () => {
		const out = await renderString('{% if ok %}YES{% else %}NO{% endif %}', {
			ok: true,
		});
		expect(out).toBe('YES');
	});

	it('renders for over array', async () => {
		const out = await renderString('{% for x in xs %}{{ x }}{% endfor %}', {
			xs: [1, 2, 3],
		});
		expect(out).toBe('123');
	});

	it('renders for over dict', async () => {
		const out = await renderString(
			'{% for k,v in obj %}{{k}}={{v}};{% endfor %}',
			{ obj: { a: 1, b: 2 } }
		);
		// order not guaranteed
		expect(out === 'a=1;b=2;' || out === 'b=2;a=1;').toBe(true);
	});
});

describe('Basic helpers', () => {
	it('renders a variable', async () => {
		const out = await renderString('Hello {{ name }}', { name: 'Sam' });
		expect(out).toBe('Hello Sam');
	});

	it('autoescapes by default', async () => {
		const out = await renderString('{{ x }}', { x: '<strong>hi</strong>' });
		expect(out).toBe('&lt;strong&gt;hi&lt;/strong&gt;');
	});
	it('supports arithmetic', async () => {
		const out = await renderString('{{ 2 + 3 * 4 }}');
		expect(out).toBe('14');
	});

	it('supports concat', async () => {
		const out = await renderString("{{ 'a' ~ 1 ~ 'b' }}");
		expect(out).toBe('a1b');
	});
	it('supports member lookup', async () => {
		const out = await renderString('{{ user.name }}', {
			user: { name: 'James' },
		});
		expect(out).toBe('James');
	});

	it('supports dynamic member lookup', async () => {
		const out = await renderString('{{ user[key] }}', {
			user: { a: 1 },
			key: 'a',
		});
		expect(out).toBe('1');
	});
	it('runs filters', async () => {
		const out = await renderString('{{ name | upper }}', { name: 'sam' });
		expect(out).toBe('SAM');
	});

	it('passes filter args', async () => {
		const out = await renderString("{{ xs | join(';') }}", { xs: [1, 2, 3] });
		expect(out).toBe('1;2;3');
	});
	it('supports if/else', async () => {
		const out = await renderString('{% if ok %}YES{% else %}NO{% endif %}', {
			ok: true,
		});
		expect(out).toBe('YES');
	});

	it('supports inline if', async () => {
		const out = await renderString("{{ ok ? 'Y' : 'N' }}", { ok: false });
		expect(out).toBe('N');
	});
	it('loops arrays', async () => {
		const out = await renderString('{% for x in xs %}{{ x }}{% endfor %}', {
			xs: [1, 2, 3],
		});
		expect(out).toBe('123');
	});

	it('for-else triggers on empty', async () => {
		const out = await renderString(
			'{% for x in xs %}X{% else %}EMPTY{% endfor %}',
			{ xs: [] }
		);
		expect(out).toBe('EMPTY');
	});
	it('set assigns variables', async () => {
		const out = await renderString('{% set a = 5 %}{{ a }}');
		expect(out).toBe('5');
	});

	it('set capture assigns rendered string', async () => {
		const out = await renderString(
			'{% set x %}hi {{ name }}{% endset %}{{ x }}',
			{ name: 'Sam' }
		);
		expect(out).toBe('hi Sam');
	});
	it('callExtension outputs content', async () => {
		const env = makeEnv();
		env.addExtension?.('testExt', {
			shout(_ctx: any, s: string) {
				return String(s).toUpperCase() + '!';
			},
		});

		const out = await renderString(
			"{% call testExt.shout('hi') %}{% endcall %}",
			{},
			env
		);
		expect(out).toContain('HI!');
	});
	it('include works', async () => {
		const env = new Environment({
			loaders: [
				new MemoryLoader({
					'a.html': "A{% include 'b.html' %}C",
					'b.html': 'B',
				}),
			],
		} as any);

		const out = (await env.render?.('a.html', {})) ?? ''; // or your env.getTemplate+render
		expect(out).toBe('ABC');
	});

	it('extends + blocks override', async () => {
		const env = new Environment({
			loaders: [
				new MemoryLoader({
					'base.html': 'X{% block content %}BASE{% endblock %}Y',
					'child.html':
						"{% extends 'base.html' %}{% block content %}CHILD{% endblock %}",
				}),
			],
		} as any);

		const out = (await env.render?.('child.html', {})) ?? '';
		expect(out).toBe('XCHILDY');
	});
});
