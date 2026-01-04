"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mul = exports.Sub = exports.Concat = exports.Add = exports.And = exports.Or = exports.Is = exports.In = exports.TemplateData = exports.Extends = exports.KeywordArgs = exports.FilterAsync = exports.Filter = exports.Caller = exports.AsyncAll = exports.AsyncEach = exports.IfAsync = exports.Dict = exports.ArrayNode = exports.Group = exports.Root = exports.NodeList = exports.Symbol = exports.Literal = exports.Value = exports.CallExtension = exports.CompareOperand = exports.Compare = exports.BinOp = exports.UnaryOp = exports.Capture = exports.Output = exports.Case = exports.Switch = exports.Set = exports.Include = exports.FunCall = exports.TemplateRef = exports.Super = exports.Block = exports.Import = exports.Macro = exports.For = exports.InlineIf = exports.If = exports.LookupVal = exports.Pair = exports.FromImport = exports.Slice = exports.Node = void 0;
exports.NodeCreator = exports.CallExtensionAsync = exports.Pos = exports.Neg = exports.Not = exports.Pow = exports.Mod = exports.FloorDiv = exports.Div = void 0;
exports.printNodes = printNodes;
const lib_1 = require("./lib");
function traverseAndCheck(obj, type, results) {
    if (obj instanceof type) {
        results?.push(obj);
    }
    if (obj instanceof Node) {
        obj.findAll(type, results);
    }
}
class Node {
    lineno;
    colno;
    value;
    children = [];
    body;
    constructor(lineno = 0, colno = 0, // public extname = '', // public __typename: string = this.constructor.name, // public fields: string[] = []
    value) {
        this.lineno = lineno;
        this.colno = colno;
        this.value = value;
    }
    get fields() {
        return this.constructor.fields;
    }
    static fields = [];
    findAll(type, results = []) {
        if (this instanceof NodeList) {
            this.children.forEach((child) => traverseAndCheck(child, type, results));
        }
        else {
            this.fields.forEach((field) => traverseAndCheck(this[field], type, results));
        }
        return results;
    }
    iterFields(func) {
        this.fields.forEach((field) => {
            func(this[field], field);
        });
    }
}
exports.Node = Node;
class Slice extends Node {
    start;
    stop;
    step;
    constructor(lineno, colno, start, stop, step) {
        super(lineno, colno);
        this.start = start;
        this.stop = stop;
        this.step = step;
        this.start = start || new NodeList();
        this.stop = stop;
        this.step = step;
    }
    static fields = ['start', 'stop', 'step'];
    get typename() {
        return 'Slice';
    }
}
exports.Slice = Slice;
class FromImport extends Node {
    template;
    names;
    withContext;
    constructor(lineno, colno, template, names, withContext) {
        super(lineno, colno);
        this.template = template;
        this.names = names;
        this.withContext = withContext;
        (this.names = names || new NodeList()), (this.template = template);
        this.names = names;
        this.withContext = withContext;
    }
    static fields = ['template', 'names', 'withContext'];
    get typename() {
        return 'FromImport';
    }
}
exports.FromImport = FromImport;
class Pair extends Node {
    key;
    constructor(lineno, colno, key, value = null) {
        super(lineno, colno);
        this.key = key;
        this.key = key;
        this.value = value;
    }
    static fields = ['key', 'value'];
    get typename() {
        return 'Pair';
    }
}
exports.Pair = Pair;
class LookupVal extends Node {
    target;
    val;
    constructor(lineno, colno, target, val) {
        super(lineno, colno);
        this.target = target;
        this.val = val;
        this.target = target;
        this.val = val;
    }
    static fields = ['target', 'val'];
    get typename() {
        return 'LookupVal';
    }
}
exports.LookupVal = LookupVal;
class If extends Node {
    cond;
    else_;
    constructor(lineno, colno, cond, body, else_) {
        super(lineno, colno);
        this.cond = cond;
        this.else_ = else_;
        this.cond = cond;
        this.body = body;
        this.else_ = else_;
    }
    static fields = ['cond', 'body', 'else_'];
    get typename() {
        return 'If';
    }
}
exports.If = If;
class InlineIf extends Node {
    cond;
    else_;
    constructor(lineno, colno, cond, body, else_) {
        super(lineno, colno);
        this.cond = cond;
        this.else_ = else_;
        this.cond = cond;
        this.body = body;
        this.else_ = else_;
    }
    static fields = ['cond', 'body', 'else_'];
    get typename() {
        return 'InlineIf';
    }
}
exports.InlineIf = InlineIf;
class For extends Node {
    arr;
    name;
    else_;
    static fields = ['arr', 'name', 'body', 'else_'];
    constructor(lineno, colno, arr = [], name, body, else_) {
        super(lineno, colno);
        this.arr = arr;
        this.name = name;
        this.else_ = else_;
        this.arr = arr;
        this.name = name;
        this.body = body;
        this.else_ = else_;
    }
    get typename() {
        return 'For';
    }
}
exports.For = For;
class Macro extends Node {
    name;
    args;
    constructor(lineno, colno, name, args, body) {
        super(lineno, colno);
        this.name = name;
        this.args = args;
        this.name = name;
        this.args = args;
        this.body = body;
    }
    static fields = ['name', 'args', 'body'];
    get typename() {
        return 'Macro';
    }
}
exports.Macro = Macro;
class Import extends Node {
    template;
    target;
    withContext;
    static fields = ['template', 'target', 'withContext'];
    get typename() {
        return 'Import';
    }
    constructor(lineno, colno, template, target, withContext) {
        super(lineno, colno);
        this.template = template;
        this.target = target;
        this.withContext = withContext;
        this.template = template;
        this.target = target;
        this.withContext = withContext;
    }
}
exports.Import = Import;
class Block extends Node {
    body;
    name;
    constructor(lineno, colno, body, name) {
        super(lineno, colno);
        this.body = body;
        this.name = name;
        this.name = name;
        this.body = body;
    }
    static fields = ['name', 'body'];
    get typename() {
        return 'Block';
    }
}
exports.Block = Block;
class Super extends Node {
    blockName;
    symbol;
    constructor(lineno, colno, blockName, symbol) {
        super(lineno, colno);
        this.blockName = blockName;
        this.symbol = symbol;
        this.blockName = blockName;
        this.symbol = symbol;
    }
    static fields = ['blockName', 'symbol'];
    get typename() {
        return 'Super';
    }
}
exports.Super = Super;
class TemplateRef extends Node {
    template;
    constructor(lineno, colno, template) {
        super(lineno, colno);
        this.template = template;
        this.template = template;
    }
    static fields = ['template'];
    get typename() {
        return 'TemplateRef';
    }
}
exports.TemplateRef = TemplateRef;
class FunCall extends Node {
    name;
    args;
    constructor(lineno, colno, name, args) {
        super(lineno, colno);
        this.name = name;
        this.args = args;
        this.name = name;
        this.args = args;
    }
    static fields = ['name', 'args'];
    get typename() {
        return 'FunCall';
    }
}
exports.FunCall = FunCall;
class Include extends Node {
    template;
    ignoreMissing;
    constructor(lineno, colno, template, ignoreMissing = false) {
        super(lineno, colno);
        this.template = template;
        this.ignoreMissing = ignoreMissing;
        this.template = template;
        this.ignoreMissing = ignoreMissing;
    }
    static fields = ['template', 'ignoreMissing'];
    get typename() {
        return 'Include';
    }
}
exports.Include = Include;
class Set extends Node {
    targets;
    constructor(lineno, colno, targets, value) {
        super(lineno, colno);
        this.targets = targets || '';
        this.value = value;
    }
    static fields = ['targets', 'value'];
    get typename() {
        return 'Set';
    }
}
exports.Set = Set;
class Switch extends Node {
    expr;
    cases;
    _default;
    constructor(lineno, colno, expr, cases, _default) {
        super(lineno, colno);
        this.expr = expr;
        this.cases = cases;
        this._default = _default;
        this.expr = expr || '';
        this.cases = cases;
        this._default = _default;
    }
    static fields = ['expr', 'cases', 'default'];
    get typename() {
        return 'Switch';
    }
}
exports.Switch = Switch;
class Case extends Node {
    cond;
    constructor(lineno, colno, cond, body) {
        super(lineno, colno);
        this.cond = cond;
        this.cond = cond;
        this.body = body;
    }
    static fields = ['cond', 'body'];
    get typename() {
        return 'Case';
    }
}
exports.Case = Case;
class Output extends Node {
    get typename() {
        return 'Output';
    }
    constructor(lineno, colno, args) {
        super(lineno, colno);
        this.children = args;
    }
}
exports.Output = Output;
class Capture extends Node {
    constructor(lineno, colno, body) {
        super(lineno, colno);
        this.body = body;
    }
    static fields = ['body'];
    get typename() {
        return 'Capture';
    }
}
exports.Capture = Capture;
class UnaryOp extends Node {
    target;
    constructor(lineno, colno, target) {
        super(lineno, colno);
        this.target = target;
        this.target = target;
    }
    static fields = ['target'];
    get typename() {
        return 'UnaryOp';
    }
}
exports.UnaryOp = UnaryOp;
class BinOp extends Node {
    left;
    right;
    constructor(lineno, colno, left, right) {
        super(lineno, colno);
        this.left = left;
        this.right = right;
        this.right = right;
    }
    static fields = ['left', 'right'];
    get typename() {
        return 'BinOp';
    }
}
exports.BinOp = BinOp;
class Compare extends Node {
    expr;
    ops;
    constructor(lineno, colno, expr, ops = []) {
        super(lineno, colno);
        this.expr = expr;
        this.ops = ops;
        this.expr = expr;
        this.ops = ops;
    }
    static fields = ['expr', 'ops'];
    get typename() {
        return 'Compare';
    }
}
exports.Compare = Compare;
class CompareOperand extends Node {
    expr;
    type;
    constructor(lineno, colno, expr, type) {
        super(lineno, colno);
        this.expr = expr;
        this.type = type;
        this.expr = expr;
        this.type = type;
    }
    static fields = ['expr', 'type'];
    get typename() {
        return 'CompareOperand';
    }
}
exports.CompareOperand = CompareOperand;
class CallExtension extends Node {
    ext;
    prop;
    args;
    contentArgs;
    extname;
    autoescape;
    static fields = ['extname', 'prop', 'args', 'contentArgs'];
    get typename() {
        return 'CallExtension';
    }
    constructor(lineno, colno, ext, prop, args, contentArgs = []) {
        super(lineno, colno);
        this.ext = ext;
        this.prop = prop;
        this.args = args;
        this.contentArgs = contentArgs;
        // this.parent();
        this.extname = typeof ext === 'string' ? ext : ext.__name || '';
        this.prop = prop;
        this.args = args || new NodeList();
        this.contentArgs = contentArgs;
        this.autoescape = !(typeof ext === 'string') && ext.autoescape;
    }
}
exports.CallExtension = CallExtension;
class Value extends Node {
    value;
    static fields = ['value'];
    get typename() {
        return 'Value';
    }
    constructor(lineno, colno, value) {
        super(lineno, colno);
        this.value = value;
        this.value = value;
    }
}
exports.Value = Value;
class Literal extends Value {
    get typename() {
        return 'Literal';
    }
}
exports.Literal = Literal;
class Symbol extends Value {
    get typename() {
        return 'Symbol';
    }
}
exports.Symbol = Symbol;
class NodeList extends Node {
    children = [];
    static fields = ['children'];
    get typename() {
        return 'NodeList';
    }
    constructor(lineno = 0, colno = 0, children) {
        super(lineno, colno);
        this.children = children;
    }
    addChild(node) {
        this.children?.push(node);
    }
}
exports.NodeList = NodeList;
class Root extends NodeList {
    get typename() {
        return 'Root';
    }
}
exports.Root = Root;
class Group extends NodeList {
    get typename() {
        return 'Group';
    }
}
exports.Group = Group;
class ArrayNode extends NodeList {
    get typename() {
        return 'Array';
    }
}
exports.ArrayNode = ArrayNode;
class Dict extends NodeList {
    get typename() {
        return 'Dict';
    }
}
exports.Dict = Dict;
class IfAsync extends If {
    get typename() {
        return 'IfAsync';
    }
}
exports.IfAsync = IfAsync;
class AsyncEach extends For {
    get typename() {
        return 'AsyncEach';
    }
}
exports.AsyncEach = AsyncEach;
class AsyncAll extends For {
    get typename() {
        return 'AsyncAll';
    }
}
exports.AsyncAll = AsyncAll;
class Caller extends Macro {
    get typename() {
        return 'Caller';
    }
}
exports.Caller = Caller;
class Filter extends Macro {
    get typename() {
        return 'Filter';
    }
}
exports.Filter = Filter;
// @ts-ignore
class FilterAsync extends Filter {
    name;
    args;
    symbol;
    static fields = [
        'name',
        'args',
        'symbol',
    ];
    constructor(lineno, colno, name, args, symbol) {
        super(lineno, colno, name, args);
        this.name = name;
        this.args = args;
        this.symbol = symbol;
        this.name = name;
        this.args = args;
        this.symbol = symbol;
    }
    get typename() {
        return 'FilterAsync';
    }
}
exports.FilterAsync = FilterAsync;
class KeywordArgs extends Dict {
    constructor(lineno = 0, colno = 0) {
        super(lineno, colno);
    }
    get typename() {
        return 'KeywordArgs';
    }
}
exports.KeywordArgs = KeywordArgs;
class Extends extends TemplateRef {
    get typename() {
        return 'Extends';
    }
}
exports.Extends = Extends;
class TemplateData extends Literal {
    get typename() {
        return 'TemplateData';
    }
}
exports.TemplateData = TemplateData;
class In extends BinOp {
    get typename() {
        return 'In';
    }
}
exports.In = In;
class Is extends BinOp {
    get typename() {
        return 'Is';
    }
}
exports.Is = Is;
class Or extends BinOp {
    get typename() {
        return 'Or';
    }
}
exports.Or = Or;
class And extends BinOp {
    get typename() {
        return 'And';
    }
}
exports.And = And;
class Add extends BinOp {
    get typename() {
        return 'Add';
    }
}
exports.Add = Add;
class Concat extends BinOp {
    get typename() {
        return 'Concat';
    }
}
exports.Concat = Concat;
class Sub extends BinOp {
    get typename() {
        return 'Sub';
    }
}
exports.Sub = Sub;
class Mul extends BinOp {
    get typename() {
        return 'Mul';
    }
}
exports.Mul = Mul;
class Div extends BinOp {
    get typename() {
        return 'Div';
    }
}
exports.Div = Div;
class FloorDiv extends BinOp {
    get typename() {
        return 'FloorDiv';
    }
}
exports.FloorDiv = FloorDiv;
class Mod extends BinOp {
    get typename() {
        return 'Mod';
    }
}
exports.Mod = Mod;
class Pow extends BinOp {
    get typename() {
        return 'Pow';
    }
}
exports.Pow = Pow;
class Not extends UnaryOp {
    get typename() {
        return 'Not';
    }
}
exports.Not = Not;
class Neg extends UnaryOp {
    get typename() {
        return 'Neg';
    }
}
exports.Neg = Neg;
class Pos extends UnaryOp {
    get typename() {
        return 'Pos';
    }
}
exports.Pos = Pos;
class CallExtensionAsync extends CallExtension {
    name; // todo remove this
    get typename() {
        return 'CallExtensionAsync';
    }
}
exports.CallExtensionAsync = CallExtensionAsync;
function print(str, indent = 0, inline = false) {
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
function printNodes(node, indent = 0) {
    lib_1.p.log(node?.typename + ': ', indent);
    if (node instanceof NodeList) {
        print('\n');
        node.children.forEach((n) => {
            printNodes(n, indent + 2);
        });
    }
    else if (node instanceof CallExtension) {
        print(`${node.extname}.${node.prop}\n`);
        if (node.args) {
            printNodes(node.args, indent + 2);
        }
        if (node.contentArgs) {
            node.contentArgs.forEach((n) => {
                printNodes(n, indent + 2);
            });
        }
    }
    else {
        let nodes = [];
        let props = null;
        node.iterFields((val, fieldName) => {
            if (val instanceof Node) {
                nodes?.push([fieldName, val]);
            }
            else {
                props = props || {};
                props[fieldName] = val;
            }
        });
        print(props ? (0, lib_1.dump)(props, 2) + '\n' : '\n', 0, true);
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
};
const NodeCreator = (key) => {
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
exports.NodeCreator = NodeCreator;
