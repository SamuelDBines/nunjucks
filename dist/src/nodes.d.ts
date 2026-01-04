export declare abstract class Node {
    lineno: number;
    colno: number;
    value?: any;
    children: Node[];
    body?: Node;
    constructor(lineno?: number, colno?: number, // public extname = '', // public __typename: string = this.constructor.name, // public fields: string[] = []
    value?: any);
    abstract get typename(): NodeTypeKey;
    get fields(): readonly string[];
    static readonly fields: readonly string[];
    findAll(this: Node, type: NodeTypeValue, results?: any[]): any[];
    iterFields(this: any, func: Function): void;
}
export declare class Slice extends Node {
    start?: Literal;
    stop?: Literal;
    step?: Literal;
    constructor(lineno: number, colno: number, start?: Literal, stop?: Literal, step?: Literal);
    static readonly fields: readonly ["start", "stop", "step"];
    get typename(): NodeTypeKey;
}
export declare class FromImport extends Node {
    template?: string;
    names?: NodeList;
    withContext?: any;
    constructor(lineno: number, colno: number, template?: string, names?: NodeList, withContext?: any);
    static readonly fields: readonly ["template", "names", "withContext"];
    get typename(): NodeTypeKey;
}
export declare class Pair extends Node {
    key?: any;
    constructor(lineno: number, colno: number, key?: any, value?: any);
    static readonly fields: readonly ["key", "value"];
    get typename(): NodeTypeKey;
}
export declare class LookupVal extends Node {
    target?: any;
    val?: any;
    constructor(lineno: number, colno: number, target?: any, val?: any);
    static readonly fields: readonly ["target", "val"];
    get typename(): NodeTypeKey;
}
export declare class If extends Node {
    cond?: any;
    else_?: any;
    constructor(lineno: number, colno: number, cond?: any, body?: any, else_?: any);
    static readonly fields: readonly ["cond", "body", "else_"];
    get typename(): NodeTypeKey;
}
export declare class InlineIf extends Node {
    cond?: any;
    else_?: any;
    constructor(lineno: number, colno: number, cond?: any, body?: any, else_?: any);
    static readonly fields: readonly ["cond", "body", "else_"];
    get typename(): NodeTypeKey;
}
export declare class For extends Node {
    arr: any;
    name?: Symbol;
    else_?: any;
    static readonly fields: readonly ["arr", "name", "body", "else_"];
    constructor(lineno: number, colno: number, arr?: any, name?: Symbol, body?: any, else_?: any);
    get typename(): NodeTypeKey;
}
export declare class Macro extends Node {
    name?: Symbol;
    args?: any;
    constructor(lineno: number, colno: number, name?: Symbol, args?: any, body?: NodeList);
    static fields: string[];
    get typename(): NodeTypeKey;
}
export declare class Import extends Node {
    template?: any;
    target?: any;
    withContext?: any;
    static readonly fields: readonly ["template", "target", "withContext"];
    get typename(): NodeTypeKey;
    constructor(lineno: number, colno: number, template?: any, target?: any, withContext?: any);
}
export declare class Block extends Node {
    body?: any;
    name?: Node | Value;
    constructor(lineno: number, colno: number, body?: any, name?: Node | Value);
    static readonly fields: readonly ["name", "body"];
    get typename(): NodeTypeKey;
}
export declare class Super extends Node {
    blockName?: any;
    symbol?: Symbol;
    constructor(lineno: number, colno: number, blockName?: any, symbol?: Symbol);
    static readonly fields: readonly ["blockName", "symbol"];
    get typename(): NodeTypeKey;
}
export declare class TemplateRef extends Node {
    template?: any;
    constructor(lineno: number, colno: number, template?: any);
    static readonly fields: readonly ["template"];
    get typename(): NodeTypeKey;
}
export declare class FunCall extends Node {
    name?: Node;
    args?: any;
    constructor(lineno: number, colno: number, name?: Node, args?: any);
    static readonly fields: readonly ["name", "args"];
    get typename(): NodeTypeKey;
}
export declare class Include extends Node {
    template?: any[];
    ignoreMissing: boolean;
    constructor(lineno: number, colno: number, template?: any[], ignoreMissing?: boolean);
    static readonly fields: readonly ["template", "ignoreMissing"];
    get typename(): NodeTypeKey;
}
export declare class Set extends Node {
    targets: any;
    constructor(lineno: number, colno: number, targets?: any[], value?: any);
    static readonly fields: readonly ["targets", "value"];
    get typename(): NodeTypeKey;
}
export declare class Switch extends Node {
    expr?: any;
    cases?: any;
    _default?: any;
    constructor(lineno: number, colno: number, expr?: any, cases?: any, _default?: any);
    static readonly fields: readonly ["expr", "cases", "default"];
    get typename(): NodeTypeKey;
}
export declare class Case extends Node {
    cond?: any;
    constructor(lineno: number, colno: number, cond?: any, body?: any);
    static readonly fields: readonly ["cond", "body"];
    get typename(): NodeTypeKey;
}
export declare class Output extends Node {
    get typename(): NodeTypeKey;
    constructor(lineno: number, colno: number, args?: Node[]);
}
export declare class Capture extends Node {
    constructor(lineno: number, colno: number, body?: NodeList);
    static readonly fields: readonly ["body"];
    get typename(): NodeTypeKey;
}
export declare class UnaryOp extends Node {
    target?: any;
    constructor(lineno: number, colno: number, target?: any);
    static readonly fields: readonly ["target"];
    get typename(): NodeTypeKey;
}
export declare class BinOp extends Node {
    left?: any;
    right?: any;
    constructor(lineno: number, colno: number, left?: any, right?: any);
    static readonly fields: readonly ["left", "right"];
    get typename(): NodeTypeKey;
}
export declare class Compare extends Node {
    expr?: any;
    ops: any[];
    constructor(lineno: number, colno: number, expr?: any, ops?: any[]);
    static readonly fields: readonly ["expr", "ops"];
    get typename(): NodeTypeKey;
}
export declare class CompareOperand extends Node {
    expr?: any;
    type?: any;
    constructor(lineno: number, colno: number, expr?: any, type?: any);
    static readonly fields: readonly ["expr", "type"];
    get typename(): NodeTypeKey;
}
export declare class CallExtension extends Node {
    ext?: {
        __name: string;
        autoescape: any;
    } | string;
    prop?: any;
    args?: NodeList;
    contentArgs: any[];
    extname: string;
    autoescape: any;
    static readonly fields: readonly ["extname", "prop", "args", "contentArgs"];
    get typename(): NodeTypeKey;
    constructor(lineno: number, colno: number, ext?: {
        __name: string;
        autoescape: any;
    } | string, prop?: any, args?: NodeList, contentArgs?: any[]);
}
export declare class Value extends Node {
    value?: any;
    static readonly fields: readonly ["value"];
    get typename(): NodeTypeKey;
    constructor(lineno: number, colno: number, value?: any);
}
export declare class Literal extends Value {
    get typename(): NodeTypeKey;
}
export declare class Symbol extends Value {
    get typename(): NodeTypeKey;
}
export declare class NodeList extends Node {
    children: Node[];
    static readonly fields: readonly ["children"];
    get typename(): NodeTypeKey;
    constructor(lineno?: number, colno?: number, children?: Node[]);
    addChild(node: Node): void;
}
export declare class Root extends NodeList {
    get typename(): NodeTypeKey;
}
export declare class Group extends NodeList {
    get typename(): NodeTypeKey;
}
export declare class ArrayNode extends NodeList {
    get typename(): NodeTypeKey;
}
export declare class Dict extends NodeList {
    get typename(): NodeTypeKey;
}
export declare class IfAsync extends If {
    get typename(): NodeTypeKey;
}
export declare class AsyncEach extends For {
    get typename(): NodeTypeKey;
}
export declare class AsyncAll extends For {
    get typename(): NodeTypeKey;
}
export declare class Caller extends Macro {
    get typename(): NodeTypeKey;
}
export declare class Filter extends Macro {
    get typename(): NodeTypeKey;
}
export declare class FilterAsync extends Filter {
    name?: Symbol;
    args?: any;
    symbol?: Symbol;
    static readonly fields: readonly string[];
    constructor(lineno: number, colno: number, name?: Symbol, args?: any, symbol?: Symbol);
    get typename(): NodeTypeKey;
}
export declare class KeywordArgs extends Dict {
    constructor(lineno?: number, colno?: number);
    get typename(): NodeTypeKey;
}
export declare class Extends extends TemplateRef {
    get typename(): NodeTypeKey;
}
export declare class TemplateData extends Literal {
    get typename(): NodeTypeKey;
}
export declare class In extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Is extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Or extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class And extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Add extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Concat extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Sub extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Mul extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Div extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class FloorDiv extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Mod extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Pow extends BinOp {
    get typename(): NodeTypeKey;
}
export declare class Not extends UnaryOp {
    get typename(): NodeTypeKey;
}
export declare class Neg extends UnaryOp {
    get typename(): NodeTypeKey;
}
export declare class Pos extends UnaryOp {
    get typename(): NodeTypeKey;
}
export declare class CallExtensionAsync extends CallExtension {
    name: any;
    get typename(): NodeTypeKey;
}
export declare function printNodes(node: any, indent?: number): void;
declare const NodeTypes: {
    readonly Add: typeof Add;
    readonly And: typeof And;
    readonly Array: typeof ArrayNode;
    readonly AsyncEach: typeof AsyncEach;
    readonly AsyncAll: typeof AsyncAll;
    readonly BinOp: typeof BinOp;
    readonly Block: typeof Block;
    readonly Caller: typeof Caller;
    readonly CallExtension: typeof CallExtension;
    readonly CallExtensionAsync: typeof CallExtensionAsync;
    readonly Capture: typeof Capture;
    readonly Case: typeof Case;
    readonly Compare: typeof Compare;
    readonly CompareOperand: typeof CompareOperand;
    readonly Concat: typeof Concat;
    readonly Dict: typeof Dict;
    readonly Div: typeof Div;
    readonly Extends: typeof Extends;
    readonly Filter: typeof Filter;
    readonly FilterAsync: typeof FilterAsync;
    readonly FloorDiv: typeof FloorDiv;
    readonly For: typeof For;
    readonly FromImport: typeof FromImport;
    readonly FunCall: typeof FunCall;
    readonly Group: typeof Group;
    readonly If: typeof If;
    readonly IfAsync: typeof IfAsync;
    readonly Import: typeof Import;
    readonly In: typeof In;
    readonly Include: typeof Include;
    readonly InlineIf: typeof InlineIf;
    readonly Is: typeof Is;
    readonly KeywordArgs: typeof KeywordArgs;
    readonly Literal: typeof Literal;
    readonly LookupVal: typeof LookupVal;
    readonly Macro: typeof Macro;
    readonly Mod: typeof Mod;
    readonly Mul: typeof Mul;
    readonly Neg: typeof Neg;
    readonly NodeList: typeof NodeList;
    readonly Not: typeof Not;
    readonly Or: typeof Or;
    readonly Output: typeof Output;
    readonly Pair: typeof Pair;
    readonly Pos: typeof Pos;
    readonly Pow: typeof Pow;
    readonly Root: typeof Root;
    readonly Set: typeof Set;
    readonly Slice: typeof Slice;
    readonly Sub: typeof Sub;
    readonly Super: typeof Super;
    readonly Switch: typeof Switch;
    readonly Symbol: typeof Symbol;
    readonly TemplateData: typeof TemplateData;
    readonly Value: typeof Value;
};
export type NodeTypeKey = keyof typeof NodeTypes;
export type NodeTypeValue = (typeof NodeTypes)[NodeTypeKey];
export declare const NodeCreator: (key: NodeTypeKey) => typeof Slice | typeof Add | typeof ArrayNode | typeof AsyncEach | typeof Block | typeof Caller | typeof CallExtension | typeof Capture | typeof Case | typeof Compare | typeof CompareOperand | typeof FilterAsync | typeof FromImport | typeof FunCall | typeof If | typeof Import | typeof Include | typeof LookupVal | typeof Output | typeof Pair | typeof Set | typeof Super | typeof Switch;
export {};
