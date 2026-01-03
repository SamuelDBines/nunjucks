import { dump } from './lib';

function traverseAndCheck(obj: Node, type: NodeTypeValue, results: any[]) {
	if (obj instanceof type) {
		results.push(obj);
	}

	if (obj instanceof Node) {
		obj.findAll(type, results);
	}
}
export abstract class Node {
	constructor(
		public lineno = 0,
		public colno = 0, // public extname = '', // public __typename: string = this.constructor.name, // public fields: string[] = []
		public value?: any
	) {}

	abstract get typename(): string;

	get fields(): readonly string[] {
		return (this.constructor as typeof Node).fields;
	}

	static readonly fields: readonly string[] = [];
	findAll(this: any, type: NodeTypeValue, results: any[] = []) {
		if (this instanceof NodeList) {
			this.children.forEach((child) => traverseAndCheck(child, type, results));
		} else {
			this.fields.forEach((field: any) =>
				traverseAndCheck(this[field], type, results)
			);
		}

		return results;
	}
}

export class FromImport extends Node {
	template: any;
	names: NodeList;
	withContext: any;
	constructor(
		lineno: number,
		colno: number,
		template: string,
		names: NodeList,
		withContext: any
	) {
		super(lineno, colno);
		(this.names = names || new NodeList()), (this.template = template);
		this.names = names;
		this.withContext = withContext;
	}

	static readonly fields = ['template', 'names', 'withContext'] as const;
	get typename() {
		return 'FromImport';
	}
}

export class Pair extends Node {
	key: any;
	constructor(lineno: number, colno: number, key: any, value: any) {
		super(lineno, colno);
		this.key = key;
		this.value = value;
	}
	static readonly fields = ['key', 'value'] as const;
	get typename() {
		return 'Pair';
	}
}

export class LookupVal extends Node {
	target: any;
	val: any;
	constructor(lineno: number, colno: number, target: any, val: any) {
		super(lineno, colno);
		this.target = target;
		this.val = val;
	}
	static readonly fields = ['target', 'val'] as const;
	get typename() {
		return 'LookupVal';
	}
}
export class If extends Node {
	cond: any;
	body: any;
	else_: any;
	constructor(lineno: number, colno: number, cond: any, body: any, else_: any) {
		super(lineno, colno);
		this.cond = cond;
		this.body = body;
		this.else_ = else_;
	}
	static readonly fields = ['cond', 'body', 'else_'] as const;
	get typename() {
		return 'If';
	}
}

export class InlineIf extends Node {
	cond: any;
	body: any;
	else_: any;
	constructor(
		lineno: number,
		colno: number,
		cond?: any,
		body?: any,
		else_?: any
	) {
		super(lineno, colno);
		this.cond = cond;
		this.body = body;
		this.else_ = else_;
	}
	static readonly fields = ['cond', 'body', 'else_'] as const;
	get typename() {
		return 'InlineIf';
	}
}

export class For extends Node {
	arr: any[] = [];
	name: string = '';
	body: any;
	else_: any;
	static readonly fields = ['arr', 'name', 'body', 'else_'] as const;
	constructor(
		lineno: number,
		colno: number,
		arr?: any[],
		name?: string,
		body?: any,
		else_?: any
	) {
		super(lineno, colno);
		this.arr = arr;
		this.name = name;
		this.body = body;
		this.else_ = else_;
	}
	get typename() {
		return 'For';
	}
}

export class Macro extends Node {
	name: Symbol;
	args: any;
	body: NodeList;
	constructor(
		lineno: number,
		colno: number,
		name: Symbol,
		args: any,
		body: NodeList
	) {
		super(lineno, colno);
		this.name = name;
		this.args = args;
		this.body = body;
	}
	static readonly fields = ['name', 'args', 'body'] as const;
	get typename() {
		return 'Macro';
	}
}
export class Import extends Node {
	static readonly fields = ['template', 'target', 'withContext'] as const;
	get typename() {
		return 'Import';
	}
	template: any;
	target: any;
	withContext: any;
	constructor(
		lineno: number,
		colno: number,
		template: any,
		target: any,
		withContext: any
	) {
		super(lineno, colno);
		this.template = template;
		this.target = target;
		this.withContext = withContext;
	}
}

