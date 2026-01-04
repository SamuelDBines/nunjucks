import { describe, it, expect } from 'vitest';

// IMPORTANT: update this import path to where your nodes.ts exports live
import {
	Node,
	Value,
	NodeList,
	FromImport,
	Literal,
	Symbol,
	Pair,
	LookupVal,
	If,
	For,
	CallExtension,
	CallExtensionAsync,
	ArrayNode,
	Dict,
	Output,
	NodeCreator,
} from '../nunjucks-ts/src/nodes';

describe('nodes: base Node init + fields normalization', () => {
	it('Node.init assigns lineno/colno and maps fields from args (undefined -> null)', () => {
		const n = new Pair(10, 20, 'k', undefined); // Pair.fields = ['key','value']
		expect(n.lineno).toBe(10);
		expect(n.colno).toBe(20);
		expect(n.key).toBe('k');
		expect(n.value).toBe(null); // normalized
		expect(n.typename).toBe('Pair');
	});

	it('Value node sets value field', () => {
		const v = new Literal(1, 2, 123);
		expect(v.typename).toBe('Literal');
		expect(v.value).toBe(123);
	});
});

describe('nodes: NodeList behavior', () => {
	it('NodeList.init stores children and addChild appends', () => {
		const a = new Literal(0, 0, 'a');
		const b = new Literal(0, 0, 'b');

		const list = new NodeList(5, 6, [a]);
		expect(list.typename).toBe('NodeList');
		expect(list.children).toEqual([a]);

		list.addChild(b);
		expect(list.children).toEqual([a, b]);
	});
});

describe('nodes: FromImport defaults names to NodeList', () => {
	it('FromImport.init defaults names when falsy', () => {
		const fi = new FromImport(1, 2, 'tmpl.njk', null, true);
		expect(fi.typename).toBe('FromImport');
		expect(fi.template).toBe('tmpl.njk');
		expect(fi.withContext).toBe(true);
		expect(fi.names).toBeInstanceOf(NodeList);
	});
});

describe('nodes: findAll traversal', () => {
	it('findAll traverses fields for non-NodeList nodes', () => {
		// If.fields = ['cond','body','else_']
		const cond = new Symbol(1, 1, 'x');
		const body = new Output(1, 2, [new Literal(1, 3, 'yes')]);
		const elseBody = new Output(1, 4, [new Literal(1, 5, 'no')]);
		const node = new If(0, 0, cond, body, elseBody);

		const lits = node.findAll(Literal);
		expect(lits.map((n: any) => n.value)).toEqual(['yes', 'no']);

		const syms = node.findAll(Symbol);
		expect(syms).toHaveLength(1);
		expect(syms[0].value).toBe('x');
	});

	it('findAll traverses children for NodeList nodes', () => {
		const out = new Output(0, 0, [
			new Literal(0, 0, 'a'),
			new Literal(0, 0, 'b'),
		]);

		const lits = out.findAll(Literal);
		expect(lits.map((n: any) => n.value)).toEqual(['a', 'b']);
	});

	it('findAll returns empty when none found', () => {
		const n = new Pair(0, 0, 'k', 'v');
		expect(n.findAll(Symbol)).toEqual([]);
	});
});

describe('nodes: iterFields', () => {
	it('iterFields iterates (value, fieldName) for each field', () => {
		const p = new Pair(0, 0, 'k', 'v');
		const seen: Array<[string, any]> = [];
		p.iterFields((val: any, field: string) => {
			seen.push([field, val]);
		});

		expect(seen).toEqual([
			['key', 'k'],
			['value', 'v'],
		]);
	});
});

describe('nodes: extend() typename + inheritance', () => {
	it('extended nodes report typename from __typename (not constructor.name)', () => {
		const x = new Output(0, 0, []);
		expect(x.typename).toBe('Output'); // __typename set on class definition
	});

	it('IfAsync extends If and preserves fields', () => {
		// IfAsync = If.extend('IfAsync')
		const cond = new Symbol(0, 0, 'c');
		const body = new Output(0, 0, []);
		const else_ = new Output(0, 0, []);
		const n = new NodeCreator('IfAsync')(0, 0, cond, body, else_);
		expect(n.typename).toBe('IfAsync');

		// still has If fields assigned
		expect(n.cond).toBe(cond);
		expect(n.body).toBe(body);
		expect(n.else_).toBe(else_);
	});
});

describe('nodes: CallExtension custom init uses parent + sets props', () => {
	it('CallExtension.init sets extName/prop/args/contentArgs/autoescape and keeps lineno/colno', () => {
		const ext = { __name: 'MyExt', autoescape: false };
		const args = new Dict(9, 9, []);
		const contentArgs = [new Output(1, 1, [new Literal(1, 1, 'x')])];

		// Note: CallExtension.init signature differs: (ext, prop, args, contentArgs?)
		const n = new CallExtension(3, 4, ext, 'doThing', args, contentArgs);

		expect(n.typename).toBe('CallExtension');
		expect(n.lineno).toBe(3);
		expect(n.colno).toBe(4);

		expect(n.extname).toBe('MyExt');
		expect(n.prop).toBe('doThing');
		expect(n.args).toBe(args);
		expect(n.contentArgs).toBe(contentArgs);
		expect(n.autoescape).toBe(false);
	});

	it('CallExtension defaults args to new NodeList when falsy', () => {
		const ext = { __name: 'X', autoescape: true };
		const n = new CallExtension(0, 0, ext, 'p', null, null);

		expect(n.args).toBeInstanceOf(NodeList);
		expect(n.contentArgs).toBeNull(); // because your init sets contentArgs param directly
	});

	it('CallExtensionAsync extends CallExtension', () => {
		const ext = { __name: 'X', autoescape: true };
		const n = new CallExtensionAsync(0, 0, ext, 'p', null, []);
		expect(n.typename).toBe('CallExtensionAsync');
	});
});

describe('NodeCreator', () => {
	it('returns constructor for valid key', () => {
		const Ctor = NodeCreator('Pair');
		const p = new Ctor(1, 1, 'k', 'v');
		expect(p).toBeInstanceOf(Pair);
		expect(p.typename).toBe('Pair');
	});

	it('throws for invalid key', () => {
		// NodeCreator throws a string in your implementation
		expect(() => NodeCreator('Nope' as any)).toThrow(/No node type found/i);
	});
});
