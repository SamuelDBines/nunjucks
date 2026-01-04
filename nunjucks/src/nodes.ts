//Done: Sun 4th Jan 2026 (maybe everything should be async by default)
import { dump, p } from './lib';

function traverseAndCheck(obj: Node, type: NodeTypeValue, results: any[]) {
	if (obj instanceof type) {
		results?.push(obj);
	}

	if (obj instanceof Node) {
		obj.findAll(type, results);
	}
}
export abstract class Node {
	children: Node[] = [];
	body?: Node;
	constructor(
		public lineno = 0,
		public colno = 0, // public extname = '', // public __typename: string = this.constructor.name, // public fields: string[] = []
		public value?: any
	) {}

	abstract get typename(): NodeTypeKey;

	get fields(): readonly string[] {
		return (this.constructor as typeof Node).fields;
	}

	static readonly fields: readonly string[] = [];
	findAll(this: Node, type: NodeTypeValue, results: any[] = []) {
		if (this instanceof NodeList) {
			this.children.forEach((child) => traverseAndCheck(child, type, results));
		} else {
			this.fields.forEach((field: any) =>
				traverseAndCheck(this[field], type, results)
			);
		}

		return results;
	}
	iterFields(this: any, func: Function) {
		this.fields.forEach((field: any) => {
			func(this[field], field);
		});
	}
}

export class Slice extends Node {
	constructor(
		lineno: number,
		colno: number,
		public start?: Literal,
		public stop?: Literal,
		public step?: Literal
	) {
		super(lineno, colno);
		this.start = start || new NodeList();
		this.stop = stop;
		this.step = step;
	}

	static readonly fields = ['start', 'stop', 'step'] as const;
	get typename() {
		return 'Slice' as NodeTypeKey;
	}
}

export class FromImport extends Node {
	constructor(
		lineno: number,
		colno: number,
		public template?: string,
		public names?: NodeList,
		public withContext?: any
	) {
		super(lineno, colno);
		(this.names = names || new NodeList()), (this.template = template);
		this.names = names;
		this.withContext = withContext;
	}

	static readonly fields = ['template', 'names', 'withContext'] as const;
	get typename() {
		return 'FromImport' as NodeTypeKey;
	}
}

export class Pair extends Node {
	constructor(
		lineno: number,
		colno: number,
		public key?: any,
		value: any = null
	) {
		super(lineno, colno);
		this.key = key;
		this.value = value;
	}
	static readonly fields = ['key', 'value'] as const;
	get typename() {
		return 'Pair' as NodeTypeKey;
	}
}

export class LookupVal extends Node {
	constructor(
		lineno: number,
		colno: number,
		public target?: any,
		public val?: any
	) {
		super(lineno, colno);
		this.target = target;
		this.val = val;
	}
	static readonly fields = ['target', 'val'] as const;
	get typename() {
		return 'LookupVal' as NodeTypeKey;
	}
}
export class If extends Node {
	constructor(
		lineno: number,
		colno: number,
		public cond?: any,
		body?: any,
		public else_?: any
	) {
		super(lineno, colno);
		this.cond = cond;
		this.body = body;
		this.else_ = else_;
	}
	static readonly fields = ['cond', 'body', 'else_'] as const;
	get typename() {
		return 'If' as NodeTypeKey;
	}
}

export class InlineIf extends Node {
	constructor(
		lineno: number,
		colno: number,
		public cond?: any,
		body?: any,
		public else_?: any
	) {
		super(lineno, colno);
		this.cond = cond;
		this.body = body;
		this.else_ = else_;
	}
	static readonly fields = ['cond', 'body', 'else_'] as const;
	get typename() {
		return 'InlineIf' as NodeTypeKey;
	}
}

export class For extends Node {
	static readonly fields = ['arr', 'name', 'body', 'else_'] as const;
	constructor(
		lineno: number,
		colno: number,
		public arr: any = [],
		public name?: Symbol,
		body?: any,
		public else_?: any
	) {
		super(lineno, colno);
		this.arr = arr;
		this.name = name;
		this.body = body;
		this.else_ = else_;
	}
	get typename() {
		return 'For' as NodeTypeKey;
	}
}

export class Macro extends Node {
	constructor(
		lineno: number,
		colno: number,
		public name?: Symbol,
		public args?: any,
		body?: NodeList
	) {
		super(lineno, colno);
		this.name = name;
		this.args = args;
		this.body = body;
	}
	static fields = ['name', 'args', 'body'];
	get typename() {
		return 'Macro' as NodeTypeKey;
	}
}
export class Import extends Node {
	static readonly fields = ['template', 'target', 'withContext'] as const;
	get typename() {
		return 'Import' as NodeTypeKey;
	}

