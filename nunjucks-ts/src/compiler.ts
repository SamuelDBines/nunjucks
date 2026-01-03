import parser from './parser';
import { transform } from './transformer';
import {
	Node,
	Literal,
	Symbol,
	Group,
	ArrayNode,
	Dict,
	FunCall,
	Caller,
	Filter,
	LookupVal,
	InlineIf,
	In,
	Is,
	And,
	Or,
	Not,
	Add,
	Concat,
	Sub,
	Mul,
	Div,
	FloorDiv,
		Macro,
	Mod,
	Pow,
	Neg,
	Pos,
	Compare,
	NodeList,
	Pair,
	TemplateData,
	Block,
	CallExtension,

} from './nodes';
import { TemplateError } from './lib';
import { Frame } from './runtime';
import { Obj } from './loader';

// These are all the same for now, but shouldn't be passed straight
// through
const compareOps = {
	'==': '==',
	'===': '===',
	'!=': '!=',
	'!==': '!==',
	'<': '<',
	'>': '>',
	'<=': '<=',
	'>=': '>=',
} as const;

type CompareOps = typeof compareOps;
type CompareOpsChar = keyof typeof compareOps;
type CompareOpsEntity = (typeof compareOps)[CompareOpsChar];

interface ICompilerOpts {
	codebuf?: any[];
	lastId?: number;
	buffer?: any;
	bufferStack?: Buffer[];
	_scopeClosers?: string;
	inBlock?: boolean;
	throwOnUndefined?: boolean;
}
class Compiler extends Obj {
	templateName: string = '';
	lastId: number = 0;
	_scopeClosers: string = '';
	inBlock: boolean = false;
	throwOnUndefined: boolean = false;

	// TODO: confirm these types
	codebuf: any[] = [];
	buffer: any = null;
	bufferStack: any[] = [];

	constructor(templateName: string, opts?: ICompilerOpts) {
		this.templateName = templateName;
		this.codebuf = opts?.codebuf || [];
		this.lastId = opts?.lastId || 0;
		this.buffer = opts?.buffer || null;
		this.bufferStack = opts?.bufferStack || [];
		this._scopeClosers = opts?._scopeClosers || '';
		this.inBlock = opts?.inBlock || false;
		this.throwOnUndefined = opts?.throwOnUndefined || false;
	}

	fail(msg: string, lineno: number = 0, colno: number = 0) {
		if (lineno !== undefined) {
			lineno += 1;
		}
		if (colno !== undefined) {
			colno += 1;
		}
		throw TemplateError(msg, lineno, colno);
	}

	_pushBuffer() {
		const id = this._tmpid();
		this.bufferStack.push(this.buffer);
		this.buffer = id;
		this._emit(`var ${this.buffer} = "";`);
		return id;
	}

	_popBuffer() {
		this.buffer = this.bufferStack.pop();
	}

	_emit(code: any) {
		this.codebuf.push(code);
	}

	_emitLine(code: string) {
		this._emit(code + '\n');
	}

	_emitLines(...lines: any[]) {
		lines.forEach((line) => this._emitLine(line));
	}

	_emitFuncBegin(node, name) {
		this.buffer = 'output';
		this._scopeClosers = '';
		this._emitLine(`function ${name}(env, context, frame, runtime, cb) {`);
		this._emitLine(`var lineno = ${node.lineno};`);
		this._emitLine(`var colno = ${node.colno};`);
		this._emitLine(`var ${this.buffer} = "";`);
		this._emitLine('try {');
	}

	_emitFuncEnd(noReturn?: boolean) {
		if (!noReturn) {
			this._emitLine('cb(null, ' + this.buffer + ');');
		}

		this._closeScopeLevels();
		this._emitLine('} catch (e) {');
		this._emitLine('  cb(runtime.handleError(e, lineno, colno));');
		this._emitLine('}');
		this._emitLine('}');
		this.buffer = null;
	}

	_addScopeLevel() {
		this._scopeClosers += '})';
	}

	_closeScopeLevels() {
		this._emitLine(this._scopeClosers + ';');
		this._scopeClosers = '';
	}

	_withScopedSyntax(func: Function) {
		let _scopeClosers = this._scopeClosers;
		this._scopeClosers = '';

		func.call(this);

		this._closeScopeLevels();
		this._scopeClosers = _scopeClosers;
	}

	_makeCallback(res?: any) {
		let err = this._tmpid();

		return (
			'function(' +
			err +
			(res ? ',' + res : '') +
			') {\n' +
			'if(' +
			err +
			') { cb(' +
			err +
			'); return; }'
		);
	}