export class Block extends Node {
	name: Node | string = '';
	body: any;
	constructor(
		lineno: number,
		colno: number,
		body?: any[],
		name?: Node | string
	) {
		super(lineno, colno);
		this.name = name || '';
		this.body = body;
	}
	static readonly fields = ['name', 'body'] as const;
	get typename() {
		return 'Block';
	}
}

export class Super extends Node {
	blockName: any;
	symbol: any;
	constructor(lineno: number, colno: number, blockName?: any, symbol?: any) {
		super(lineno, colno);
		this.blockName = blockName;
		this.symbol = symbol;
	}
	static readonly fields = ['blockName', 'symbol'] as const;
	get typename() {
		return 'Super';
	}
}
export class TemplateRef extends Node {
	template: any;
	constructor(lineno: number, colno: number, template?: any) {
		super(lineno, colno);
		this.template = template;
	}
	static readonly fields = ['template'] as const;
	get typename() {
		return 'TemplateRef';
	}
}

export class FunCall extends Node {
	name: Node;
	args: any;
	constructor(lineno: number, colno: number, name?: Node, args?: any) {
		super(lineno, colno);
		this.name = name;
		this.args = args;
	}
	static readonly fields = ['name', 'args'] as const;
	get typename() {
		return 'FunCall';
	}
}

export class Include extends Node {
	template: any;
	ignoreMissing: boolean;
	constructor(
		lineno: number,
		colno: number,
		template?: any[],
		ignoreMissing?: boolean
	) {
		super(lineno, colno);
		this.template = template;
		this.ignoreMissing = ignoreMissing;
	}
	static readonly fields = ['template', 'ignoreMissing'] as const;
	get typename() {
		return 'Include';
	}
}
export class Set extends Node {
	targets: any;
	constructor(lineno: number, colno: number, targets?: any[], value?: any) {
		super(lineno, colno);
		this.targets = targets || '';
		this.value = value;
	}
	static readonly fields = ['targets', 'value'] as const;
	get typename() {
		return 'Set';
	}
}

export class Switch extends Node {
	cases: any;
	expr: any;
	_default: any;
	constructor(
		lineno: number,
		colno: number,
		expr?: any,
		cases?: any,
		_default?: any
	) {
		super(lineno, colno);
		this.expr = expr || '';
		this.cases = cases;
		this._default = _default;
	}
	static readonly fields = ['expr', 'cases', 'default'] as const;
	get typename() {
		return 'Switch';
	}
}

export class Case extends Node {
	cond: any;
	body: any;
	constructor(lineno: number, colno: number, cond?: any, body?: any) {
		super(lineno, colno);
		this.cond = cond;
		this.body = body;
	}
	static readonly fields = ['cond', 'body'] as const;
	get typename() {
		return 'Case';
	}
}

export class Output extends Node {
	get typename() {
		return 'Output';
	}
	constructor(lineno: number, colno: number, args: any) {
		super(lineno, colno);
		// this.parent();
		// this.extname = ext.__name || ext;
		// this.prop = prop;
		// this.args = args || new NodeList();
		// this.contentArgs = contentArgs;
		// this.autoescape = ext.autoescape;
	}
}

export class Capture extends Node {
	body: NodeList;
	constructor(lineno: number, colno: number, body?: NodeList) {
		super(lineno, colno);
		this.body = body;
	}
	static readonly fields = ['body'] as const;
	get typename() {
		return 'Capture';
	}
}

export class UnaryOp extends Node {
	target: any;
	constructor(lineno: number, colno: number, target?: any) {
		super(lineno, colno);
		this.target = target;
	}
	static readonly fields = ['target'] as const;
	get typename() {
		return 'UnaryOp';
	}
}

export class BinOp extends Node {
	left: any;
	right: any;
	constructor(lineno: number, colno: number, left?: any, right?: any) {
		super(lineno, colno);
		this.right = right;
	}
	static readonly fields = ['left', 'right'] as const;
	get typename() {
		return 'BinOp';
	}
}

export class Compare extends Node {
	expr: any;
	ops: any[];
	constructor(lineno: number, colno: number, expr?: any, ops?: any[]) {
		super(lineno, colno);
		this.expr = expr;
		this.ops = ops;
	}
	static readonly fields = ['expr', 'ops'] as const;
	get typename() {
		return 'Compare';
	}
}

