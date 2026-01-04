//TODO: Sun 4th Jan 2026 [Expand and write tests for each type.]
import { Environment, Context } from './environment';
import { p } from './lib';
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
} from './nodes';
import { collectBlocks, transform } from './transformer'
import { Frame } from './runtime';
import * as Runtime from './runtime';
import { parse } from './parser';
type RenderResult = string;

async function evalBinOp<T extends BinOp>(
	node: T,
	st: EvalState,
	fn: (l: any, r: any) => any
) {
	const left = await evalExpr(node.left, st);
	const right = await evalExpr(node.right, st);
	return fn(left, right);
}

function makeBlockFn(block: Block, env: Environment, runtime: typeof Runtime) {
  return async (context: Context, frame: Frame) => {
    const st: EvalState = { env, context, frame: frame.push(true), runtime, buffer: [] };
    await evalNode(block.body, st); 
    return st.buffer.join('');
  };
}

async function registerBlocksFromAst(root: Root, st: EvalState) {
  const blocks = collectBlocks(root);
  for (const b of blocks) {
    const name = b.name.value; // Block.name is Symbol in your AST
    st.context.addBlock(name, makeBlockFn(b, st.env, st.runtime));
  }
}

async function evalExtends(node: Extends, st: EvalState) {
  const parentStr = String(await evalExpr(node.template, st)); 

	await registerBlocksFromAst(st.rootAst, st);

	const info = await new Promise<any>((resolve, reject) => {
    st.env.getTemplateInfo(parentStr, { parentName: null }, (err: any, out: any) =>
      err ? reject(err) : resolve(out)
    );
  });

  const parentAst: any = transform(parse(info.src, [], st.env), []);

  // const parentTpl = await st.env.getTemplate(parentStr,undefined, {eagerCompile:true});
	// p.err('Parent string is: ',parentStr,  parentTpl.ast, parentTpl.root)
  // const parentAst: Root = parentTpl.ast ?? parentTpl.root; 
  // if (!parentAst) {
  //   throw st.runtime.handleError(
  //     new Error(`Parent template "${parentStr}" has no AST loaded`),
  //     node.lineno,
  //     node.colno
  //   );
  // }

  // const rendered = await new Promise<string>((resolve, reject) => {
  //   parentTpl.render(st.context.getVariables?.() ?? st.context, (err: any, res: string) =>
  //     err ? reject(err) : resolve(res)
  //   );
  // });
	const parentState: EvalState = {
    ...st,
    rootAst: parentAst,
    buffer: [],
    didExtend: false,
  };

  await evalNode(parentAst, parentState);
  write(st, parentState.buffer.join(""));

  // write(st, rendered);

  st.didExtend = true;
}

async function evalNodeListStmt(node: NodeList, st: EvalState) {
	for (const child of node.children) {
		await evalNode(child, st);
		if (st.didExtend) return;
	}
}

async function evalRoot(node: Root, st: EvalState) {
  await registerBlocksFromAst(node, st);
	await evalNodeListStmt(node as any as NodeList, st);
}

async function evalBlock(node: Block, st: EvalState) {
  const name = node.name.value;
  const fn = st.context.getBlock(name); // whatever your API is
  if (!fn) return;
  const rendered = await fn(st.context, st.frame);
  write(st, rendered);
}

async function evalBinOpHp(node: BinOp, st: EvalState, op: string) {
	switch (op) {
		case '||': {
			const left = await evalExpr(node.left, st);
			return left ? left : await evalExpr(node.right, st);
		}
		case '&&': {
			const left = await evalExpr(node.left, st);
			return left ? await evalExpr(node.right, st) : left;
		}
		case '+': {
			return evalBinOp(node, st, (l, r) => l + r);
		}
		case 'concat': {
			return evalBinOp(node, st, (l, r) => l + '' + r);
		}
		case '-': {
			return evalBinOp(node, st, (l, r) => l - r);
		}
		case '*': {
			return evalBinOp(node, st, (l, r) => l * r);
		}
		case '/': {
			return evalBinOp(node, st, (l, r) => l / r);
		}
		case '%': {
			return evalBinOp(node, st, (l, r) => l % r);
		}
		default:
			throw st.runtime.handleError(
				new Error(`Unknown binop ${op}`),
				node.lineno,
				node.colno
			);
	}
}