	_tmpid() {
		this.lastId++;
		return 't_' + this.lastId;
	}

	_templateName() {
		return this.templateName == null
			? 'undefined'
			: JSON.stringify(this.templateName);
	}

	_compileChildren(node: any, frame: any) {
		node.children.forEach((child) => {
			this.compile(child, frame);
		});
	}

	_compileAggregate(
		node: Node,
		frame: Frame,
		startChar?: string,
		endChar?: string
	) {
		if (startChar) {
			this._emit(startChar);
		}

		node.children.forEach((child, i) => {
			if (i > 0) {
				this._emit(',');
			}

			this.compile(child, frame);
		});

		if (endChar) {
			this._emit(endChar);
		}
	}

	_compileExpression(node: any, frame: any) {
		// TODO: I'm not really sure if this type check is worth it or
		// not.
		this.assertType(
			node,
			Literal,
			Symbol,
			Group,
			ArrayNode,
			Dict,
			FunCall,
			Caller,
			Filter,
			LookupVal,
			Compare,
			InlineIf,
			In,
			Is,
			And,
			Or,
			Not,
			Add,
			Concat,
			Sub,
			Mul,
			Div,
			FloorDiv,
			Mod,
			Pow,
			Neg,
			Pos,
			Compare,
			NodeList
		);
		this.compile(node, frame);
	}

	assertType(node: Node, ...types: any[]) {
		if (!types.some((t) => node instanceof t)) {
			this.fail(
				`assertType: invalid type: ${node.typename}`,
				node.lineno,
				node.colno
			);
		}
	}

	compileCallExtension(node: CallExtension: Frame, async: any) {
		let args = node.args;
		let contentArgs = node.contentArgs;
		let autoescape = node.autoescape;

		if (!async) {
			this._emit(`${this.buffer} += runtime.suppressValue(`);
		}

		this._emit(`env.getExtension("${node.extname}")["${node.prop}"](`);
		this._emit('context');

		if (args || contentArgs) {
			this._emit(',');
		}

		if (args) {
			if (!(args instanceof NodeList)) {
				this.fail(
					'compileCallExtension: arguments must be a NodeList, ' +
						'use `parser.parseSignature`'
				);
			}

			args.children.forEach((arg, i: number) => {
				// Tag arguments are passed normally to the call. Note
				// that keyword arguments are turned into a single js
				// object as the last argument, if they exist.
				this._compileExpression(arg, frame);

				if (i !== args.children.length - 1 || contentArgs.length) {
					this._emit(',');
				}
			});
		}

		if (contentArgs.length) {
			contentArgs.forEach((arg, i: number) => {
				if (i > 0) {
					this._emit(',');
				}

				if (arg) {
					this._emitLine('function(cb) {');
					this._emitLine(
						'if(!cb) { cb = function(err) { if(err) { throw err; }}}'
					);
					const id = this._pushBuffer();

					this._withScopedSyntax(() => {
						this.compile(arg, frame);
						this._emitLine(`cb(null, ${id});`);
					});

					this._popBuffer();
					this._emitLine(`return ${id};`);
					this._emitLine('}');
				} else {
					this._emit('null');
				}
			});
		}

		if (async) {
			const res = this._tmpid();
			this._emitLine(', ' + this._makeCallback(res));
			this._emitLine(
				`${this.buffer} += runtime.suppressValue(${res}, ${autoescape} && env.opts.autoescape);`
			);
			this._addScopeLevel();
		} else {
			this._emit(')');
			this._emit(`, ${autoescape} && env.opts.autoescape);\n`);
		}
	}

	compileCallExtensionAsync(node: CallExtension, frame: any) {
		this.compileCallExtension(node, frame, true);
	}

	compileNodeList(node: NodeList, frame: Frame) {
		this._compileChildren(node, frame);
	}