export class CompareOperand extends Node {
	expr: any;
	type: any;
	constructor(lineno: number, colno: number, expr?: any, type?: any) {
		super(lineno, colno);
		this.expr = expr;
		this.type = type;
	}
	static readonly fields = ['expr', 'type'] as const;
	get typename() {
		return 'CompareOperand';
	}
}

export class CallExtension extends Node {
	extname: string | object;
	prop: any;
	args: NodeList;
	contentArgs: any[] = [];
	autoescape: any;
	static readonly fields = ['extname', 'prop', 'args', 'contentArgs'] as const;
	get typename() {
		return 'CallExtension';
	}
	constructor(
		lineno: number,
		colno: number,
		ext: { __name: string; autoescape: any },
		prop: any,
		args: NodeList,
		contentArgs = []
	) {
		super(lineno, colno);
		// this.parent();
		this.extname = ext.__name || ext;
		this.prop = prop;
		this.args = args || new NodeList();
		this.contentArgs = contentArgs;
		this.autoescape = ext.autoescape;
	}
}

// export class Node extends Obj {
// 	children: Node[] = [];
// 	extname: string = '';
// 	lineno: number = 0;
// 	colno: number = 0;
// 	name: any = '';
// 	fields: string[] = [];
// 	autoescape: boolean = true;
// 	value: any = null;
// 	key: any = null;
// 	// Unsure types
// 	cond: any = '';
// 	arr: any[] = [];
// 	body: any;
// 	else_: any;
// 	__typename: NodeTypeKey = 'Node';
// 	contentArgs: any;
// 	args: any;
// 	target: any;
// 	prop: any;

// 	constructor(...args: any[]) {
// 		super(...args);
// 	}

// 	get typename() {
// 		return this.__typename;
// 	}

// 	init(this: any, lineno: number, colno: number, ...args: any[]) {
// 		this.lineno = lineno;
// 		this.colno = colno;

// 		this.fields?.forEach((field: string, i: number) => {
// 			// The first two args are line/col numbers, so offset by 2
// 			var val = arguments[i + 2];

// 			// Fields should never be undefined, but null. It makes
// 			// testing easier to normalize values.
// 			if (val === undefined) {
// 				val = null;
// 			}

// 			this[field] = val;
// 		});
// 	}

// 	findAll(this: any, type: string, results: any[] = []) {
// 		if (this instanceof NodeList) {
// 			this.children.forEach((child) => traverseAndCheck(child, type, results));
// 		} else {
// 			this.fields.forEach((field: any) =>
// 				traverseAndCheck(this[field], type, results)
// 			);
// 		}

// 		return results;
// 	}

// 	iterFields(this: any, func: Function) {
// 		this.fields.forEach((field: any) => {
// 			func(this[field], field);
// 		});
// 	}
// }

export class Value extends Node {
	static readonly fields = ['value'] as const;
	get typename() {
		return 'Value';
	}
	constructor(lineno: number, colno: number, val: string | number) {
		super(lineno, colno);
		this.value = val;
	}
}

export class Literal extends Value {
	get typename() {
		return 'Literal';
	}
}
export class Symbol extends Value {
	get typename() {
		return 'Symbol';
	}
}
export class NodeList extends Node {
	children: Node[] = [];
	static readonly fields = ['children'] as const;
	get typename() {
		return 'NodeList';
	}
	constructor(lineno: number = 0, colno: number = 0, children?: Node[]) {
		super(lineno, colno);
		this.children = children;
	}

	addChild(node: Node) {
		this.children.push(node);
	}
}

export class Root extends NodeList {
	get typename() {
		return 'Root';
	}
}
export class Group extends NodeList {
	get typename() {
		return 'Group';
	}
}

export class ArrayNode extends NodeList {
	get typename() {
		return 'Array';
	}
}

export class Dict extends NodeList {
	get typename() {
		return 'Dict';
	}
}

export class IfAsync extends If {
	get typename() {
		return 'IfAsync';
	}
}
export class AsyncEach extends For {
	get typename() {
		return 'AsyncEach';
	}
}

export class AsyncAll extends For {
	get typename() {
		return 'AsyncAll';
	}
}

