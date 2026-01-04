import { Callback } from './types';
export declare const escapeMap: {
    '&': string;
    '"': string;
    "'": string;
    '<': string;
    '>': string;
    '\\': string;
};
export type EscapeEntity = (typeof escapeMap)[EscapeChar];
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
    EscapeChar: EscapeChar;
    EscapeEntity: EscapeEntity;
    TypeOfChar: TypeOfChar;
    TemplateErr: TemplateErr;
    escape: (val: EscapeChar) => string;
    dump: (obj: Record<any, any>, spaces?: string | number) => string;
    isFunction: (obj: unknown) => boolean;
    isString: (obj: unknown) => boolean;
    isObject: (obj: unknown) => boolean;
}
export declare const escape: (val: string) => string;
export type EscapeChar = keyof typeof escapeMap;
export type TypeOfChar = keyof typeof typeOfItems;
export declare const dump: (obj: Record<any, any>, spaces?: string | number) => string;
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
export declare const isFunction: (obj: unknown) => obj is Function;
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
export declare function inOperator(key: string, val: any): boolean;
type Log = (...msg: any[]) => void;
export declare const p: {
    log: Log;
    warn: Log;
    debug: Log;
    err: Log;
    exit: Log;
};
export {};