	compileLiteral(node: Literal) {
		if (typeof node.value === 'string') {
			let val = node.value.replace(/\\/g, '\\\\');
			val = val.replace(/"/g, '\\"');
			val = val.replace(/\n/g, '\\n');
			val = val.replace(/\r/g, '\\r');
			val = val.replace(/\t/g, '\\t');
			val = val.replace(/\u2028/g, '\\u2028');
			this._emit(`"${val}"`);
		} else if (node.value === null) {
			this._emit('null');
		} else {
			this._emit(node.value.toString());
		}
	}

	compileSymbol(node: Node, frame: Frame) {
		let name = node.value;
		let v = frame.lookup(name);

		if (v) {
			this._emit(v);
		} else {
			this._emit(
				'runtime.contextOrFrameLookup(' + 'context, frame, "' + name + '")'
			);
		}
	}

	compileGroup(node: Node, frame: Frame) {
		this._compileAggregate(node, frame, '(', ')');
	}

	compileArray(node: Node, frame: Frame) {
		this._compileAggregate(node, frame, '[', ']');
	}

	compileDict(node: Node, frame: Frame) {
		this._compileAggregate(node, frame, '{', '}');
	}

	compilePair(node: Pair, frame: Frame) {
		let key = node.key;
		let val = node.value;

		if (key instanceof Symbol) {
			key = new Literal(key.lineno, key.colno, key.value);
		} else if (!(key instanceof Literal && typeof key.value === 'string')) {
			this.fail(
				'compilePair: Dict keys must be strings or names',
				key.lineno,
				key.colno
			);
		}

		this.compile(key, frame);
		this._emit(': ');
		this._compileExpression(val, frame);
	}

	compileInlineIf(node: Node, frame: Frame) {
		this._emit('(');
		this.compile(node.cond, frame);
		this._emit('?');
		this.compile(node.body, frame);
		this._emit(':');
		if (node.else_ !== null) {
			this.compile(node.else_, frame);
		} else {
			this._emit('""');
		}
		this._emit(')');
	}

	compileIn(node: any, frame: any) {
		this._emit('runtime.inOperator(');
		this.compile(node.left, frame);
		this._emit(',');
		this.compile(node.right, frame);
		this._emit(')');
	}

	compileIs(node: any, frame: any) {
		// first, we need to try to get the name of the test function, if it's a
		// callable (i.e., has args) and not a symbol.
		let right = node.right.name
			? node.right.name.value
			: // otherwise go with the symbol value
			  node.right.value;
		this._emit('env.getTest("' + right + '").call(context, ');
		this.compile(node.left, frame);
		// compile the arguments for the callable if they exist
		if (node.right.args) {
			this._emit(',');
			this.compile(node.right.args, frame);
		}
		this._emit(') === true');
	}

	_binOpEmitter(node, frame, str) {
		this.compile(node.left, frame);
		this._emit(str);
		this.compile(node.right, frame);
	}

	// ensure concatenation instead of addition
	// by adding empty string in between
	compileOr(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' || ');
	}