	constructor(
		lineno: number,
		colno: number,
		public template?: any,
		public target?: any,
		public withContext?: any
	) {
		super(lineno, colno);
		this.template = template;
		this.target = target;
		this.withContext = withContext;
	}
}

export class Block extends Node {
	constructor(
		lineno: number,
		colno: number,
		public body?: any,
		public name?: Node | Value
	) {
		super(lineno, colno);
		this.name = name;
		this.body = body;
	}
	static readonly fields = ['name', 'body'] as const;
	get typename() {
		return 'Block' as NodeTypeKey;
	}
}

export class Super extends Node {
	constructor(
		lineno: number,
		colno: number,
		public blockName?: any,
		public symbol?: Symbol
	) {
		super(lineno, colno);
		this.blockName = blockName;
		this.symbol = symbol;
	}
	static readonly fields = ['blockName', 'symbol'] as const;
	get typename() {
		return 'Super' as NodeTypeKey;
	}
}
export class TemplateRef extends Node {
	constructor(lineno: number, colno: number, public template?: any) {
		super(lineno, colno);
		this.template = template;
	}
	static readonly fields = ['template'] as const;
	get typename() {
		return 'TemplateRef' as NodeTypeKey;
	}
}

export class FunCall extends Node {
	constructor(
		lineno: number,
		colno: number,
		public name?: Node,
		public args?: any
	) {
		super(lineno, colno);
		this.name = name;
		this.args = args;
	}
	static readonly fields = ['name', 'args'] as const;
	get typename() {
		return 'FunCall' as NodeTypeKey;
	}
}

export class Include extends Node {
	constructor(
		lineno: number,
		colno: number,
		public template?: any[],
		public ignoreMissing: boolean = false
	) {
		super(lineno, colno);
		this.template = template;
		this.ignoreMissing = ignoreMissing;
	}
	static readonly fields = ['template', 'ignoreMissing'] as const;
	get typename() {
		return 'Include' as NodeTypeKey;
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
		return 'Set' as NodeTypeKey;
	}
}

export class Switch extends Node {
	constructor(
		lineno: number,
		colno: number,
		public expr?: any,
		public cases?: any,
		public _default?: any
	) {
		super(lineno, colno);
		this.expr = expr || '';
		this.cases = cases;
		this._default = _default;
	}
	static readonly fields = ['expr', 'cases', 'default'] as const;
	get typename() {
		return 'Switch' as NodeTypeKey;
	}
}

export class Case extends Node {
	constructor(lineno: number, colno: number, public cond?: any, body?: any) {
		super(lineno, colno);
		this.cond = cond;
		this.body = body;
	}
	static readonly fields = ['cond', 'body'] as const;
	get typename() {
		return 'Case' as NodeTypeKey;
	}
}

export class Output extends Node {
	get typename() {
		return 'Output' as NodeTypeKey;
	}
	constructor(lineno: number, colno: number, args?: Node[]) {
		super(lineno, colno);
		this.children = args;
	}
}

export class Capture extends Node {
	constructor(lineno: number, colno: number, body?: NodeList) {
		super(lineno, colno);
		this.body = body;
	}
	static readonly fields = ['body'] as const;
	get typename() {
		return 'Capture' as NodeTypeKey;
	}
}

export class UnaryOp extends Node {
	constructor(lineno: number, colno: number, public target?: any) {
		super(lineno, colno);
		this.target = target;
	}
	static readonly fields = ['target'] as const;
	get typename() {
		return 'UnaryOp' as NodeTypeKey;
	}
}

export class BinOp extends Node {
	constructor(
		lineno: number,
		colno: number,
		public left?: any,
		public right?: any
	) {
		super(lineno, colno);
		this.right = right;
	}
	static readonly fields = ['left', 'right'] as const;
	get typename() {
		return 'BinOp' as NodeTypeKey;
	}
}

export class Compare extends Node {
	constructor(
		lineno: number,
		colno: number,
		public expr?: any,
		public ops: any[] = []
	) {
		super(lineno, colno);
		this.expr = expr;
		this.ops = ops;
	}
	static readonly fields = ['expr', 'ops'] as const;
	get typename() {
		return 'Compare' as NodeTypeKey;
	}
}

