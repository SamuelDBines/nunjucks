// test/transformer.test.ts
import { describe, it, expect } from 'vitest';

// Adjust these import paths to match your repo
import { transform } from '../src/transformer';

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
	Super,
	Symbol,
	TemplateData,
	TemplateRef,
	UnaryOp,
	Value,
} from '../src/nodes';

function asNodeList(n: any) {
	expect(n).toBeInstanceOf(NodeList);
	return n;
}

function asOutput(n: any): typeof Not {
	expect(n).toBeInstanceOf(Output);
	return n;
}

function findAll(root: Node, Ctor: any) {
	return root.findAll(Ctor, []);
}

describe('transformer.ts', () => {
	it('lifts async filters inside Output into a preceding FilterAsync + replaces expression with a symbol hole', () => {
		const filterName = new Symbol(0, 0, 'af');
		const filterArgs = new NodeList(0, 0, [new Literal(0, 0, 'x')]);
		const filt = new Filter(0, 0, filterName, filterArgs);

		const out = new Output(0, 0, [filt]);
		const ast = new Root(0, 0, [out]);

		const res = transform(ast, ['af']) as Node;

		// Root children[0] becomes a NodeList: [FilterAsync, Output-with-hole]
		const top0 = res.children[0];
		const lifted = asNodeList(top0);

		expect(lifted.children[0]).toBeInstanceOf(FilterAsync);
		expect(lifted.children[1]).toBeInstanceOf(Output);

		const fa = lifted.children[0];
		const out2 = lifted.children[1];

		// Output now contains a Symbol hole instead of the Filter node
		expect(out2.children[0]).toBeInstanceOf(Symbol);
		const hole = out2.children[0];

		expect(fa.symbol).toBeInstanceOf(Symbol);
		expect(fa.symbol.value).toBe(hole.value);
	});

	it('does NOT lift filters inside Block (Block is treated as a boundary)', () => {
		const filterName = new Symbol(0, 0, 'af');
		const filterArgs = new NodeList(0, 0, [new Literal(0, 0, 'x')]);
		const filt = new Filter(0, 0, filterName, filterArgs);

		const out = new Output(0, 0, [filt]);
		const blockBody = new NodeList(0, 0, [out]);
		const block = new Block(0, 0, new Symbol(0, 0, 'content'), blockBody);

		const ast = new Root(0, 0, [block]);

		const res = transform(ast, ['af']);

		expect(findAll(res, FilterAsync).length).toBe(0);
		expect(findAll(res, Filter).length).toBe(1);
	});

	it('lifts super() inside Block body into a Super node + replaces call with a symbol', () => {
		const superCall = new FunCall(
			0,
			0,
			new Symbol(0, 0, 'super'),
			new NodeList(0, 0, [])
		);

		const out = new Output(0, 0, [superCall]);
		const body = new NodeList(0, 0, [out]);
		const blockName = new Symbol(0, 0, 'content');
		const block = new Block(0, 0, blockName, body);

		const ast = new Root(0, 0, [block]);

		const res = transform(ast, []) as Node;

		const block2 = res.children[0];
		expect(block2).toBeInstanceOf(Block);

		// Super node should be inserted at beginning of block body
		expect(block2.body).toBeInstanceOf(NodeList);
		const b2 = block2.body;

		expect(b2.children[0]).toBeInstanceOf(Super);
		const superNode = b2.children[0];

		// Output should still exist after Super
		expect(b2.children[1]).toBeInstanceOf(Output);
		const out2 = b2.children[1];

		// super() call replaced with a Symbol that matches Super.symbol
		expect(out2.children[0]).toBeInstanceOf(Symbol);
		const sym = out2.children[0];

		expect(superNode.symbol).toBeInstanceOf(Symbol);
		expect(superNode.symbol.value).toBe(sym.value);

		// Super should reference the block name
		expect(superNode.blockName).toBeInstanceOf(Symbol);
		expect(superNode.blockName.value).toBe('content');
	});

	it('converts If -> IfAsync when the If subtree contains async work (FilterAsync / CallExtensionAsync / etc.)', () => {
		// Put async filter inside the IF BODY (not the cond), so convertStatements will mark it async
		const filterName = new Symbol(0, 0, 'af');
		const filterArgs = new NodeList(0, 0, [new Literal(0, 0, 'x')]);
		const filt = new Filter(0, 0, filterName, filterArgs);

		const out = new Output(0, 0, [filt]);
		const ifBody = new NodeList(0, 0, [out]);

		const ifNode = new If(0, 0, new Literal(0, 0, true), ifBody, null);
		const ast = new Root(0, 0, [ifNode]);

		const res = transform(ast, ['af']) as Node;

		// If should become IfAsync
		const top = res.children[0];
		expect(top).toBeInstanceOf(IfAsync);
	});

	it('converts For -> AsyncEach when the For subtree contains async work', () => {
		const filterName = new Symbol(0, 0, 'af');
		const filterArgs = new NodeList(0, 0, [new Literal(0, 0, 'x')]);
		const filt = new Filter(0, 0, filterName, filterArgs);

		const out = new Output(0, 0, [filt]);
		const forBody = new NodeList(0, 0, [out]);

		const forNode = new For(
			0,
			0,
			new Symbol(0, 0, 'arr'),
			new Symbol(0, 0, 'item'),
			forBody,
			null
		);

		const ast = new Root(0, 0, [forNode]);

		const res = transform(ast, ['af']) as Node;

		const top = res.children[0];
		expect(top).toBeInstanceOf(AsyncEach);
	});

	it('is copy-on-write: if no transforms apply, it returns the same node references', () => {
		const out = new Output(0, 0, [new TemplateData(0, 0, 'hello')]);
		const ast = new Root(0, 0, [out]);

		const res = transform(ast, []) as Node;

		// No super, no filters lifted, no async conversion => should be same object graph
		expect(res).toBe(ast);
		expect(res.children[0]).toBe(out);
	});

	it('only lifts filters listed in asyncFilters (non-listed filters remain synchronous)', () => {
		const filterName = new Symbol(0, 0, 'syncFilter');
		const filterArgs = new NodeList(0, 0, [new Literal(0, 0, 'x')]);
		const filt = new Filter(0, 0, filterName, filterArgs);

		const out = new Output(0, 0, [filt]);
		const ast = new Root(0, 0, [out]);

		const res = transform(ast, ['af']) as Node;

		expect(findAll(res, FilterAsync).length).toBe(0);
		expect(findAll(res, Filter).length).toBe(1);

		// And Output should remain Output at top-level
		expect(res.children[0]).toBeInstanceOf(Output);
	});
});
