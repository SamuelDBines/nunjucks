"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
const parser_1 = require("./parser");
const transformer_1 = require("./transformer");
const nodes_1 = require("./nodes");
const lib_1 = require("./lib");
const runtime_1 = require("./runtime");
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
};
class Compiler {
    templateName = '';
    lastId = 0;
    _scopeClosers = '';
    inBlock = false;
    throwOnUndefined = false;
    extname;
    __typename;
    // TODO: confirm these types
    codebuf = [];
    buffer = null;
    bufferStack = [];
    constructor(templateName, opts) {
        this.templateName = templateName;
        this.codebuf = opts?.codebuf || [];
        this.lastId = opts?.lastId || 0;
        this.buffer = opts?.buffer || null;
        this.bufferStack = opts?.bufferStack || [];
        this._scopeClosers = opts?._scopeClosers || '';
        this.inBlock = opts?.inBlock || false;
        this.throwOnUndefined = opts?.throwOnUndefined || false;
    }
    get typename() {
        return 'Compiler';
    }
    fail(msg, lineno = 0, colno = 0) {
        if (lineno !== undefined) {
            lineno += 1;
        }
        if (colno !== undefined) {
            colno += 1;
        }
        lib_1.p.err(msg, lineno, colno);
        throw (0, lib_1.TemplateError)(msg, lineno, colno);
    }
    _pushBuffer() {
        const id = this._tmpid();
        this.bufferStack?.push(this.buffer);
        this.buffer = id;
        this._emit(`var ${this.buffer} = "";`);
        return id;
    }
    _popBuffer() {
        this.buffer = this.bufferStack.pop();
    }
    _emit(code, newLine = false) {
        if (Array.isArray(code))
            code = code.join('\n');
        if (newLine)
            code += '\n';
        this.codebuf?.push(code);
    }
    _emitFuncBegin(node, name) {
        this.buffer = 'output';
        this._scopeClosers = '';
        this._emit([
            `function ${name}(env, context, frame, runtime, cb) {`,
            `var lineno = ${node?.lineno};`,
            `var colno = ${node?.colno};`,
            `var ${this.buffer} = "";`,
            'try {',
        ], true);
    }
    _emitFuncEnd(noReturn) {
        if (!noReturn) {
            this._emit('cb(null, ' + this.buffer + ');', true);
        }
        this._closeScopeLevels();
        this._emit([
            '} catch (e) {',
            '  cb(runtime.handleError(e, lineno, colno));',
            '}',
            '}',
        ], true);
        this.buffer = null;
    }
    _addScopeLevel() {
        this._scopeClosers += '})';
    }
    _closeScopeLevels() {
        this._emit(this._scopeClosers + ';', true);
        this._scopeClosers = '';
    }
    _withScopedSyntax(func) {
        let _scopeClosers = this._scopeClosers;
        this._scopeClosers = '';
        func.call(this);
        this._closeScopeLevels();
        this._scopeClosers = _scopeClosers;
    }
    _makeCallback(res) {
        let err = this._tmpid();
        if (err)
            lib_1.p.err(err);
        return `function(${err}${res ? ',' + res : ''}) {\n 
			if(${err}) { 
				cb(${err}); 
			return;
		 }`;
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
    _compileChildren(node, frame) {
        node.children.forEach((child) => {
            if (!child)
                lib_1.p.warn('_compileChildren: ', node);
            this.compile(child, frame);
        });
    }
    _compileAggregate(node, frame, startChar, endChar) {
        if (startChar) {
            this._emit(startChar);
        }
        node.children.forEach((child, i) => {
            if (i > 0) {
                this._emit(',');
            }
            if (!child) {
                lib_1.p.warn('_compileAggregate: ', node);
            }
            else {
                this.compile(child, frame);
            }
        });
        if (endChar) {
            this._emit(endChar);
        }
    }
    _compileExpression(node, frame) {
        // TODO: I'm not really sure if this type check is worth it or
        // not.
        this.assertType(node, nodes_1.Literal, nodes_1.Symbol, nodes_1.Group, nodes_1.ArrayNode, nodes_1.Dict, nodes_1.FunCall, nodes_1.Caller, nodes_1.Filter, nodes_1.LookupVal, nodes_1.Compare, nodes_1.InlineIf, nodes_1.In, nodes_1.Is, nodes_1.And, nodes_1.Or, nodes_1.Not, nodes_1.Add, nodes_1.Concat, nodes_1.Sub, nodes_1.Mul, nodes_1.Div, nodes_1.FloorDiv, nodes_1.Mod, nodes_1.Pow, nodes_1.Neg, nodes_1.Pos, nodes_1.Compare, nodes_1.NodeList);
        if (!node)
            lib_1.p.warn('_compileExpression');
        this.compile(node, frame);
    }
    // Deprecated
    assertType(node, ...types) {
        if (!types.some((t) => node instanceof t)) {
            this.fail(`assertType: invalid type: ${node?.typename}`, node?.lineno, node?.colno);
        }
    }
    compileCallExtension(node, frame, async = true) {
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
            if (!(args instanceof nodes_1.NodeList)) {
                this.fail('compileCallExtension: arguments must be a NodeList, ' +
                    'use `parser.parseSignature`');
            }
            args.children.forEach((arg, i) => {
                // Tag arguments are passed normally to the call. Note
                // that keyword arguments are turned into a single js
                // object as the last argument, if they exist.
                this._compileExpression(arg, frame);
                if (i !== args.children?.length - 1 || contentArgs?.length) {
                    this._emit(',');
                }
            });
        }
        if (contentArgs?.length) {
            contentArgs.forEach((node, i) => {
                if (i > 0) {
                    this._emit(',');
                }
                if (node) {
                    this._emit([
                        'function(cb) {',
                        'if(!cb) { cb = function(err) { if(err) { throw err; }}}',
                    ], true);
                    const id = this._pushBuffer();
                    this._withScopedSyntax(() => {
                        if (!node)
                            lib_1.p.warn('_withScopedSyntax');
                        this.compile(node, frame);
                        this._emit(`cb(null, ${id});`, true);
                    });
                    this._popBuffer();
                    this._emit([`return ${id};`, '}'], true);
                }
                else {
                    this._emit('null');
                }
            });
        }
        if (async) {
            const res = this._tmpid();
            this._emit([
                ', ' + this._makeCallback(res),
                `${this.buffer} += runtime.suppressValue(${res}, ${autoescape} && env.autoescape);`,
            ], true);
            this._addScopeLevel();
        }
        else {
            this._emit(')');
            this._emit(`, ${autoescape} && env.autoescape);\n`);
        }
    }
    compileCallExtensionAsync(node, frame) {
        this.compileCallExtension(node, frame, true);
    }
    compileNodeList(node, frame) {
        this._compileChildren(node, frame);
    }
    compileLiteral(node) {
        if (typeof node.value === 'string') {
            let val = node.value.replace(/\\/g, '\\\\');
            val = val.replace(/"/g, '\\"');
            val = val.replace(/\n/g, '\\n');
            val = val.replace(/\r/g, '\\r');
            val = val.replace(/\t/g, '\\t');
            val = val.replace(/\u2028/g, '\\u2028');
            this._emit(`"${val}"`);
        }
        else if (node.value === null) {
            this._emit('null');
        }
        else {
            this._emit(node.value.toString());
        }
    }
    compileSymbol(node, frame) {
        let name = node.value;
        let v = frame.lookup(name);
        if (v) {
            this._emit(v);
        }
        else {
            this._emit('runtime.contextOrFrameLookup(' + 'context, frame, "' + name + '")');
        }
    }
    compileGroup(node, frame) {
        this._compileAggregate(node, frame, '(', ')');
    }
    compileArray(node, frame) {
        this._compileAggregate(node, frame, '[', ']');
    }
    compileDict(node, frame) {
        this._compileAggregate(node, frame, '{', '}');
    }
    compilePair(node, frame) {
        let key = node.key;
        let val = node.value;
        if (key instanceof nodes_1.Symbol) {
            key = new nodes_1.Literal(key?.lineno, key?.colno, key.value);
        }
        else if (!(key instanceof nodes_1.Literal && typeof key.value === 'string')) {
            this.fail('compilePair: Dict keys must be strings or names', key?.lineno, key?.colno);
        }
        if (!key)
            lib_1.p.warn('compilePair');
        this.compile(key, frame);
        this._emit(': ');
        this._compileExpression(val, frame);
    }
    compileInlineIf(node, frame) {
        this._emit('(');
        if (!node.cond)
            lib_1.p.warn('compileInlineIf cond', node);
        this.compile(node.cond, frame);
        this._emit('?');
        if (!node.body)
            lib_1.p.warn('compileInlineIf body', node);
        this.compile(node.body, frame);
        this._emit(':');
        if (node.else_ !== null) {
            this.compile(node.else_, frame);
        }
        else {
            this._emit('""');
        }
        this._emit(')');
    }
    compileIn(node, frame) {
        this._emit('runtime.inOperator(');
        this.compile(node.left, frame);
        this._emit(',');
        this.compile(node.right, frame);
        this._emit(')');
    }
    compileIs(node, frame) {
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
    compileOr(node, frame) {
        return this._binOpEmitter(node, frame, ' || ');
    }
    compileAnd(node, frame) {
        return this._binOpEmitter(node, frame, ' && ');
    }
    compileAdd(node, frame) {
        return this._binOpEmitter(node, frame, ' + ');
    }
    compileConcat(node, frame) {
        return this._binOpEmitter(node, frame, ' + "" + ');
    }
    compileSub(node, frame) {
        return this._binOpEmitter(node, frame, ' - ');
    }
    compileMul(node, frame) {
        return this._binOpEmitter(node, frame, ' * ');
    }
    compileDiv(node, frame) {
        return this._binOpEmitter(node, frame, ' / ');
    }
    compileMod(node, frame) {
        return this._binOpEmitter(node, frame, ' % ');
    }
    compileNot(node, frame) {
        this._emit('!');
        this.compile(node.target, frame);
    }
    compileFloorDiv(node, frame) {
        this._emit('Math.floor(');
        this.compile(node.left, frame);
        this._emit(' / ');
        this.compile(node.right, frame);
        this._emit(')');
    }
    compilePow(node, frame) {
        this._emit('Math.pow(');
        this.compile(node.left, frame);
        this._emit(', ');
        this.compile(node.right, frame);
        this._emit(')');
    }
    compileNeg(node, frame) {
        this._emit('-');
        this.compile(node.target, frame);
    }
    compilePos(node, frame) {
        this._emit('+');
        this.compile(node.target, frame);
    }
    compileCompare(node, frame) {
        this.compile(node.expr, frame);
        node.ops.forEach((op) => {
            this._emit(` ${compareOps[op.type]} `);
            this.compile(op.expr, frame);
        });
    }
    compileLookupVal(node, frame) {
        this._emit('runtime.memberLookup((');
        this._compileExpression(node.target, frame);
        this._emit('),');
        this._compileExpression(node.val, frame);
        this._emit(')');
    }
    _getNodeName(node) {
        if (node instanceof nodes_1.Symbol)
            return node.value;
        if (node instanceof nodes_1.FunCall)
            return 'the return value of (' + this._getNodeName(node.name) + ')';
        if (node instanceof nodes_1.LookupVal)
            return (this._getNodeName(node.target) +
                '["' +
                this._getNodeName(node.value) +
                '"]');
        if (node instanceof nodes_1.Literal)
            return node.value.toString();
        return '--expression--';
    }
    compileFunCall(node, frame) {
        // Keep track of line/col info at runtime by settings
        // variables within an expression. An expression in javascript
        // like (x, y, z) returns the last value, and x and y can be
        // anything
        this._emit('(lineno = ' + node?.lineno + ', colno = ' + node?.colno + ', ');
        this._emit('runtime.callWrap(');
        // Compile it as normal.
        this._compileExpression(node.name, frame);
        // Output the name of what we're calling so we can get friendly errors
        // if the lookup fails.
        this._emit(', "' + this._getNodeName(node.name).replace(/"/g, '\\"') + '", context, ');
        this._compileAggregate(node.args, frame, '[', '])');
        this._emit(')');
    }
    compileFilter(node, frame) {
        let name = node.name;
        // this.assertType(name, Symbol);
        this._emit('env.getFilter("' + name.value + '").call(context, ');
        this._compileAggregate(node.args, frame);
        this._emit(')');
    }
    compileFilterAsync(node, frame) {
        let name = node.name;
        let symbol = node.symbol.value;
        // this.assertType(name, Symbol);
        frame.set(symbol, symbol);
        this._emit('env.getFilter("' + name.value + '").call(context, ');
        this._compileAggregate(node.args, frame);
        this._emit(', ' + this._makeCallback(symbol), true);
        this._addScopeLevel();
    }
    compileKeywordArgs(node, frame) {
        this._emit('runtime.makeKeywordArgs(');
        this.compileDict(node, frame);
        this._emit(')');
    }
    compileSet(node, frame) {
        let ids = [];
        // Lookup the variable names for each identifier and create
        // new ones if necessary
        node.targets.forEach((target) => {
            let name = target.value;
            let id = frame.lookup(name);
            if (id === null || id === undefined) {
                id = this._tmpid();
                // Note: This relies on js allowing scope across
                // blocks, in case this is created inside an `if`
                this._emit('var ' + id + ';', true);
            }
            ids?.push(id);
        });
        if (node.value) {
            this._emit(ids.join(' = ') + ' = ');
            this._compileExpression(node.value, frame);
            this._emit(';', true);
        }
        else {
            this._emit(ids.join(' = ') + ' = ');
            this.compile(node.body, frame);
            this._emit(';', true);
        }
        node.targets.forEach((target, i) => {
            let id = ids[i];
            let name = target.value;
            // We are running this for every var, but it's very
            // uncommon to assign to multiple vars anyway
            this._emit(`frame.set("${name}", ${id}, true);`, true);
            this._emit('if(frame.topLevel) {', true);
            this._emit(`context.setVariable("${name}", ${id});`, true);
            this._emit('}', true);
            if (name.charAt(0) !== '_') {
                this._emit('if(frame.topLevel) {', true);
                this._emit(`context.addExport("${name}", ${id});`, true);
                this._emit('}', true);
            }
        });
    }
    compileSwitch(node, frame) {
        this._emit('switch (');
        this.compile(node.expr, frame);
        this._emit(') {');
        node.cases.forEach((c, i) => {
            this._emit('case ');
            this.compile(c.cond, frame);
            this._emit(': ');
            this.compile(c.body, frame);
            // preserve fall-throughs
            if (c.body.children?.length) {
                this._emit('break;', true);
            }
        });
        if (node._default) {
            this._emit('default:');
            this.compile(node._default, frame);
        }
        this._emit('}');
    }
    compileIf(node, frame, async = false) {
        this._emit('if(');
        this._compileExpression(node.cond, frame);
        this._emit(') {', true);
        this._withScopedSyntax(() => {
            this.compile(node.body, frame);
            if (async) {
                this._emit('cb()');
            }
        });
        if (node.else_) {
            this._emit('}\nelse {', true);
            this._withScopedSyntax(() => {
                this.compile(node.else_, frame);
                if (async) {
                    this._emit('cb()');
                }
            });
        }
        else if (async) {
            this._emit('}\nelse {', true);
            this._emit('cb()');
        }
        this._emit('}', true);
    }
    compileIfAsync(node, frame) {
        this._emit('(function(cb) {');
        this.compileIf(node, frame, true);
        this._emit('})(' + this._makeCallback());
        this._addScopeLevel();
    }
    _emitLoopBindings(node, arr, i, len) {
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
            this._emit(`frame.set("loop.${b.name}", ${b.val});`, true);
        });
    }
    compileFor(node, frame) {
        // Some of this code is ugly, but it keeps the generated code
        // as fast as possible. ForAsync also shares some of this, but
        // not much.
        const i = this._tmpid();
        const len = this._tmpid();
        const arr = this._tmpid();
        frame = frame?.push();
        this._emit('frame = frame?.push();', true);
        this._emit(`var ${arr} = `);
        this._compileExpression(node.arr, frame);
        this._emit(';', true);
        this._emit(`if(${arr}) {`);
        this._emit(arr + ' = runtime.fromIterator(' + arr + ');', true);
        // If multiple names are passed, we need to bind them
        // appropriately
        if (node.name instanceof nodes_1.ArrayNode) {
            this._emit(`var ${i};`, true);
            // The object could be an arroy or object. Note that the
            // body of the loop is duplicated for each condition, but
            // we are optimizing for speed over size.
            this._emit(`if(Array.isArray(${arr})) {`, true);
            this._emit(`var ${len} = ${arr}?.length;`, true);
            this._emit(`for(${i}=0; ${i} < ${arr}?.length; ${i}++) {`, true);
            // Bind each declared var
            node.name.children.forEach((child, u) => {
                let tid = this._tmpid();
                this._emit(`var ${tid} = ${arr}[${i}][${u}];`, true);
                this._emit(`frame.set("${child}", ${arr}[${i}][${u}]);`, true);
                frame.set(node.name.children[u].value, tid);
            });
            this._emitLoopBindings(node, arr, i, len);
            this._withScopedSyntax(() => {
                this.compile(node.body, frame);
            });
            this._emit('}', true);
            this._emit('} else {', true);
            // Iterate over the key/values of an object
            const [key, val] = node.name.children;
            const k = this._tmpid();
            const v = this._tmpid();
            frame.set(key.value, k);
            frame.set(val.value, v);
            this._emit([
                `${i} = -1;`,
                `var ${len} = runtime.keys(${arr})?.length;`,
                `for(var ${k} in ${arr}) {`,
                `${i}++;`,
                `var ${v} = ${arr}[${k}];`,
                `frame.set("${key.value}", ${k});`,
                `frame.set("${val.value}", ${v});`,
            ], true);
            this._emitLoopBindings(node, arr, i, len);
            this._withScopedSyntax(() => {
                this.compile(node.body, frame);
            });
            this._emit('}', true);
            this._emit('}', true);
        }
        else {
            // Generate a typical array iteration
            const v = this._tmpid();
            frame.set(node.name.value, v);
            this._emit(`var ${len} = ${arr}?.length;`, true);
            this._emit(`for(var ${i}=0; ${i} < ${arr}?.length; ${i}++) {`, true);
            this._emit(`var ${v} = ${arr}[${i}];`, true);
            this._emit(`frame.set("${node.name.value}", ${v});`, true);
            this._emitLoopBindings(node, arr, i, len);
            this._withScopedSyntax(() => {
                this.compile(node.body, frame);
            });
            this._emit('}', true);
        }
        this._emit('}', true);
        if (node.else_) {
            this._emit('if (!' + len + ') {', true);
            this.compile(node.else_, frame);
            this._emit('}', true);
        }
        this._emit('frame = frame.pop();', true);
    }
    //TODO: Find out the type
    _compileAsyncLoop(node, frame, parallel = true) {
        // This shares some code with the For tag, but not enough to
        // worry about. This iterates across an object asynchronously,
        // but not in parallel.
        let i = this._tmpid();
        let len = this._tmpid();
        let arr = this._tmpid();
        let asyncMethod = parallel ? 'asyncAll' : 'asyncEach';
        frame = frame?.push();
        this._emit('frame = frame?.push();', true);
        this._emit('var ' + arr + ' = runtime.fromIterator(');
        this._compileExpression(node.arr, frame);
        this._emit(');', true);
        if (node.name instanceof nodes_1.ArrayNode) {
            const arrayLen = node.name.children?.length;
            this._emit(`runtime.${asyncMethod}(${arr}, ${arrayLen}, function(`);
            node.name.children.forEach((name) => {
                this._emit(`${name.value},`);
            });
            this._emit(i + ',' + len + ',next) {');
            node.name.children.forEach((name) => {
                const id = name.value;
                frame.set(id, id);
                this._emit(`frame.set("${id}", ${id});`, true);
            });
        }
        else {
            const id = node.name.value;
            this._emit([
                `runtime.${asyncMethod}(${arr}, 1, function(${id}, ${i}, ${len},next) {`,
                'frame.set("' + id + '", ' + id + ', true);',
            ]);
            frame.set(id, id);
        }
        this._emitLoopBindings(node, arr, i, len);
        this._withScopedSyntax(() => {
            let buf;
            if (parallel) {
                buf = this._pushBuffer();
            }
            this.compile(node.body, frame);
            this._emit('next(' + i + (buf ? ',' + buf : '') + ', true);');
            if (parallel) {
                this._popBuffer();
            }
        });
        const output = this._tmpid();
        this._emit('}, ' + this._makeCallback(output), true);
        this._addScopeLevel();
        if (parallel) {
            this._emit(this.buffer + ' += ' + output + ';', true);
        }
        if (node.else_) {
            this._emit('if (!' + arr + '?.length) {', true);
            this.compile(node.else_, frame);
            this._emit('}', true);
        }
        this._emit('frame = frame.pop();', true);
    }
    compileAsyncEach(node, frame) {
        this._compileAsyncLoop(node, frame);
    }
    compileAsyncAll(node, frame) {
        this._compileAsyncLoop(node, frame, true);
    }
    _compileMacro(node, frame) {
        let args = [];
        let kwargs = null;
        let funcId = 'macro_' + this._tmpid();
        let keepFrame = frame !== undefined;
        // Type check the definition of the args
        node.args.children.forEach((arg, i) => {
            if (i === node.args.children?.length - 1 && arg instanceof nodes_1.Dict) {
                kwargs = arg;
            }
            else {
                // this.assertType(arg, Symbol);
                args?.push(arg);
            }
        });
        const realNames = [...args.map((n) => `l_${n.value}`), 'kwargs'];
        // Quoted argument names
        const argNames = args.map((n) => `"${n.value}"`);
        const kwargNames = ((kwargs && kwargs.children) || []).map((n) => `"${n.key.value}"`);
        // We pass a function to makeMacro which destructures the
        // arguments so support setting positional args with keywords
        // args and passing keyword args as positional args
        // (essentially default values). See runtime.js.
        let currFrame;
        if (keepFrame) {
            currFrame = frame?.push(true);
        }
        else {
            currFrame = new runtime_1.Frame();
        }
        this._emit([
            `var ${funcId} = runtime.makeMacro(`,
            `[${argNames.join(', ')}], `,
            `[${kwargNames.join(', ')}], `,
            `function (${realNames.join(', ')}) {`,
            'var callerFrame = frame;',
            'frame = ' +
                (keepFrame ? 'frame?.push(true);' : 'new runtime.Frame();'),
            'kwargs = kwargs || {};',
            'if (Object.prototype.hasOwnProperty.call(kwargs, "caller")) {',
            'frame.set("caller", kwargs.caller); }',
        ], true);
        // Expose the arguments to the template. Don't need to use
        // random names because the function
        // will create a new run-time scope for us
        args.forEach((arg) => {
            this._emit(`frame.set("${arg.value}", l_${arg.value});`, true);
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
        this._emit([
            'frame = ' + (keepFrame ? 'frame.pop();' : 'callerFrame;'),
            `return new runtime.SafeString(${bufferId});`,
            '});',
        ], true);
        this._popBuffer();
        return funcId;
    }
    compileMacro(node, frame) {
        let funcId = this._compileMacro(node);
        // Expose the macro to the templates
        let name = node.name.value;
        frame.set(name, funcId);
        if (frame.parent) {
            this._emit(`frame.set("${name}", ${funcId});`, true);
        }
        else {
            if (node.name.value.charAt(0) !== '_') {
                this._emit(`context.addExport("${name}");`, true);
            }
            this._emit(`context.setVariable("${name}", ${funcId});`, true);
        }
    }
    compileCaller(node, frame) {
        // basically an anonymous "macro expression"
        this._emit('(function (){');
        const funcId = this._compileMacro(node, frame);
        this._emit(`return ${funcId};})()`);
    }
    _compileGetTemplate(node, frame, eagerCompile = true, ignoreMissing = true) {
        const parentTemplateId = this._tmpid();
        const parentName = this._templateName();
        const cb = this._makeCallback(parentTemplateId);
        this._emit('env.getTemplate(');
        this._compileExpression(node.template, frame);
        this._emit(`, ${cb}`, 
        // , {
        // 	eagerCompile: ${eagerCompile ? 'true' : 'false'},
        // 	parentName: ${parentName},
        // 	ignoreMissing: ${ignoreMissing ? 'true' : 'false'}
        // })
        true);
        return parentTemplateId;
    }
    compileImport(node, frame) {
        const target = node.target.value;
        const id = this._compileGetTemplate(node, frame, false, false);
        this._addScopeLevel();
        this._emit(id +
            '.getExported(' +
            (node.withContext ? 'context.getVariables(), frame, ' : '') +
            this._makeCallback(id), true);
        this._addScopeLevel();
        frame.set(target, id);
        if (frame.parent) {
            this._emit(`frame.set("${target}", ${id});`, true);
        }
        else {
            this._emit(`context.setVariable("${target}", ${id});`, true);
        }
    }
    compileFromImport(node, frame) {
        const importedId = this._compileGetTemplate(node, frame, false, false);
        this._addScopeLevel();
        this._emit(importedId +
            '.getExported(' +
            (node.withContext ? 'context.getVariables(), frame, ' : '') +
            this._makeCallback(importedId), true);
        this._addScopeLevel();
        node.names.children.forEach((nameNode) => {
            let name;
            let alias;
            let id = this._tmpid();
            if (nameNode instanceof nodes_1.Pair) {
                name = nameNode.key.value;
                alias = nameNode.value.value;
            }
            else {
                name = nameNode.value;
                alias = name;
            }
            this._emit([
                `if(Object.prototype.hasOwnProperty.call(${importedId}, "${name}")) {`,
                `var ${id} = ${importedId}.${name};`,
                '} else {',
                `cb(new Error("cannot import '${name}'")); return;`,
                '}',
            ], true);
            frame.set(alias, id);
            if (frame.parent) {
                this._emit(`frame.set("${alias}", ${id});`, true);
            }
            else {
                this._emit(`context.setVariable("${alias}", ${id});`, true);
            }
        });
    }
    compileBlock(node) {
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
        this._emit('(env, context, frame, runtime, ' + this._makeCallback(id));
        this._emit(`${this.buffer} += ${id};`, true);
        this._addScopeLevel();
    }
    compileSuper(node, frame) {
        let name = node.blockName.value;
        let id = node.symbol.value;
        const cb = this._makeCallback(id);
        this._emit([
            `context.getSuper(env, "${name}", b_${name}, frame, runtime, ${cb}`,
            `${id} = runtime.markSafe(${id});`,
        ], true);
        this._addScopeLevel();
        frame.set(id, id);
    }
    compileExtends(node, frame) {
        let k = this._tmpid();
        const parentTemplateId = this._compileGetTemplate(node, frame, true, false);
        // extends is a dynamic tag and can occur within a block like
        // `if`, so if this happens we need to capture the parent
        // template in the top-level scope
        this._emit(`parentTemplate = ${parentTemplateId}`, true);
        this._emit([
            `for(var ${k} in parentTemplate.blocks) {`,
            `context.addBlock(${k}, parentTemplate.blocks[${k}]);`,
            '}',
        ], true);
        this._addScopeLevel();
    }
    compileInclude(node, frame) {
        this._emit('var tasks = [];', true);
        this._emit('tasks?.push(', true);
        this._emit('function(callback) {', true);
        const id = this._compileGetTemplate(node, frame, false, node.ignoreMissing);
        this._emit(`callback(null,${id});});`, true);
        this._emit('});', true);
        const id2 = this._tmpid();
        this._emit([
            'tasks?.push(',
            'function(template, callback){',
            'template.render(context.getVariables(), frame, ' +
                this._makeCallback(id2),
            'callback(null,' + id2 + ', true);});',
            '});',
            'tasks?.push(',
            'function(result, callback){',
            `${this.buffer} += result;`,
            'callback(null);',
            '});',
            'env.waterfall(tasks, function(){',
        ], true);
        this._addScopeLevel();
    }
    compileTemplateData(node, frame) {
        this.compileLiteral(node);
    }
    compileCapture(node, frame) {
        // we need to temporarily override the current buffer id as 'output'
        // so the set block writes to the capture output instead of the buffer
        let buffer = this.buffer;
        this.buffer = 'output';
        this._emit('(function() {', true);
        this._emit('var output = "";', true);
        this._withScopedSyntax(() => {
            this.compile(node.body, frame);
        });
        this._emit('return output;', true);
        this._emit('})()', true);
        // and of course, revert back to the old buffer id
        this.buffer = buffer;
    }
    compileOutput(node, frame) {
        const children = node.children;
        children?.forEach((child) => {
            // TemplateData is a special case because it is never
            // autoescaped, so simply output it for optimization
            if (child instanceof nodes_1.TemplateData) {
                if (child.value) {
                    this._emit(`${this.buffer} += `);
                    this.compileLiteral(child); //TODO had frame also frame
                    this._emit(';', true);
                }
            }
            else {
                this._emit(`${this.buffer} += runtime.suppressValue(`);
                if (this.throwOnUndefined) {
                    this._emit('runtime.ensureDefined(');
                }
                this.compile(child, frame);
                if (this.throwOnUndefined) {
                    this._emit(`,${node?.lineno},${node?.colno})`);
                }
                this._emit(', env.autoescape);\n');
            }
        });
    }
    compileRoot(node, frame) {
        if (frame) {
            this.fail("compileRoot: root node can't have frame");
        }
        frame = new runtime_1.Frame();
        this._emitFuncBegin(node, 'root');
        this._emit('var parentTemplate = null;', true);
        this._compileChildren(node, frame);
        this._emit([
            'if(parentTemplate) {',
            'parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);',
            '} else {',
            `cb(null, ${this.buffer});`,
            '}',
        ], true);
        this._emitFuncEnd(true);
        this.inBlock = true;
        const blockNames = [];
        const blocks = node.findAll(nodes_1.Block); //?
        blocks.forEach((block, i) => {
            const name = block.name.value;
            if (blockNames.indexOf(name) !== -1) {
                lib_1.p.err(`Block "${name}" defined more than once.`);
                throw new Error(`Block "${name}" defined more than once.`);
            }
            blockNames?.push(name);
            this._emitFuncBegin(block, `b_${name}`);
            const tmpFrame = new runtime_1.Frame();
            this._emit('var frame = frame?.push(true);', true);
            this.compile(block.body, tmpFrame);
            this._emitFuncEnd();
        });
        this._emit('return {', true);
        blocks.forEach((block, i) => {
            const blockName = `b_${block.name.value}`;
            this._emit(`${blockName}: ${blockName},`, true);
        });
        this._emit('root: root\n};', true);
    }
    compile(node, frame) {
        lib_1.p.debug('Compiling: ', node);
        let _compile = this['compile' + node?.typename];
        lib_1.p.warn('Compiling: ', _compile);
        if (_compile) {
            _compile.call(this, node, frame);
        }
        else {
            this.fail(`compile: Cannot compile node: ${node?.typename}`, node?.lineno, node?.colno);
        }
    }
    getCode() {
        return this.codebuf.join('');
    }
}
const compile = (src, //TODO: check this is true
asyncFilters = [], extensions = [], name, opts) => {
    const c = new Compiler(name, opts);
    const processedSrc = extensions
        .map((ext) => ext.preprocess)
        .filter((f) => !!f)
        .reduce((s, processor) => processor(s), src);
    c.compile((0, transformer_1.transform)((0, parser_1.parse)(processedSrc, extensions, opts), asyncFilters) // TODO had 3 arguments name also
    );
    return c.getCode();
};
exports.compile = compile;