export class CompareOperand extends Node {
	constructor(
		lineno: number,
		colno: number,
		public expr?: any,
		public type?: any
	) {
		super(lineno, colno);
		this.expr = expr;
		this.type = type;
	}
	static readonly fields = ['expr', 'type'] as const;
	get typename() {
		return 'CompareOperand' as NodeTypeKey;
	}
}

export class CallExtension extends Node {
	extname: string;
	autoescape: any;
	static readonly fields = ['extname', 'prop', 'args', 'contentArgs'] as const;
	get typename() {
		return 'CallExtension' as NodeTypeKey;
	}
	constructor(
		lineno: number,
		colno: number,
		public ext?: { __name: string; autoescape: any } | string,
		public prop?: any,
		public args?: NodeList,
		public contentArgs = []
	) {
		super(lineno, colno);
		// this.parent();
		this.extname = typeof ext === 'string' ? ext : ext.__name || '';
		this.prop = prop;
		this.args = args || new NodeList();
		this.contentArgs = contentArgs;
		this.autoescape = !(typeof ext === 'string') && ext.autoescape;
	}
}

export class Value extends Node {
	static readonly fields = ['value'] as const;
	get typename() {
		return 'Value' as NodeTypeKey;
	}
	constructor(lineno: number, colno: number, public value?: any) {
		super(lineno, colno);
		this.value = value;
	}
}

export class Literal extends Value {
	get typename() {
		return 'Literal' as NodeTypeKey;
	}
}
export class Symbol extends Value {
	get typename() {
		return 'Symbol' as NodeTypeKey;
	}
}
export class NodeList extends Node {
	children: Node[] = [];
	static readonly fields = ['children'] as const;
	get typename() {
		return 'NodeList' as NodeTypeKey;
	}
	constructor(lineno: number = 0, colno: number = 0, children?: Node[]) {
		super(lineno, colno);
		this.children = children;
	}

	addChild(node: Node) {
		this.children?.push(node);
	}
}

export class Root extends NodeList {
	get typename() {
		return 'Root' as NodeTypeKey;
	}
}
export class Group extends NodeList {
	get typename() {
		return 'Group' as NodeTypeKey;
	}
}

export class ArrayNode extends NodeList {
	get typename() {
		return 'Array' as NodeTypeKey;
	}
}

export class Dict extends NodeList {
	get typename() {
		return 'Dict' as NodeTypeKey;
	}
}

export class IfAsync extends If {
	get typename() {
		return 'IfAsync' as NodeTypeKey;
	}
}
export class AsyncEach extends For {
	get typename() {
		return 'AsyncEach' as NodeTypeKey;
	}
}

export class AsyncAll extends For {
	get typename() {
		return 'AsyncAll' as NodeTypeKey;
	}
}

export class Caller extends Macro {
	get typename() {
		return 'Caller' as NodeTypeKey;
	}
}

export class Filter extends Macro {
	get typename() {
		return 'Filter' as NodeTypeKey;
	}
}

// @ts-ignore
export class FilterAsync extends Filter {
	static override readonly fields: readonly string[] = [
		'name',
		'args',
		'symbol',
	];
	constructor(
		lineno: number,
		colno: number,
		public name?: Symbol,
		public args?: any,
		public symbol?: Symbol
	) {
		super(lineno, colno, name, args);
		this.name = name;
		this.args = args;
		this.symbol = symbol;
	}
	get typename() {
		return 'FilterAsync' as NodeTypeKey;
	}
}

export class KeywordArgs extends Dict {
	constructor(lineno: number = 0, colno: number = 0) {
		super(lineno, colno);
	}
	get typename() {
		return 'KeywordArgs' as NodeTypeKey;
	}
}

export class Extends extends TemplateRef {
	get typename() {
		return 'Extends' as NodeTypeKey;
	}
}

export class TemplateData extends Literal {
	get typename() {
		return 'TemplateData' as NodeTypeKey;
	}
}

export class In extends BinOp {
	get typename() {
		return 'In' as NodeTypeKey;
	}
}

export class Is extends BinOp {
	get typename() {
		return 'Is' as NodeTypeKey;
	}
}
export class Or extends BinOp {
	get typename() {
		return 'Or' as NodeTypeKey;
	}
}

export class And extends BinOp {
	get typename() {
		return 'And' as NodeTypeKey;
	}
}

export class Add extends BinOp {
	get typename() {
		return 'Add' as NodeTypeKey;
	}
}

export class Concat extends BinOp {
	get typename() {
		return 'Concat' as NodeTypeKey;
	}
}