async function evalUnaryOp(node: UnaryOp, st: EvalState, op: string) {
	switch (op) {
		case '!': {
			const v = await evalExpr(node.target, st);
			return !v;
		}
		case '+': {
			const v = await evalExpr(node.target, st);
			return +(v as any);
		}
		case '-': {
			const v = await evalExpr(node.target, st);
			return -(v as any);
		}
		default:
			throw st.runtime.handleError(
				new Error(`Unknown unary ${op}`),
				node.lineno,
				node.colno
			);
	}
}

async function evalNodeList(node: NodeList, st: EvalState) {
	const out: any[] = [];
	for (const child of node.children) out.push(await evalExpr(child, st));
	return out;
}

async function evalGroup(node: Group, st: EvalState) {
	let last: any = undefined;
	for (const child of node.children) last = await evalExpr(child, st);
	return last;
}

async function evalArrayNode(node: ArrayNode, st: EvalState) {
	const arr: any[] = [];
	for (const child of node.children) arr.push(await evalExpr(child, st));
	return arr;
}

async function evalDict(node: Dict, st: EvalState) {
	const obj: Record<string, any> = {};
	for (const child of node.children) {
		const pair = child as Pair;
		const keyNode = pair.key;
		let key: any;
		if (keyNode instanceof Symbol) key = keyNode.value;
		else key = await evalExpr(keyNode, st);

		obj[String(key)] = await evalExpr(pair.value, st);
	}
	return obj;
}

async function evalKeywordArgs(node: KeywordArgs, st: EvalState) {
	const dict = await evalDict(node as any as Dict, st);
	return st.runtime.makeKeywordArgs(dict);
}

function jsCompare(op: string, a: any, b: any) {
	switch (op) {
		case '==':
			return a == b;
		case '===':
			return a === b;
		case '!=':
			return a != b;
		case '!==':
			return a !== b;
		case '<':
			return a < b;
		case '>':
			return a > b;
		case '<=':
			return a <= b;
		case '>=':
			return a >= b;
		default:
			throw new Error(`Unknown compare op: ${op}`);
	}
}

async function evalCompare(node: Compare, st: EvalState) {
	let left = await evalExpr(node.expr, st);
	for (const op of node.ops as any[]) {
		const right = await evalExpr(op.expr, st);
		if (!jsCompare(op.type, left, right)) return false;
		left = right;
	}
	return true;
}

// Conditional
async function evalIf(node: If, st: EvalState) {
	const cond = await evalExpr(node.cond, st);
	if (cond) return evalNode(node.body, st);
	if (node.else_) return evalNode(node.else_, st);
}

async function evalIfAsync(node: IfAsync, st: EvalState) {
	return evalIf(node as any as If, st);
}

async function evalSet(node: Set, st: EvalState) {
	const targets = node.targets; // array of Symbol
	let value: any;

	if (node.value) value = await evalExpr(node.value, st);
	else {
		const cap: EvalState = { ...st, frame: st.frame.push(true), buffer: [] };
		await evalNode(node.body, cap);
		value = cap.buffer.join('');
	}

	for (const t of targets) {
		const name = t.value;
		st.frame.set(name, value, true);
		if (st.frame.topLevel) {
			st.context.setVariable(name, value);
			if (!name.startsWith('_')) st.context.addExport(name);
		}
	}
}



