import { Callback } from './types';

// --- PRIVATE ---
const ArrayProto = Array.prototype;
const ObjProto = Object.prototype;

// ---- ESCAPE CHARACTERS ----
const escapeRegex = /[&"'<>\\]/g;

export const escapeMap = {
	'&': '&amp;',
	'"': '&quot;',
	"'": '&#39;',
	'<': '&lt;',
	'>': '&gt;',
	'\\': '&#92;',
};

// type EscapeMap = typeof escapeMap;
export type EscapeEntity = (typeof escapeMap)[EscapeChar];

const typeOfItems = {
	undefined: 'undefined',
	object: 'object',
	boolean: 'boolean',
	number: 'number',
	bigint: 'bigint',
	string: 'string',
	symbol: 'symbol',
	function: 'function',
};

export interface ILib {
	ILib: ILib;
	EscapeChar: EscapeChar;
	EscapeEntity: EscapeEntity;
	TypeOfChar: TypeOfChar;
	TemplateErr: TemplateErr;
	escape: (val: EscapeChar) => string;
	dump: (obj: Record<any, any>, spaces?: string | number) => string;
	match: (filename: string, patterns: string[]) => boolean;
	isFunction: (obj: unknown) => boolean;
	isString: (obj: unknown) => boolean;
	isObject: (obj: unknown) => boolean;
}
export const escape = (val: string) =>
	val.replace(escapeRegex, (ch) => escapeMap[ch]);

export type EscapeChar = keyof typeof escapeMap;
export type TypeOfChar = keyof typeof typeOfItems;

export const callable = (value: any) => typeof value === 'function';

export const defined = (value: any) => value !== undefined;

export const dump = (obj: Record<any, any>, spaces?: string | number) =>
	JSON.stringify(obj, null, spaces);

export const match = (filename: string, patterns: string[]) =>
	Array.isArray(patterns) &&
	patterns.some((pattern) => filename.match(pattern));

export const hasOwnProp = (
	obj: Record<string | number, any>,
	key: string | number
) => key in obj;

export function _prettifyError(
	path: string,
	withInternals: boolean,
	err: TemplateErr
) {
	if (!err.update) {
		err = TemplateError(err);
	}
	err.update(path);
	if (!withInternals) {
		const old = err;
		err.name = old.name;
	}

	return err;
}

export type TemplateErr = Error & {
	name: string;
	lineno: number;
	colno: number;
	firstUpdate: boolean;
	cause?: Error;
	update: (path?: string) => TemplateErr;
};

export function TemplateError(
	message: string | Error,
	lineno: number = 0,
	colno: number = 0
): TemplateErr {
	const cause = message instanceof Error ? message : undefined;
	const msg = cause ? `${cause.name}: ${cause.message}` : String(message ?? '');
	const err = new Error(msg, cause ? { cause } : undefined) as TemplateErr;
	err.name = 'Template render error';
	err.lineno = lineno;
	err.colno = colno;
	err.firstUpdate = true;

	if (cause?.stack) {
		Object.defineProperty(err, 'stack', {
			configurable: true,
			get() {
				return cause.stack;
			},
		});
	}
	err.update = (path?: string) => {
		let prefix = `(${path || 'unknown path'})`;

		if (err.firstUpdate) {
			if (err.lineno && err.colno)
				prefix += ` [Line ${err.lineno}, Column ${err.colno}]`;
			else if (err.lineno) prefix += ` [Line ${err.lineno}]`;
		}

		prefix += '\n  '; // newline + indentation
		err.message = prefix + (err.message || '');
		err.firstUpdate = false;
		return err;
	};
	return err;
}

if (Object.setPrototypeOf) {
	Object.setPrototypeOf(TemplateError.prototype, Error.prototype);
} else {
	TemplateError.prototype = Object.create(Error.prototype, {
		constructor: {
			value: TemplateError,
		},
	});
}

export const isFunction = (obj: unknown): obj is Function =>
	typeof obj === typeOfItems.function;

export const isString = (obj: unknown): obj is string =>
	typeof obj === typeOfItems.string;

export const isObject = (obj: unknown): obj is object =>
	ObjProto.toString.call(obj) === '[object Object]';

export const _prepareAttributeParts = (
	attr: string | number
): string[] | number[] => (typeof attr === 'string' ? attr.split('.') : [attr]);

export function getAttrGetter(attribute: string): (obj: Object) => any {
	const parts = _prepareAttributeParts(attribute);

	return function (item: object) {
		let _item: any = item; //TODO fix any

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];

			// If item is not an object, and we still got parts to handle, it means
			// that something goes wrong. Just roll out to undefined in that case.

			if (part in _item) {
				_item = _item[part]; // TODO: FIX THIS
			} else {
				return undefined;
			}
		}

		return _item;
	};
}

export function groupBy(
	obj: Record<string | number, any>,
	val: Function | string,
	throwOnUndefined: boolean
) {
	const result: Record<string, any> = {};
	const iterator = isFunction(val) ? val : getAttrGetter(val);
	for (let i = 0; i < obj.length; i++) {
		const value = obj[i];
		const key = iterator(value, i);
		if (key === undefined && throwOnUndefined) {
			throw new TypeError(`groupby: attribute "${val}" resolved to undefined`);
		}
		if (!result[key]) {
			result[key] = [];
		}
		result[key]?.push(value);
	}
	return result;
}

export function toArray(obj: any) {
	return ArrayProto.slice.call(obj);
}

export function without<T>(array: T[] = [], ...contains: T[]) {
	const result: T[] = [];
	for (const item of array) {
		if (!contains.includes(item)) result.push(item);
	}
	return result;
}

export const repeat = (char_: string, n: number) => {
	let str: string = '';
	for (let i = 0; i < n; i++) {
		str += char_;
	}
	return str;
};

export function each(obj: any, func: Function, context: any) {
	if (!obj) return;

	if (ArrayProto.forEach && obj.forEach === ArrayProto.forEach) {
		obj.forEach(func, context);
	} else if (obj.length === +obj.length) {
		for (let i = 0, l = obj.length; i < l; i++) {
			func.call(context, obj[i], i, obj);
		}
	}
}

export function asyncIter(arr: any, iter: Function, cb: Function) {
	let i = -1;

	function next() {
		i++;

		if (i < arr.length) {
			iter(arr[i], i, next, cb);
		} else {
			cb();
		}
	}

	next();
}

export function asyncFor(
	obj: Record<string, any>,
	iter: Function,
	cb: Callback
) {
	const keys = Object.keys(obj || {});
	const len = keys.length;
	let i = -1;

	function next() {
		i++;
		const k = keys[i];

		if (i < len) {
			iter(k, obj[k], i, len, next);
		} else {
			cb();
		}
	}

	next();
}

export function inOperator(key: string, val: any) {
	if (Array.isArray(val) || isString(val)) {
		return val.indexOf(key) !== -1;
	} else if (isObject(val)) {
		return key in val;
	}
	throw new Error(
		'Cannot use "in" operator to search for "' + key + '" in unexpected types.'
	);
}