export class Sub extends BinOp {
	get typename() {
		return 'Sub' as NodeTypeKey;
	}
}
export class Mul extends BinOp {
	get typename() {
		return 'Mul' as NodeTypeKey;
	}
}

export class Div extends BinOp {
	get typename() {
		return 'Div' as NodeTypeKey;
	}
}
export class FloorDiv extends BinOp {
	get typename() {
		return 'FloorDiv' as NodeTypeKey;
	}
}
export class Mod extends BinOp {
	get typename() {
		return 'Mod' as NodeTypeKey;
	}
}
export class Pow extends BinOp {
	get typename() {
		return 'Pow' as NodeTypeKey;
	}
}
export class Not extends UnaryOp {
	get typename() {
		return 'Not' as NodeTypeKey;
	}
}

export class Neg extends UnaryOp {
	get typename() {
		return 'Neg' as NodeTypeKey;
	}
}
export class Pos extends UnaryOp {
	get typename() {
		return 'Pos' as NodeTypeKey;
	}
}

export class CallExtensionAsync extends CallExtension {
	name: any; // todo remove this
	get typename() {
		return 'CallExtensionAsync' as NodeTypeKey;
	}
}

function print(str: string, indent: number = 0, inline: boolean = false) {
	const lines = str.split('\n');

	lines.forEach((line, i) => {
		if (line && ((inline && i > 0) || !inline)) {
			process.stdout.write(' '.repeat(indent));
		}
		const nl = i === lines?.length - 1 ? '' : '\n';
		process.stdout.write(`${line}${nl}`);
	});
}

// Print the AST in a nicely formatted tree format for debuggin
export function printNodes(node: any, indent: number = 0) {
	p.log(node?.typename + ': ', indent);

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
				nodes?.push([fieldName, val]);
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
	NodeList,
	Not,
	Or,
	Output,
	Pair,
	Pos,
	Pow,
	Root,
	Set,
	Slice,
	Sub,
	Super,

	Switch,
	Symbol,
	TemplateData,
	Value,
} as const;

export type NodeTypeKey = keyof typeof NodeTypes;
export type NodeTypeValue = (typeof NodeTypes)[NodeTypeKey];
export const NodeCreator = (key: NodeTypeKey) => {
	switch (key) {
		case 'Add':
			return Add;
		case 'And':
			return And;
		case 'Array':
			return ArrayNode;
		case 'AsyncEach':
			return AsyncEach;
		case 'AsyncAll':
			return AsyncAll;
		case 'BinOp':
			return BinOp;
		case 'Block':
			return Block;
		case 'Caller':
			return Caller;
		case 'CallExtension':
			return CallExtension;
		case 'CallExtensionAsync':
			return CallExtensionAsync;
		case 'Capture':
			return Capture;
		case 'Case':
			return Case;
		case 'Compare':
			return Compare;
		case 'CompareOperand':
			return CompareOperand;
		case 'Concat':
			return Concat;
		case 'Dict':
			return Dict;
		case 'Div':
			return Div;
		case 'Extends':
			return Extends;
		case 'Filter':
			return Filter;
		case 'FilterAsync':
			return FilterAsync;
		case 'FloorDiv':
			return FloorDiv;
		case 'For':
			return For;
		case 'FromImport':
			return FromImport;
		case 'FunCall':
			return FunCall;
		case 'Group':
			return Group;
		case 'If':
			return If;
		case 'IfAsync':
			return IfAsync;
		case 'Import':
			return Import;
		case 'In':
			return In;
		case 'Include':
			return Include;
		case 'InlineIf':
			return InlineIf;
		case 'Is':
			return Is;
		case 'KeywordArgs':
			return KeywordArgs;
		case 'Literal':
			return Literal;
		case 'LookupVal':
			return LookupVal;
		case 'Macro':
			return Macro;
		case 'Mod':
			return Mod;
		case 'Mul':
			return Mul;
		case 'Neg':
			return Neg;
		case 'NodeList':
			return NodeList;
		case 'Not':
			return Not;
		case 'Or':
			return Or;
		case 'Output':
			return Output;
		case 'Pair':
			return Pair;
		case 'Pos':
			return Pos;
		case 'Pow':
			return Pow;
		case 'Root':
			return Root;
		case 'Set':
			return Set;
		case 'Slice':
			return Slice;
		case 'Sub':
			return Sub;
		case 'Super':
			return Super;
		case 'Switch':
			return Switch;
		case 'Symbol':
			return Symbol;
		case 'TemplateData':
			return TemplateData;
		case 'Value':
			return Value;

		default:
			throw new Error(`No node type found: ${key}`);
	}
};
