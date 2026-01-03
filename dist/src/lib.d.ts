import { Callback } from './types';
declare const escapeMap: {
    '&': string;
    '"': string;
    "'": string;
    '<': string;
    '>': string;
    '\\': string;
};
declare const typeOfItems: {
    undefined: string;
    object: string;
    boolean: string;
    number: string;
    bigint: string;
    string: string;
    symbol: string;
    function: string;
};
export interface ILib {
    ILib: ILib;
    EscapeChar: keyof typeof escapeMap;
    TypeOfChar: keyof typeof typeOfItems;
    TemplateErr: TemplateErr;
    escape: (val: EscapeChar) => string;
    dump: (obj: Record<any, any>, spaces?: string | number) => string;
    match: (filename: string, patterns: string[]) => boolean;
    isFunction: (obj: unknown) => boolean;
    isArray: (obj: unknown) => boolean;
    isString: (obj: unknown) => boolean;
    isObject: (obj: unknown) => boolean;
}
export declare const escape: (val: EscapeChar) => string;
export type EscapeChar = keyof typeof escapeMap;
export type TypeOfChar = keyof typeof typeOfItems;
export declare const callable: (value: any) => boolean;
export declare const defined: (value: any) => boolean;
export declare const dump: (obj: Record<any, any>, spaces?: string | number) => string;
export declare const match: (filename: string, patterns: string | string[]) => boolean;
export declare const hasOwnProp: (obj: Record<string | number, any>, key: string | number) => boolean;
export declare function _prettifyError(path: string, withInternals: boolean, err: TemplateErr): TemplateErr;
export type TemplateErr = Error & {
    name: string;
    lineno: number;
    colno: number;
    firstUpdate: boolean;
    cause?: Error;
    update: (path?: string) => TemplateErr;
};
export declare function TemplateError(message: string | Error, lineno?: number, colno?: number): TemplateErr;
export declare namespace TemplateError {
    var prototype: any;
}
export declare const isFunction: (obj: unknown) => obj is Function;
export declare const isArray: (obj: unknown) => obj is Array<any>;
export declare const isString: (obj: unknown) => obj is string;
export declare const isObject: (obj: unknown) => obj is object;
export declare const _prepareAttributeParts: (attr: string | number) => string[] | number[];
export declare function getAttrGetter(attribute: string): (obj: Object) => any;
export declare function groupBy(obj: Record<string | number, any>, val: Function | string, throwOnUndefined: boolean): Record<string, any>;
export declare function toArray(obj: any): any;
export declare function without<T>(array?: T[], ...contains: T[]): T[];
export declare const repeat: (char_: string, n: number) => string;
export declare function each(obj: any, func: Function, context: any): void;
export declare function asyncIter(arr: any, iter: Function, cb: Function): void;
export declare function asyncFor(obj: Record<string, any>, iter: Function, cb: Callback): void;
export declare const indexOf: (searchElement: any, fromIndex?: number) => number;
export declare const keys_: {
    (o: object): string[];
    (o: {}): string[];
};
export declare const _entries: {
    <T>(o: {
        [s: string]: T;
    } | ArrayLike<T>): [string, T][];
    (o: {}): [string, any][];
};
export declare const _values: {
    <T>(o: {
        [s: string]: T;
    } | ArrayLike<T>): T[];
    (o: {}): any[];
};
export declare function inOperator(key: string, val: any): boolean;
export {};
