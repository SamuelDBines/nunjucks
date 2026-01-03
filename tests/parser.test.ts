// test/parser.test.ts
import { describe, it, expect } from 'vitest';

// IMPORTANT: update these imports to your project structure
import parserMod from '../nunjucks-ts/src/parser';

import * as lexer from '../nunjucks-ts/src/lexer';
import {
	Add,
	And,
	ArrayNode,
	AsyncEach,
	AsyncAll,
	BinOp,
	Block,
	Caller,
	CallExtension,
	CallExtensionAsync,
	Capture,
	Case,
	Compare,
	CompareOperand,
	Concat,
	Dict,
	Div,
	Extends,
	Filter,
	FilterAsync,
	FloorDiv,
	For,
	FromImport,
	FunCall,
	Group,
	If,
	IfAsync,
	Import,
	In,
	Include,
	InlineIf,
	Is,
	KeywordArgs,
	Literal,
	LookupVal,
	Macro,
	Mod,
	Mul,
	Neg,
	Node,
	NodeList,
	Not,
	Or,
	Output,
	Pair,
	Pos,
	Pow,
	Root,
	Set,
	Sub,
	Switch,
	Symbol,
	TemplateData,
	TemplateRef,
	UnaryOp,
	Value,
} from '../nunjucks-ts/src/nodes';

function parseRoot(src: string, opts: any = {}, extensions?: any[]) {
	return parserMod.parse(src, extensions, opts) as any;
}