	compileAnd(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' && ');
	}

	compileAdd(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' + ');
	}

	compileConcat(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' + "" + ');
	}

	compileSub(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' - ');
	}

	compileMul(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' * ');
	}

	compileDiv(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' / ');
	}

	compileMod(node: Node, frame: Frame) {
		return this._binOpEmitter(node, frame, ' % ');
	}

	compileNot(node: Node, frame: Frame) {
		this._emit('!');
		this.compile(node.target, frame);
	}

	compileFloorDiv(node: any, frame: any) {
		this._emit('Math.floor(');
		this.compile(node.left, frame);
		this._emit(' / ');
		this.compile(node.right, frame);
		this._emit(')');
	}

	compilePow(node: any, frame: any) {
		this._emit('Math.pow(');
		this.compile(node.left, frame);
		this._emit(', ');
		this.compile(node.right, frame);
		this._emit(')');
	}

	compileNeg(node: any, frame: any) {
		this._emit('-');
		this.compile(node.target, frame);
	}

	compilePos(node: any, frame: any) {
		this._emit('+');
		this.compile(node.target, frame);
	}

	compileCompare(node: any, frame: any) {
		this.compile(node.expr, frame);

		node.ops.forEach((op) => {
			this._emit(` ${compareOps[op.type]} `);
			this.compile(op.expr, frame);
		});
	}

	compileLookupVal(node: any, frame: any) {
		this._emit('runtime.memberLookup((');
		this._compileExpression(node.target, frame);
		this._emit('),');
		this._compileExpression(node.val, frame);
		this._emit(')');
	}

	_getNodeName(node: any) {
		switch (node.typename) {
			case 'Symbol':
				return node.value;
			case 'FunCall':
				return 'the return value of (' + this._getNodeName(node.name) + ')';
			case 'LookupVal':
				return (
					this._getNodeName(node.target) +
					'["' +
					this._getNodeName(node.val) +
					'"]'
				);
			case 'Literal':
				return node.value.toString();
			default:
				return '--expression--';
		}
	}

	compileFunCall(node: any, frame: any) {
		// Keep track of line/col info at runtime by settings
		// variables within an expression. An expression in javascript
		// like (x, y, z) returns the last value, and x and y can be
		// anything
		this._emit('(lineno = ' + node.lineno + ', colno = ' + node.colno + ', ');

		this._emit('runtime.callWrap(');
		// Compile it as normal.
		this._compileExpression(node.name, frame);

		// Output the name of what we're calling so we can get friendly errors
		// if the lookup fails.
		this._emit(
			', "' + this._getNodeName(node.name).replace(/"/g, '\\"') + '", context, '
		);

		this._compileAggregate(node.args, frame, '[', '])');

		this._emit(')');
	}

	compileFilter(node: any, frame: any) {
		let name = node.name;
		this.assertType(name, Symbol);
		this._emit('env.getFilter("' + name.value + '").call(context, ');
		this._compileAggregate(node.args, frame);
		this._emit(')');
	}

	compileFilterAsync(node: any, frame: any) {
		let name = node.name;
		let symbol = node.symbol.value;

		this.assertType(name, Symbol);

		frame.set(symbol, symbol);

		this._emit('env.getFilter("' + name.value + '").call(context, ');
		this._compileAggregate(node.args, frame);
		this._emitLine(', ' + this._makeCallback(symbol));

		this._addScopeLevel();
	}

	compileKeywordArgs(node: Node, frame: Frame) {
		this._emit('runtime.makeKeywordArgs(');
		this.compileDict(node, frame);
		this._emit(')');
	}

	compileSet(node: any, frame: Frame) {
		let ids: any[] = [];

		// Lookup the variable names for each identifier and create
		// new ones if necessary
		node.targets.forEach((target: any) => {
			let name = target.value;
			let id: any = frame.lookup(name);

			if (id === null || id === undefined) {
				id = this._tmpid();

				// Note: This relies on js allowing scope across
				// blocks, in case this is created inside an `if`
				this._emitLine('var ' + id + ';');
			}

			ids.push(id);
		});

		if (node.value) {
			this._emit(ids.join(' = ') + ' = ');
			this._compileExpression(node.value, frame);
			this._emitLine(';');
		} else {
			this._emit(ids.join(' = ') + ' = ');
			this.compile(node.body, frame);
			this._emitLine(';');
		}

		node.targets.forEach((target, i) => {
			let id = ids[i];
			let name = target.value;

			// We are running this for every var, but it's very
			// uncommon to assign to multiple vars anyway
			this._emitLine(`frame.set("${name}", ${id}, true);`);

			this._emitLine('if(frame.topLevel) {');
			this._emitLine(`context.setVariable("${name}", ${id});`);
			this._emitLine('}');

			if (name.charAt(0) !== '_') {
				this._emitLine('if(frame.topLevel) {');
				this._emitLine(`context.addExport("${name}", ${id});`);
				this._emitLine('}');
			}
		});
	}

	compileSwitch(node: any, frame: Frame) {
		this._emit('switch (');
		this.compile(node.expr, frame);
		this._emit(') {');
		node.cases.forEach((c, i) => {
			this._emit('case ');
			this.compile(c.cond, frame);
			this._emit(': ');
			this.compile(c.body, frame);
			// preserve fall-throughs
			if (c.body.children.length) {
				this._emitLine('break;');
			}
		});
		if (node.default) {
			this._emit('default:');
			this.compile(node.default, frame);
		}
		this._emit('}');
	}

	compileIf(node, frame, async) {
		this._emit('if(');
		this._compileExpression(node.cond, frame);
		this._emitLine(') {');

		this._withScopedSyntax(() => {
			this.compile(node.body, frame);

			if (async) {
				this._emit('cb()');
			}
		});

		if (node.else_) {
			this._emitLine('}\nelse {');

			this._withScopedSyntax(() => {
				this.compile(node.else_, frame);

				if (async) {
					this._emit('cb()');
				}
			});
		} else if (async) {
			this._emitLine('}\nelse {');
			this._emit('cb()');
		}

		this._emitLine('}');
	}

	compileIfAsync(node: Node, frame: Frame) {
		this._emit('(function(cb) {');
		this.compileIf(node, frame, true);
		this._emit('})(' + this._makeCallback());
		this._addScopeLevel();
	}

	_emitLoopBindings(
		node: Node,
		arr: any[] | any,
		i: number | any,
		len: number | any
	) {
		const bindings = [
			{ name: 'index', val: `${i} + 1` },
			{ name: 'index0', val: i },
			{ name: 'revindex', val: `${len} - ${i}` },
			{ name: 'revindex0', val: `${len} - ${i} - 1` },
			{ name: 'first', val: `${i} === 0` },
			{ name: 'last', val: `${i} === ${len} - 1` },
			{ name: 'length', val: len },
		];

		bindings.forEach((b) => {
			this._emitLine(`frame.set("loop.${b.name}", ${b.val});`);
		});
	}

	compileFor(node: Node, frame: any) {
		// Some of this code is ugly, but it keeps the generated code
		// as fast as possible. ForAsync also shares some of this, but
		// not much.

		const i: AsyncGenerator | any = this._tmpid();
		const len = this._tmpid();
		const arr: any = this._tmpid();
		frame = frame.push();

		this._emitLine('frame = frame.push();');

		this._emit(`var ${arr} = `);
		this._compileExpression(node.arr, frame);
		this._emitLine(';');

		this._emit(`if(${arr}) {`);
		this._emitLine(arr + ' = runtime.fromIterator(' + arr + ');');

		// If multiple names are passed, we need to bind them
		// appropriately
		if (node.name instanceof ArrayNode) {
			this._emitLine(`var ${i};`);

			// The object could be an arroy or object. Note that the
			// body of the loop is duplicated for each condition, but
			// we are optimizing for speed over size.
			this._emitLine(`if(Array.isArray(${arr})) {`);
			this._emitLine(`var ${len} = ${arr}.length;`);
			this._emitLine(`for(${i}=0; ${i} < ${arr}.length; ${i}++) {`);

			// Bind each declared var
			node.name.children.forEach((child, u) => {
				let tid = this._tmpid();
				this._emitLine(`var ${tid} = ${arr}[${i}][${u}];`);
				this._emitLine(`frame.set("${child}", ${arr}[${i}][${u}]);`);
				frame.set(node.name.children[u].value, tid);
			});

			this._emitLoopBindings(node, arr, i, len);
			this._withScopedSyntax(() => {
				this.compile(node.body, frame);
			});
			this._emitLine('}');

			this._emitLine('} else {');
			// Iterate over the key/values of an object
			const [key, val] = node.name.children;
			const k = this._tmpid();
			const v = this._tmpid();
			frame.set(key.value, k);
			frame.set(val.value, v);

			this._emitLine(`${i} = -1;`);
			this._emitLine(`var ${len} = runtime.keys(${arr}).length;`);
			this._emitLine(`for(var ${k} in ${arr}) {`);
			this._emitLine(`${i}++;`);
			this._emitLine(`var ${v} = ${arr}[${k}];`);
			this._emitLine(`frame.set("${key.value}", ${k});`);
			this._emitLine(`frame.set("${val.value}", ${v});`);

			this._emitLoopBindings(node, arr, i, len);
			this._withScopedSyntax(() => {
				this.compile(node.body, frame);
			});
			this._emitLine('}');

			this._emitLine('}');
		} else {
			// Generate a typical array iteration
			const v = this._tmpid();
			frame.set(node.name.value, v);

			this._emitLine(`var ${len} = ${arr}.length;`);
			this._emitLine(`for(var ${i}=0; ${i} < ${arr}.length; ${i}++) {`);
			this._emitLine(`var ${v} = ${arr}[${i}];`);
			this._emitLine(`frame.set("${node.name.value}", ${v});`);

			this._emitLoopBindings(node, arr, i, len);

			this._withScopedSyntax(() => {
				this.compile(node.body, frame);
			});

			this._emitLine('}');
		}

		this._emitLine('}');
		if (node.else_) {
			this._emitLine('if (!' + len + ') {');
			this.compile(node.else_, frame);
			this._emitLine('}');
		}

		this._emitLine('frame = frame.pop();');
	}

	_compileAsyncLoop(node: any, frame: any, parallel: boolean = true) {
		// This shares some code with the For tag, but not enough to
		// worry about. This iterates across an object asynchronously,
		// but not in parallel.

		let i = this._tmpid();
		let len = this._tmpid();
		let arr: any = this._tmpid();
		let asyncMethod = parallel ? 'asyncAll' : 'asyncEach';
		frame = frame.push();

		this._emitLine('frame = frame.push();');

		this._emit('var ' + arr + ' = runtime.fromIterator(');
		this._compileExpression(node.arr, frame);
		this._emitLine(');');

		if (node.name instanceof ArrayNode) {
			const arrayLen = node.name.children.length;
			this._emit(`runtime.${asyncMethod}(${arr}, ${arrayLen}, function(`);

			node.name.children.forEach((name) => {
				this._emit(`${name.value},`);
			});

			this._emit(i + ',' + len + ',next) {');

			node.name.children.forEach((name) => {
				const id = name.value;
				frame.set(id, id);
				this._emitLine(`frame.set("${id}", ${id});`);
			});
		} else {
			const id = node.name.value;
			this._emitLine(
				`runtime.${asyncMethod}(${arr}, 1, function(${id}, ${i}, ${len},next) {`
			);
			this._emitLine('frame.set("' + id + '", ' + id + ');');
			frame.set(id, id);
		}

		this._emitLoopBindings(node, arr, i, len);

		this._withScopedSyntax(() => {
			let buf;
			if (parallel) {
				buf = this._pushBuffer();
			}

			this.compile(node.body, frame);
			this._emitLine('next(' + i + (buf ? ',' + buf : '') + ');');

			if (parallel) {
				this._popBuffer();
			}
		});

		const output = this._tmpid();
		this._emitLine('}, ' + this._makeCallback(output));
		this._addScopeLevel();

		if (parallel) {
			this._emitLine(this.buffer + ' += ' + output + ';');
		}

		if (node.else_) {
			this._emitLine('if (!' + arr + '.length) {');
			this.compile(node.else_, frame);
			this._emitLine('}');
		}

		this._emitLine('frame = frame.pop();');
	}

	compileAsyncEach(node: Node, frame: Frame) {
		this._compileAsyncLoop(node, frame);
	}

	compileAsyncAll(node: Node, frame: Frame) {
		this._compileAsyncLoop(node, frame, true);
	}

	_compileMacro(node: Node, frame?: Frame) {
		let args = [];
		let kwargs = null;
		let funcId = 'macro_' + this._tmpid();
		let keepFrame = frame !== undefined;

		// Type check the definition of the args
		node.args.children.forEach((arg, i: number) => {
			if (i === node.args.children.length - 1 && arg instanceof Dict) {
				kwargs = arg;
			} else {
				this.assertType(arg, Symbol);
				args.push(arg);
			}
		});

		const realNames = [...args.map((n) => `l_${n.value}`), 'kwargs'];

		// Quoted argument names
		const argNames = args.map((n) => `"${n.value}"`);
		const kwargNames = ((kwargs && kwargs.children) || []).map(
			(n) => `"${n.key.value}"`
		);

		// We pass a function to makeMacro which destructures the
		// arguments so support setting positional args with keywords
		// args and passing keyword args as positional args
		// (essentially default values). See runtime.js.
		let currFrame;
		if (keepFrame) {
			currFrame = frame.push(true);
		} else {
			currFrame = new Frame();
		}
		this._emitLines(
			`var ${funcId} = runtime.makeMacro(`,
			`[${argNames.join(', ')}], `,
			`[${kwargNames.join(', ')}], `,
			`function (${realNames.join(', ')}) {`,
			'var callerFrame = frame;',
			'frame = ' + (keepFrame ? 'frame.push(true);' : 'new runtime.Frame();'),
			'kwargs = kwargs || {};',
			'if (Object.prototype.hasOwnProperty.call(kwargs, "caller")) {',
			'frame.set("caller", kwargs.caller); }'
		);

		// Expose the arguments to the template. Don't need to use
		// random names because the function
		// will create a new run-time scope for us
		args.forEach((arg) => {
			this._emitLine(`frame.set("${arg.value}", l_${arg.value});`);
			currFrame.set(arg.value, `l_${arg.value}`);
		});

		// Expose the keyword arguments
		if (kwargs) {
			kwargs.children.forEach((pair) => {
				const name = pair.key.value;
				this._emit(`frame.set("${name}", `);
				this._emit(`Object.prototype.hasOwnProperty.call(kwargs, "${name}")`);
				this._emit(` ? kwargs["${name}"] : `);
				this._compileExpression(pair.value, currFrame);
				this._emit(');');
			});
		}

		const bufferId = this._pushBuffer();

		this._withScopedSyntax(() => {
			this.compile(node.body, currFrame);
		});

		this._emitLine('frame = ' + (keepFrame ? 'frame.pop();' : 'callerFrame;'));
		this._emitLine(`return new runtime.SafeString(${bufferId});`);
		this._emitLine('});');
		this._popBuffer();

		return funcId;
	}

	compileMacro(node: Macro, frame: any) {
		let funcId = this._compileMacro(node);

		// Expose the macro to the templates
		let name = node.name.value;
		frame.set(name, funcId);

		if (frame.parent) {
			this._emitLine(`frame.set("${name}", ${funcId});`);
		} else {
			if (node.name.value.charAt(0) !== '_') {
				this._emitLine(`context.addExport("${name}");`);
			}
			this._emitLine(`context.setVariable("${name}", ${funcId});`);
		}
	}

	compileCaller(node: Node, frame: Frame) {
		// basically an anonymous "macro expression"
		this._emit('(function (){');
		const funcId = this._compileMacro(node, frame);
		this._emit(`return ${funcId};})()`);
	}

	_compileGetTemplate(
		node: any,
		frame: Frame,
		eagerCompile,
		ignoreMissing: boolean
	) {
		const parentTemplateId = this._tmpid();
		const parentName = this._templateName();
		const cb = this._makeCallback(parentTemplateId);
		const eagerCompileArg = eagerCompile ? 'true' : 'false';
		const ignoreMissingArg = ignoreMissing ? 'true' : 'false';
		this._emit('env.getTemplate(');
		this._compileExpression(node.template, frame);
		this._emitLine(
			`, ${eagerCompileArg}, ${parentName}, ${ignoreMissingArg}, ${cb}`
		);
		return parentTemplateId;
	}

	compileImport(node: any, frame: any) {
		const target = node.target.value;
		const id = this._compileGetTemplate(node, frame, false, false);
		this._addScopeLevel();

		this._emitLine(
			id +
				'.getExported(' +
				(node.withContext ? 'context.getVariables(), frame, ' : '') +
				this._makeCallback(id)
		);
		this._addScopeLevel();

		frame.set(target, id);

		if (frame.parent) {
			this._emitLine(`frame.set("${target}", ${id});`);
		} else {
			this._emitLine(`context.setVariable("${target}", ${id});`);
		}
	}

	compileFromImport(node: any, frame: any) {
		const importedId = this._compileGetTemplate(node, frame, false, false);
		this._addScopeLevel();

		this._emitLine(
			importedId +
				'.getExported(' +
				(node.withContext ? 'context.getVariables(), frame, ' : '') +
				this._makeCallback(importedId)
		);
		this._addScopeLevel();

		node.names.children.forEach((nameNode) => {
			let name;
			let alias;
			let id = this._tmpid();

			if (nameNode instanceof Pair) {
				name = nameNode.key.value;
				alias = nameNode.value.value;
			} else {
				name = nameNode.value;
				alias = name;
			}

			this._emitLine(
				`if(Object.prototype.hasOwnProperty.call(${importedId}, "${name}")) {`
			);
			this._emitLine(`var ${id} = ${importedId}.${name};`);
			this._emitLine('} else {');
			this._emitLine(`cb(new Error("cannot import '${name}'")); return;`);
			this._emitLine('}');

			frame.set(alias, id);

			if (frame.parent) {
				this._emitLine(`frame.set("${alias}", ${id});`);
			} else {
				this._emitLine(`context.setVariable("${alias}", ${id});`);
			}
		});
	}

	compileBlock(node: Node) {
		let id = this._tmpid();

		// If we are executing outside a block (creating a top-level
		// block), we really don't want to execute its code because it
		// will execute twice: once when the child template runs and
		// again when the parent template runs. Note that blocks
		// within blocks will *always* execute immediately *and*
		// wherever else they are invoked (like used in a parent
		// template). This may have behavioral differences from jinja
		// because blocks can have side effects, but it seems like a
		// waste of performance to always execute huge top-level
		// blocks twice
		if (!this.inBlock) {
			this._emit('(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : ');
		}
		this._emit(`context.getBlock("${node.name.value}")`);
		if (!this.inBlock) {
			this._emit(')');
		}
		this._emitLine('(env, context, frame, runtime, ' + this._makeCallback(id));
		this._emitLine(`${this.buffer} += ${id};`);
		this._addScopeLevel();
	}

	compileSuper(node: any, frame: any) {
		let name = node.blockName.value;
		let id = node.symbol.value;

		const cb = this._makeCallback(id);
		this._emitLine(
			`context.getSuper(env, "${name}", b_${name}, frame, runtime, ${cb}`
		);
		this._emitLine(`${id} = runtime.markSafe(${id});`);
		this._addScopeLevel();
		frame.set(id, id);
	}

	compileExtends(node: any, frame: any) {
		let k = this._tmpid();

		const parentTemplateId = this._compileGetTemplate(node, frame, true, false);

		// extends is a dynamic tag and can occur within a block like
		// `if`, so if this happens we need to capture the parent
		// template in the top-level scope
		this._emitLine(`parentTemplate = ${parentTemplateId}`);

		this._emitLine(`for(var ${k} in parentTemplate.blocks) {`);
		this._emitLine(`context.addBlock(${k}, parentTemplate.blocks[${k}]);`);
		this._emitLine('}');

		this._addScopeLevel();
	}

	compileInclude(node: any, frame: any) {
		this._emitLine('var tasks = [];');
		this._emitLine('tasks.push(');
		this._emitLine('function(callback) {');
		const id = this._compileGetTemplate(node, frame, false, node.ignoreMissing);
		this._emitLine(`callback(null,${id});});`);
		this._emitLine('});');

		const id2 = this._tmpid();
		this._emitLine('tasks.push(');
		this._emitLine('function(template, callback){');
		this._emitLine(
			'template.render(context.getVariables(), frame, ' +
				this._makeCallback(id2)
		);
		this._emitLine('callback(null,' + id2 + ');});');
		this._emitLine('});');

		this._emitLine('tasks.push(');
		this._emitLine('function(result, callback){');
		this._emitLine(`${this.buffer} += result;`);
		this._emitLine('callback(null);');
		this._emitLine('});');
		this._emitLine('env.waterfall(tasks, function(){');
		this._addScopeLevel();
	}

	compileTemplateData(node: any, frame: any) {
		this.compileLiteral(node);
	}

	compileCapture(node: any, frame: any) {
		// we need to temporarily override the current buffer id as 'output'
		// so the set block writes to the capture output instead of the buffer
		let buffer = this.buffer;
		this.buffer = 'output';
		this._emitLine('(function() {');
		this._emitLine('var output = "";');
		this._withScopedSyntax(() => {
			this.compile(node.body, frame);
		});
		this._emitLine('return output;');
		this._emitLine('})()');
		// and of course, revert back to the old buffer id
		this.buffer = buffer;
	}

	compileOutput(node: Node, frame: any) {
		const children = node.children;
		children?.forEach((child) => {
			// TemplateData is a special case because it is never
			// autoescaped, so simply output it for optimization
			if (child instanceof TemplateData) {
				if (child.value) {
					this._emit(`${this.buffer} += `);
					this.compileLiteral(child); //TODO had frame also frame
					this._emitLine(';');
				}
			} else {
				this._emit(`${this.buffer} += runtime.suppressValue(`);
				if (this.throwOnUndefined) {
					this._emit('runtime.ensureDefined(');
				}
				this.compile(child, frame);
				if (this.throwOnUndefined) {
					this._emit(`,${node.lineno},${node.colno})`);
				}
				this._emit(', env.opts.autoescape);\n');
			}
		});
	}

	compileRoot(node: any, frame: any) {
		if (frame) {
			this.fail("compileRoot: root node can't have frame");
		}

		frame = new Frame();

		this._emitFuncBegin(node, 'root');
		this._emitLine('var parentTemplate = null;');
		this._compileChildren(node, frame);
		this._emitLine('if(parentTemplate) {');
		this._emitLine(
			'parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);'
		);
		this._emitLine('} else {');
		this._emitLine(`cb(null, ${this.buffer});`);
		this._emitLine('}');
		this._emitFuncEnd(true);

		this.inBlock = true;

		const blockNames = [];

		// @ts-ignore

		const blocks = node.findAll(Block); //?

		blocks.forEach((block, i) => {
			const name = block.name.value;

			if (blockNames.indexOf(name) !== -1) {
				throw new Error(`Block "${name}" defined more than once.`);
			}
			blockNames.push(name);

			this._emitFuncBegin(block, `b_${name}`);

			const tmpFrame = new Frame();
			this._emitLine('var frame = frame.push(true);');
			this.compile(block.body, tmpFrame);
			this._emitFuncEnd();
		});

		this._emitLine('return {');

		blocks.forEach((block, i) => {
			const blockName = `b_${block.name.value}`;
			this._emitLine(`${blockName}: ${blockName},`);
		});

		this._emitLine('root: root\n};');
	}

	compile(node: any, frame?: any) {
		let _compile = this['compile' + node.typename];
		if (_compile) {
			_compile.call(this, node, frame);
		} else {
			this.fail(
				`compile: Cannot compile node: ${node.typename}`,
				node.lineno,
				node.colno
			);
		}
	}

	getCode() {
		return this.codebuf.join('');
	}
}

export const compile = (
	src: string, //TODO: check this is true
	asyncFilters: readonly string[] = [],
	extensions: any[] = [],
	name: string,
	opts?: ICompilerOpts
) => {
	const c = new Compiler(name, opts);

	// Run the extension preprocessors against the source.
	const preprocessors = extensions
		.map((ext: any) => ext.preprocess)
		.filter((f) => !!f);

	const processedSrc = preprocessors.reduce(
		(s, processor) => processor(s),
		src
	);

	c.compile(
		transform(parser.parse(processedSrc, extensions, opts), asyncFilters) // TODO had 3 arguments name also
	);
	return c.getCode();
};
export default {
	compile,
	Compiler,
};