async function evalFor(node: For, st: EvalState) {
	const frame = st.frame.push();
	const inner: EvalState = { ...st, frame };

	const iterVal = await evalExpr(node.arr, inner);
	const arr = iterVal ? st.runtime.fromIterator(iterVal) : null;

	let didIterate = false;

	if (arr) {
		if (node.name instanceof ArrayNode) {
			const names = node.name.children.map((c: any) => c.value);

			if (Array.isArray(arr)) {
				for (let i = 0; i < arr.length; i++) {
					didIterate = true;
					const row = arr[i];
					const loopFrame = frame.push();
					const loopSt: EvalState = { ...inner, frame: loopFrame };

					for (let u = 0; u < names.length; u++) {
						loopFrame.set(names[u], row?.[u]);
					}

					await evalNode(node.body, loopSt);
				}
			} else {
				let i = -1;
				for (const key of Object.keys(arr)) {
					i++;
					didIterate = true;
					const loopFrame = frame.push();
					const loopSt: EvalState = { ...inner, frame: loopFrame };

					const [keyName, valName] = names;
					loopFrame.set(keyName, key);
					loopFrame.set(valName, arr[key]);

					await evalNode(node.body, loopSt);
				}
			}
		} else {
			const name = node.name.value; // Symbol
			if (Array.isArray(arr)) {
				for (let i = 0; i < arr.length; i++) {
					didIterate = true;
					const loopFrame = frame.push();
					const loopSt: EvalState = { ...inner, frame: loopFrame };
					loopFrame.set(name, arr[i]);
					await evalNode(node.body, loopSt);
				}
			} else {
				// for (const k in arr) {
				// 	didIterate = true;
				// 	const loopFrame = frame.push();
				// 	const loopSt: EvalState = { ...inner, frame: loopFrame };
				// 	loopFrame.set(name, arr[k]);
				// 	await evalNode(node.body, loopSt);
				// }
			}
		}
	}

	if (!didIterate && node.else_) {
		await evalNode(node.else_, inner);
	}
}

async function evalCallExtension(
	node: CallExtension | CallExtensionAsync,
	st: EvalState
) {
	const ext = st.env.getExtension(node.extname);
	const fn = ext?.[node.prop];
	if (typeof fn !== 'function') {
		throw st.runtime.handleError(
			new Error(`Extension "${node.extname}" has no method "${node.prop}"`),
			node.lineno,
			node.colno
		);
	}

	const args: any[] = [];

	if (node.args) {
		for (const child of node.args.children)
			args.push(await evalExpr(child, st));
	}

	const contentFns: any[] = [];
	if (node.contentArgs?.length) {
		for (const contentNode of node.contentArgs) {
			if (!contentNode) {
				contentFns.push(null);
				continue;
			}
			contentFns.push(async () => {
				const inner: EvalState = {
					...st,
					frame: st.frame.push(true),
					buffer: [],
				};
				await evalNode(contentNode, inner); // contentNode is likely NodeList/Output
				return inner.buffer.join('');
			});
		}
	}
	const res = fn.call(ext, st.context, ...args, ...contentFns);

	if (node instanceof CallExtensionAsync) {
		return await new Promise((resolve, reject) => {
			if (res && typeof res.then === 'function') res.then(resolve, reject);
			else resolve(res);
		});
	}

	return res;
}

async function evalExpr(node: Node, st: EvalState): Promise<any> {
	// BinOp
	if (node instanceof Or) return evalBinOpHp(node, st, '||');
	if (node instanceof And) return evalBinOpHp(node, st, '&&');
	if (node instanceof Concat) return evalBinOpHp(node, st, 'concat');
	if (node instanceof Add) return evalBinOpHp(node, st, '+');
	if (node instanceof Sub) return evalBinOpHp(node, st, '-');
	if (node instanceof Mul) return evalBinOpHp(node, st, '*');
	if (node instanceof Div) return evalBinOpHp(node, st, '/');
	if (node instanceof Mod) return evalBinOpHp(node, st, '%');
	// UnaryOp
	if (node instanceof Pos) return evalUnaryOp(node, st, '+');
	if (node instanceof Neg) return evalUnaryOp(node, st, '-');
	if (node instanceof Not) return evalUnaryOp(node, st, '!');
	// List types
	if (node instanceof NodeList) return evalNodeList(node, st);
	if (node instanceof Group) return evalGroup(node, st);
	if (node instanceof ArrayNode) return evalArrayNode(node, st);
	if (node instanceof Dict) return evalDict(node, st);
	if (node instanceof KeywordArgs) return evalKeywordArgs(node, st);
	if (node instanceof Compare) return evalCompare(node, st);

	if (node instanceof CallExtension) return evalCallExtension(node, st);
	if (node instanceof CallExtensionAsync) return evalCallExtension(node, st);

	if (node instanceof Literal) return node.value;
	if (node instanceof Symbol) {
		const v = st.runtime.contextOrFrameLookup(st.context, st.frame, node.value);
		p.debug('LOOKUP', node.value, '=>', v);
		return v;
	}
	if (node instanceof LookupVal) {
		const target = await evalExpr(node.target, st);
		const key = await evalExpr(node.val, st);
		return st.runtime.memberLookup(target, key);
	}

	if (node instanceof Filter) {
		const name = node.name.value; // your AST uses Symbol node for filter name
		const fn = st.env.getFilter(name);
		const args = [];
		for (const child of node.args.children) {
			args.push(await evalExpr(child, st));
		}
		return fn.call(st.context, ...args);
	}
	if (node instanceof FunCall) {
		const callee = await evalExpr(node.name, st);
		const args = [];
		for (const child of node.args.children)
			args.push(await evalExpr(child, st));
		return st.runtime.callWrap(
			callee,
			/*friendlyName*/ '...',
			st.context,
			args
		);
	}
	if (node instanceof InlineIf) {
		const cond = await evalExpr(node.cond, st);
		if (cond) return evalExpr(node.body, st);
		return node.else_ ? evalExpr(node.else_, st) : '';
	}
	throw st.runtime.handleError(
		new Error(`evalExpr: unsupported node ${node.typename}`),
		node.lineno,
		node.colno
	);
}

