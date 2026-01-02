import { Obj } from './loader';
import { dump, TypeOfChar } from './lib';

function traverseAndCheck(obj: Node, type: NodeTypeValue, results: any[]) {
	if (obj instanceof type) {
		results.push(obj);
	}

	if (obj instanceof Node) {
		obj.findAll(type, results);
	}
}

export class Node extends Obj {
	children: Node[] = [];
	extName: string = '';
	lineno: number = 0;
	colno: number = 0;
	name: any = '';
	fields: string[] = [];
	autoescape: boolean = true;
	value: any = null;
	key: any = null;
	// Unsure types
	cond: any = '';
	arr: any[] = [];
	body: any;
	else_: any;
	__typename: NodeTypeKey = 'Node';
	contentArgs: any;
	args: any;
	target: any;
	prop: any;

	constructor(...args: any[]) {
		super(...args);
	}

	get typename() {
		return this.__typename;
	}

	init(this: any, lineno: number, colno: number, ...args: any[]) {
		this.lineno = lineno;
		this.colno = colno;

		this.fields.forEach((field: string, i: number) => {
			// The first two args are line/col numbers, so offset by 2
			var val = arguments[i + 2];

			// Fields should never be undefined, but null. It makes
			// testing easier to normalize values.
			if (val === undefined) {
				val = null;
			}

			this[field] = val;
		});
	}