export class Caller extends Macro {
	get typename() {
		return 'Caller';
	}
}

export class Filter extends Macro {
	get typename() {
		return 'Filter';
	}
}

export class FilterAsync extends Macro {
	static readonly fields = ['name', 'args', 'symbol'] as const;
	get typename() {
		return 'FilterAsync';
	}
}

export class KeywordArgs extends Dict {
	constructor(lineno: number = 0, colno: number = 0) {
		super(lineno, colno);
	}
	get typename() {
		return 'KeywordArgs';
	}
}

export class Extends extends TemplateRef {
	get typename() {
		return 'Extends';
	}
}

export class TemplateData extends Literal {
	get typename() {
		return 'TemplateData';
	}
}

export class In extends BinOp {
	get typename() {
		return 'In';
	}
}

export class Is extends BinOp {
	get typename() {
		return 'Is';
	}
}
export class Or extends BinOp {
	get typename() {
		return 'Or';
	}
}

export class And extends BinOp {
	get typename() {
		return 'And';
	}
}

export class Add extends BinOp {
	get typename() {
		return 'Add';
	}
}

export class Concat extends BinOp {
	get typename() {
		return 'Concat';
	}
}

export class Sub extends BinOp {
	get typename() {
		return 'Sub';
	}
}
export class Mul extends BinOp {
	get typename() {
		return 'Mul';
	}
}

export class Div extends BinOp {
	get typename() {
		return 'Div';
	}
}
export class FloorDiv extends BinOp {
	get typename() {
		return 'FloorDiv';
	}
}
export class Mod extends BinOp {
	get typename() {
		return 'Mod';
	}
}
export class Pow extends BinOp {
	get typename() {
		return 'Pow';
	}
}
export class Not extends UnaryOp {
	get typename() {
		return 'Not';
	}
}

export class Neg extends UnaryOp {
	get typename() {
		return 'Neg';
	}
}
export class Pos extends UnaryOp {
	get typename() {
		return 'Pos';
	}
}

export class CallExtensionAsync extends CallExtension {
	get typename() {
		return 'CallExtension';
	}
}

function print(str: string, indent: number = 0, inline: boolean = false) {
	const lines = str.split('\n');

	lines.forEach((line, i) => {
		if (line && ((inline && i > 0) || !inline)) {
			process.stdout.write(' '.repeat(indent));
		}
		const nl = i === lines.length - 1 ? '' : '\n';
		process.stdout.write(`${line}${nl}`);
	});
}

// Print the AST in a nicely formatted tree format for debuggin
function printNodes(node: any, indent: number = 0) {
	print(node.typename + ': ', indent);

	if (node instanceof NodeList) {
		print('\n');
		node.children.forEach((n) => {
			printNodes(n, indent + 2);
		});
	} else if (node instanceof CallExtension) {
		print(`${node.extname}.${node.prop}\n`);

		if (node.args) {
			printNodes(node.args, indent + 2);
		}

		if (node.contentArgs) {
			node.contentArgs.forEach((n: any) => {
				printNodes(n, indent + 2);
			});
		}
	} else {
		let nodes: any[] = [];
		let props: any = null;

		node.iterFields((val: any, fieldName: string) => {
			if (val instanceof Node) {
				nodes.push([fieldName, val]);
			} else {
				props = props || {};
				props[fieldName] = val;
			}
		});

		print(props ? dump(props, 2) + '\n' : '\n', 0, true);

		nodes.forEach(([fieldName, n]) => {
			print(`[${fieldName}] =>`, indent + 2);
			printNodes(n, indent + 4);
		});
	}
}

const NodeTypes = {
	Add,
	And,
	Array: ArrayNode,
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
	Super,

	Switch,
	Symbol,
	TemplateData,
	Value,
} as const;

export type INodeTypes = typeof NodeTypes;
export type NodeTypeKey = keyof typeof NodeTypes;
export type NodeTypeValue = (typeof NodeTypes)[NodeTypeKey];
export type NodeCtor<K extends NodeTypeKey> = (typeof NodeTypes)[K];

export const NodeCreator = (key: NodeTypeKey) => {
	if (NodeTypes[key]) return NodeTypes[key];
	throw 'No node type found: ' + key;
};

export default {
	...NodeTypes,
	printNodes,
};