describe('parser.ts', () => {
	it('parses plain text into Output(TemplateData)', () => {
		const ast = parseRoot('hello');
		expect(ast).toBeInstanceOf(Root);
		expect(ast.children).toHaveLength(1);

		const out = ast.children[0];
		expect(out).toBeInstanceOf(Output);
		expect(out.children).toHaveLength(1);
		expect(out.children[0]).toBeInstanceOf(TemplateData);
		expect(out.children[0].value).toBe('hello');
	});

	it('parses variable output: {{ 1 + 2 }}', () => {
		const ast = parseRoot('{{ 1 + 2 }}');
		const out = ast.children[0];

		expect(out).toBeInstanceOf(Output);
		expect(out.children[0]).toBeInstanceOf(Add);

		const add = out.children[0] as any;
		expect(add.left).toBeInstanceOf(Literal);
		expect(add.right).toBeInstanceOf(Literal);
		expect(add.left.value).toBe(1);
		expect(add.right.value).toBe(2);
	});

	it('parses filters: {{ name | title }} into Filter node with args list', () => {
		const ast = parseRoot('{{ name | title }}');
		const out = ast.children[0];
		const filt = out.children[0];

		expect(filt).toBeInstanceOf(Filter);

		// Filter fields: ['name','args']
		expect((filt as any).name).toBeInstanceOf(Symbol);
		expect((filt as any).name.value).toBe('title');

		const args = (filt as any).args;
		expect(args).toBeInstanceOf(NodeList);
		// first arg is the piped expression (Symbol("name"))
		expect(args.children[0]).toBeInstanceOf(Symbol);
		expect(args.children[0].value).toBe('name');
	});

	it('parses filter with dotted name: {{ x | a.b.c }}', () => {
		const ast = parseRoot('{{ x | a.b.c }}');
		const filt = ast.children[0].children[0];
		expect(filt).toBeInstanceOf(Filter);
		expect((filt as any).name.value).toBe('a.b.c');
	});

	it('parses filter statement block: {% filter title %}Hi{% endfilter %}', () => {
		const ast = parseRoot('{% filter title %}Hi{% endfilter %}');
		expect(ast.children).toHaveLength(1);

		const out = ast.children[0];
		expect(out).toBeInstanceOf(Output);

		const node = out.children[0];
		expect(node).toBeInstanceOf(Filter);

		const name = (node as any).name;
		expect(name).toBeInstanceOf(Symbol);
		expect(name.value).toBe('title');

		const args = (node as any).args;
		expect(args).toBeInstanceOf(NodeList);

		// First arg is a Capture node containing the filtered body
		const cap = args.children[0];
		expect(cap).toBeInstanceOf(Capture);

		const capBody = (cap as any).body;
		expect(capBody).toBeInstanceOf(NodeList);
		expect(capBody.children[0]).toBeInstanceOf(Output);
		expect(capBody.children[0].children[0]).toBeInstanceOf(TemplateData);
		expect(capBody.children[0].children[0].value).toBe('Hi');
	});

	it('parses for-loop: {% for x in arr %}X{% endfor %}', () => {
		const ast = parseRoot('{% for x in arr %}X{% endfor %}');
		expect(ast.children).toHaveLength(1);

		const n = ast.children[0];
		expect(n).toBeInstanceOf(For);

		expect((n as any).name).toBeInstanceOf(Symbol);
		expect((n as any).name.value).toBe('x');

		expect((n as any).arr).toBeInstanceOf(Symbol);
		expect((n as any).arr.value).toBe('arr');

		const body = (n as any).body;
		expect(body).toBeInstanceOf(NodeList);
		expect(body.children[0]).toBeInstanceOf(Output);
		expect(body.children[0].children[0]).toBeInstanceOf(TemplateData);
		expect(body.children[0].children[0].value).toBe('X');
	});

	it('parses for-loop with else: {% for x in arr %}A{% else %}B{% endfor %}', () => {
		const ast = parseRoot('{% for x in arr %}A{% else %}B{% endfor %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(For);

		const body = (n as any).body;
		const else_ = (n as any).else_;

		expect(body.children[0].children[0].value).toBe('A');
		expect(else_.children[0].children[0].value).toBe('B');
	});

	it('parses if/elif/else nesting', () => {
		const ast = parseRoot('{% if a %}A{% elif b %}B{% else %}C{% endif %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(If);

		expect((n as any).cond).toBeInstanceOf(Symbol);
		expect((n as any).cond.value).toBe('a');

		// elif becomes else_ which is another If node
		const elifNode = (n as any).else_;
		expect(elifNode).toBeInstanceOf(If);
		expect((elifNode as any).cond.value).toBe('b');

		// elif's else_ is the else body NodeList
		const elseBody = (elifNode as any).else_;
		expect(elseBody).toBeInstanceOf(NodeList);
		expect(elseBody.children[0].children[0].value).toBe('C');
	});

	it('parses include with ignore missing', () => {
		const ast = parseRoot('{% include "a.njk" ignore missing %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(Include);
		expect((n as any).template).toBeInstanceOf(Literal);
		expect((n as any).template.value).toBe('a.njk');
		expect((n as any).ignoreMissing).toBe(true);
	});

	it('parses extends', () => {
		const ast = parseRoot('{% extends "base.njk" %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(Extends);
		expect((n as any).template.value).toBe('base.njk');
	});

	it('parses set assignment: {% set x = 3 %}', () => {
		const ast = parseRoot('{% set x = 3 %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(Set);

		expect((n as any).targets).toHaveLength(1);
		expect((n as any).targets[0]).toBeInstanceOf(Symbol);
		expect((n as any).targets[0].value).toBe('x');

		expect((n as any).value).toBeInstanceOf(Literal);
		expect((n as any).value.value).toBe(3);
	});

	it('parses set capture form: {% set x %}Hi{% endset %}', () => {
		const ast = parseRoot('{% set x %}Hi{% endset %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(Set);

		expect((n as any).targets[0].value).toBe('x');
		expect((n as any).value).toBeNull();
		expect((n as any).body).toBeInstanceOf(Capture);

		const capBody = ((n as any).body as any).body;
		expect(capBody.children[0].children[0].value).toBe('Hi');
	});

	it('parses macro and its signature: {% macro m(a, b=2) %}X{% endmacro %}', () => {
		const ast = parseRoot('{% macro m(a, b=2) %}X{% endmacro %}');
		const n = ast.children[0];
		expect(n).toBeInstanceOf(Macro);

		// name is a Symbol
		expect((n as any).name).toBeInstanceOf(Symbol);
		expect((n as any).name.value).toBe('m');

		// args is NodeList, last element KeywordArgs for b=2
		const args = (n as any).args;
		expect(args).toBeInstanceOf(NodeList);
		expect(args.children[0]).toBeInstanceOf(Symbol);
		expect(args.children[0].value).toBe('a');

		const last = args.children[args.children.length - 1];
		expect(last).toBeInstanceOf(KeywordArgs);
		expect((last as any).children[0]).toBeInstanceOf(Pair);
		expect(((last as any).children[0] as any).key.value).toBe('b');
		expect(((last as any).children[0] as any).value.value).toBe(2);

		// body contains TemplateData("X")
		expect((n as any).body.children[0].children[0].value).toBe('X');
	});

	it('parses call block into Output(FunCall) with caller kwarg', () => {
		const src = '{% call(x) foo(1) %}Body{% endcall %}';
		const ast = parseRoot(src);

		const out = ast.children[0];
		expect(out).toBeInstanceOf(Output);

		const fun = out.children[0];
		expect(fun).toBeInstanceOf(FunCall);

		const args = (fun as any).args.children;
		// last arg becomes KeywordArgs with caller Pair injected
		const last = args[args.length - 1];
		expect(last).toBeInstanceOf(KeywordArgs);

		const pair = (last as any).children.find(
			(p: any) => p.key?.value === 'caller'
		);
		expect(pair).toBeTruthy();
		expect(pair.value).toBeInstanceOf(Caller);

		// callerNode.body should contain "Body"
		const callerBody = pair.value.body;
		expect(callerBody.children[0].children[0].value).toBe('Body');
	});

	it('parses aggregates: (1,2), [1,2], {a:1}', () => {
		const ast1 = parseRoot('{{ (1, 2) }}');
		expect(ast1.children[0].children[0]).toBeInstanceOf(Group);
		expect((ast1.children[0].children[0] as any).children).toHaveLength(2);

		const ast2 = parseRoot('{{ [1, 2] }}');
		expect(ast2.children[0].children[0]).toBeInstanceOf(ArrayNode);
		expect((ast2.children[0].children[0] as any).children).toHaveLength(2);

		const ast3 = parseRoot('{{ {"a": 1} }}');
		expect(ast3.children[0].children[0]).toBeInstanceOf(Dict);
		const dictChildren = (ast3.children[0].children[0] as any).children;
		expect(dictChildren).toHaveLength(1);
		expect(dictChildren[0]).toBeInstanceOf(Pair);
		expect((dictChildren[0] as any).key.value).toBe('a');
		expect((dictChildren[0] as any).value.value).toBe(1);
	});

	it('parsePostfix: foo(1).bar[0]', () => {
		const ast = parseRoot('{{ foo(1).bar[0] }}');
		const expr = ast.children[0].children[0];

		// should end up as LookupVal(LookupVal(FunCall(Symbol(foo), [1]), Literal("bar")), Literal(0))
		expect(expr).toBeInstanceOf(LookupVal);
		const outer = expr as any;
		expect(outer.val).toBeInstanceOf(Literal);
		expect(outer.val.value).toBe(0);

		expect(outer.target).toBeInstanceOf(LookupVal);
		const inner = outer.target as any;
		expect(inner.val).toBeInstanceOf(Literal);
		expect(inner.val.value).toBe('bar');

		expect(inner.target).toBeInstanceOf(FunCall);
		expect((inner.target as any).name).toBeInstanceOf(Symbol);
		expect((inner.target as any).name.value).toBe('foo');
	});

	it('whitespace control: {%- ... -%} trims adjacent data', () => {
		const ast = parseRoot('A {%- if x -%}\n B \n{%- endif -%} C', {
			trimBlocks: true,
			lstripBlocks: true,
		});

		// Expect the outer text nodes to be trimmed around the control blocks.
		// This is intentionally "loose" because exact whitespace behavior depends on lexer opts.
		const templateData = ast
			.findAll(TemplateData as any)
			.map((n: any) => n.value);
		expect(templateData.join('')).toContain('A');
		expect(templateData.join('')).toContain('B');
		expect(templateData.join('')).toContain('C');

		// Ensure we did not keep leading newline after -%} when trimBlocks enabled
		// (again, loose check)
		expect(templateData.join('')).not.toContain('\n B \n');
	});

	it('extensions: unknown tag handled by extension.parse', () => {
		const ext = {
			tags: ['hello'],
			parse(p: any, ns: any, lx: any) {
				// consume tag name, then advance past block end
				p.nextToken(); // symbol "hello"
				p.advanceAfterBlockEnd('hello');
				return new ns.Output(0, 0, [new ns.TemplateData(0, 0, 'EXT')]);
			},
		};

		const ast = parseRoot('{% hello %}', {}, [ext]);
		expect(ast.children[0]).toBeInstanceOf(Output);
		expect(ast.children[0].children[0]).toBeInstanceOf(TemplateData);
		expect(ast.children[0].children[0].value).toBe('EXT');
	});

	it('throws on unknown block tag', () => {
		expect(() => parseRoot('{% doesnotexist %}')).toThrow(/unknown block tag/i);
	});

	it('advanceAfterVariableEnd throws if missing variable end', () => {
		// Use Parser directly so we can call method
		const toks = lexer.lex('{{ 1 ', {});
		const p = new parserMod.Parser(toks);
		// consume VARIABLE_START
		p.nextToken();
		p.parseExpression();
		expect(() => p.advanceAfterVariableEnd()).toThrow(/expected variable end/i);
	});
});