function write(st: EvalState, s: string) {
	st.buffer.push(s);
}

async function evalOutput(node: Output, st: EvalState) {
	for (const child of node.children) {
		if (child instanceof TemplateData) {
			if (child.value) write(st, child.value);
			continue;
		}
		const val = await evalExpr(child, st);
		const safe = st.runtime.suppressValue(
			st.env.throwOnUndefined
				? st.runtime.ensureDefined(val, node.lineno, node.colno)
				: val,
			st.env.autoescape
		);
		write(st, safe);
	}
}

interface EvalState {
	env: Environment;
	context: Context;
	frame: Frame;
	runtime: typeof Runtime;
	buffer: string[];
	rootAst?: Root;
	didExtend?: boolean;
}
async function evalNode(node: Node, st: EvalState): Promise<void> {
	switch (node.typename) {
		case 'Output':
			return evalOutput(node as Output, st);
		case 'NodeList':
			return evalNodeListStmt(node as NodeList, st);
		case 'If':
			return evalIf(node as If, st);
		case 'IfAsync':
			return evalIfAsync(node as IfAsync, st);
		case 'For':
			return evalFor(node as For, st);
		case 'Set':
			return evalSet(node as Set, st);
		case 'Extends':
  		return evalExtends(node as Extends, st);
		case 'Root':
			return evalRoot(node as any as Root, st);
		case 'Block':
  		return evalBlock(node as Block, st);
		default:
			throw st.runtime.handleError('Unknown evaluation: ' +  node.typename);
	}
}

export async function renderRootToString(ast: Root, st: EvalState): Promise<string> {
  const inner: EvalState = { ...st, frame: st.frame, buffer: [] };
  await evalNode(ast, inner);
  return inner.buffer.join('');
}

export async function renderAST(
	env: Environment,
	ast: Root,
	ctx: any,
	runtime: typeof Runtime
): Promise<string> {
	p.debug('ctx: ', ctx);
	const context = new Context(ctx || {}, /*blocks*/ {}, env);
	const frame = new Frame();
	frame.topLevel = true;

	const st: EvalState = { env, context, frame, runtime, buffer: [],rootAst: ast  };
	await evalNode(ast, st);
	return st.buffer.join('');
}

// async function renderTemplate(tpl: Template, ctx: any) {
//   const context = new Context(ctx, /*blocks*/ {}, tpl.env);
//   const frame = new Frame(); frame.topLevel = true;

//   // register our blocks first
//   for (const [name, blockNode] of tpl.blocks) {
//     context.addBlock(name, makeBlockFn(blockNode, tpl.env));
//   }

//   // if extends, load parent and render parent root
//   if (tpl.parentName) {
//     const parent = await tpl.env.getTemplate(tpl.parentName, /*eager*/ true, tpl.path, /*ignoreMissing*/ false);
//     // parent will call context.getBlock("name") and it’ll resolve to overridden blocks
//     return await renderRoot(parent, context, frame);
//   }

//   // otherwise render our root
//   return await renderRoot(tpl, context, frame);
// }

// function makeBlockFn(blockBody: NodeList, env: Environment) {
//   return async (context: Context, frame: Frame, runtime: Runtime) => {
//     const st: EvalState = { env, context, frame: frame.push(true), runtime, buffer: [] };
//     await evalNode(blockBody, st);
//     return st.buffer.join("");
//   };
// }