	findAll(this: any, type: string, results: any[] = []) {
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

export class Value extends Node {
	constructor(...args: any[]) {
		super(...args);
	}
	__typename: NodeTypeKey = 'Value';
	fields: string[] = ['value'];
}
export class NodeList extends Node {
	constructor(...args: any[]) {
		super(...args);
	}
	__typename: NodeTypeKey = 'NodeList';
	fields: string[] = ['children'];

	init(lineno: number, colno: number, nodes: Node[]) {
		super.init(lineno, colno, nodes || []);
	}

	addChild(node: Node) {
		this.children.push(node);
	}
}

export class FromImport extends Node {
	constructor(...args: any[]) {
		super(...args);
	}
	__typename: NodeTypeKey = 'FromImport';
	fields = ['template', 'names', 'withContext'];
	init(
		lineno: number,
		colno: number,
		template: string,
		names: NodeList,
		withContext: any
	) {
		super.init(lineno, colno, template, names || new NodeList(), withContext);
	}
}

export const Root = NodeList.extend('Root');
export const Literal = Value.extend('Literal');
export const Symbol = Value.extend('Symbol');
export const Group = NodeList.extend('Group');
export const ArrayNode = NodeList.extend('Array');
export const Pair = Node.extend('Pair', { fields: ['key', 'value'] });
export const Dict = NodeList.extend('Dict');
export const LookupVal = Node.extend('LookupVal', {
	fields: ['target', 'val'],
});
export const If = Node.extend('If', { fields: ['cond', 'body', 'else_'] });
export const IfAsync = If.extend('IfAsync');
export const InlineIf = Node.extend('InlineIf', {
	fields: ['cond', 'body', 'else_'],
});
export const For = Node.extend('For', {
	fields: ['arr', 'name', 'body', 'else_'],
});
export const AsyncEach = For.extend('AsyncEach');
export const AsyncAll = For.extend('AsyncAll');
export const Macro = Node.extend('Macro', { fields: ['name', 'args', 'body'] });
export const Caller = Macro.extend('Caller');
export const Import = Node.extend('Import', {
	fields: ['template', 'target', 'withContext'],
});

export const FunCall = Node.extend('FunCall', { fields: ['name', 'args'] });
export const Filter = FunCall.extend('Filter');
export const FilterAsync = Filter.extend('FilterAsync', {
	fields: ['name', 'args', 'symbol'],
});
export const KeywordArgs = Dict.extend('KeywordArgs');
export const Block = Node.extend('Block', { fields: ['name', 'body'] });
export const Super = Node.extend('Super', { fields: ['blockName', 'symbol'] });
export const TemplateRef = Node.extend('TemplateRef', { fields: ['template'] });
export const Extends = TemplateRef.extend('Extends');
export const Include = Node.extend('Include', {
	fields: ['template', 'ignoreMissing'],
});
export const Set = Node.extend('Set', { fields: ['targets', 'value'] });
export const Switch = Node.extend('Switch', {
	fields: ['expr', 'cases', 'default'],
});
export const Case = Node.extend('Case', { fields: ['cond', 'body'] });
export const Output = NodeList.extend('Output');
export const Capture = Node.extend('Capture', { fields: ['body'] });
export const TemplateData = Literal.extend('TemplateData');
export const UnaryOp = Node.extend('UnaryOp', { fields: ['target'] });
export const BinOp = Node.extend('BinOp', { fields: ['left', 'right'] });
export const In = BinOp.extend('In');
export const Is = BinOp.extend('Is');
export const Or = BinOp.extend('Or');
export const And = BinOp.extend('And');
export const Not = UnaryOp.extend('Not');
export const Add = BinOp.extend('Add');
export const Concat = BinOp.extend('Concat');
export const Sub = BinOp.extend('Sub');
export const Mul = BinOp.extend('Mul');
export const Div = BinOp.extend('Div');
export const FloorDiv = BinOp.extend('FloorDiv');
export const Mod = BinOp.extend('Mod');
export const Pow = BinOp.extend('Pow');
export const Neg = UnaryOp.extend('Neg');
export const Pos = UnaryOp.extend('Pos');
export const Compare = Node.extend('Compare', { fields: ['expr', 'ops'] });
export const CompareOperand = Node.extend('CompareOperand', {
	fields: ['expr', 'type'],
});
export const CallExtension = Node.extend('CallExtension', {
	init(
		ext: { __name: string; autoescape: any },
		prop: any,
		args: NodeList,
		contentArgs = []
	) {
		this.parent();
		this.extName = ext.__name || ext;
		this.prop = prop;
		this.args = args || new NodeList();
		this.contentArgs = contentArgs;
		this.autoescape = ext.autoescape;
	},
	fields: ['extName', 'prop', 'args', 'contentArgs'],
});
export const CallExtensionAsync = CallExtension.extend('CallExtensionAsync');

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
		print(`${node.extName}.${node.prop}\n`);

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
	Node: Node,
	Root: Root,
	NodeList: NodeList,
	Value: Value,
	Literal: Literal,
	Symbol: Symbol,
	Group: Group,
	Array: ArrayNode,
	Pair: Pair,
	Dict: Dict,
	Output: Output,
	Capture: Capture,
	TemplateData: TemplateData,
	If: If,
	IfAsync: IfAsync,
	InlineIf: InlineIf,
	For: For,
	AsyncEach: AsyncEach,
	AsyncAll: AsyncAll,
	Macro: Macro,
	Caller: Caller,
	Import: Import,
	FromImport: FromImport,
	FunCall: FunCall,
	Filter: Filter,
	FilterAsync: FilterAsync,
	KeywordArgs: KeywordArgs,
	Block: Block,
	Super: Super,
	Extends: Extends,
	Include: Include,
	Set: Set,
	Switch: Switch,
	Case: Case,
	LookupVal: LookupVal,
	BinOp: BinOp,
	Compare: Compare,
	CompareOperand: CompareOperand,
	CallExtension: CallExtension,
	CallExtensionAsync: CallExtensionAsync,
	In: In,
	Is: Is,
	And: And,
	Or: Or,
	Not: Not,
	Add: Add,
	Concat: Concat,
	Sub: Sub,
	Mul: Mul,
	Div: Div,
	FloorDiv: FloorDiv,
	Mod: Mod,
	Pow: Pow,
	Neg: Neg,
	Pos: Pos,
} as const;

export type NodeTypeKey = keyof typeof NodeTypes;
export type NodeTypeValue = (typeof NodeTypes)[NodeTypeKey];

export const NodeCreator = (key: NodeTypeKey) => {
	if (NodeTypes[key]) return NodeTypes[key];
	throw 'No node type found: ' + key;
};

export default {
	...NodeTypes,
	printNodes,
};
