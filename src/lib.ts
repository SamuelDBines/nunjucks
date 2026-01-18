//Done: Sun 4th Jan 2026 
import { Callback } from './types';
import { TemplateError } from 'template';

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
	isFunction: (obj: unknown) => boolean;
	isString: (obj: unknown) => boolean;
	isObject: (obj: unknown) => boolean;
}
export const escape = (val: string) =>
	val?.replace(escapeRegex, (ch) => escapeMap[ch]);

export type EscapeChar = keyof typeof escapeMap;
export type TypeOfChar = keyof typeof typeOfItems;

export const dump = (obj: Record<any, any>, spaces?: string | number) =>
	JSON.stringify(obj, null, spaces);

export const hasOwnProp = (
	obj: Record<string | number, any>,
	key: string | number
) => (key ? key in obj : false);

export type TemplateErr = Error & {
	name: string;
	lineno: number;
	colno: number;
	firstUpdate: boolean;
	cause?: Error;
	update: (path?: string) => TemplateErr;
};


export const isFunction = (obj: unknown): obj is Function =>
	typeof obj === typeOfItems.function;

export const isString = (obj: unknown): obj is string =>
	typeof obj === typeOfItems.string;

export const isObject = (obj: unknown): obj is object =>
	Object.prototype.toString.call(obj) === '[object Object]';

export const _prepareAttributeParts = (
	attr: string | number
): string[] | number[] => (typeof attr === 'string' ? attr.split('.') : [attr]);

export function getAttrGetter(attribute: string): (obj: Object) => any {
	const parts = _prepareAttributeParts(attribute);

	return function (item: object) {
		let _item: any = item; //TODO fix any

		for (let i = 0; i < parts?.length; i++) {
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
	for (let i = 0; i < obj?.length; i++) {
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
	return Array.prototype.slice.call(obj);
}

export function without<T>(array: T[] = [], ...contains: T[]) {
	const result: T[] = [];
	for (const item of array) {
		if (!contains.includes(item)) result?.push(item);
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

	if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
		obj.forEach(func, context);
	} else if (obj?.length === +obj?.length) {
		for (let i = 0, l = obj?.length; i < l; i++) {
			func.call(context, obj[i], i, obj);
		}
	}
}

export function asyncFor(
	obj: Record<string, any>,
	iter: Function,
	cb: Callback
) {
	const keys = Object.keys(obj || {});
	const len = keys?.length;
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



// Export this to its own awesome logger function

const RESET: string = '\x1b[0m';
const WARN: string = '\x1b[33m';
const ERR: string = '\x1b[31m';
const HEADER = '\x1b[95m';
const OKBLUE = '\x1b[94m';
const OKCYAN = '\x1b[96m';
const OKGREEN = '\x1b[92m';
const WARNING = '\x1b[93m';
const FAIL = '\x1b[91m';
const ENDC = '\x1b[0m';
const BOLD = '\x1b[1m';
const UNDERLINE = '\x1b[4m';

const isObjectOrArray = (msg: unknown, space = '') => {
	const parts = Array.isArray(msg) ? msg : [msg];

	return parts
		.map((i) => {
			if (typeof i === 'string') return i;
			if (
				typeof i === 'number' ||
				typeof i === 'bigint' ||
				typeof i === 'boolean'
			)
				return String(i);
			if (i instanceof Error) return i.stack ?? i.message;

			if (i && typeof i === 'object') {
				try {
					return JSON.stringify(i);
				} catch {
					return '[Unserializable object]';
				}
			}

			return String(i); // undefined, null, symbol, function, etc
		})
		.join(space);
};

type Log = (...msg: any[]) => void;


export const p: {
	log: Log;
	llog: Log;
	warn: Log;
	lwarn: Log;
	debug: Log;
	ldebug: Log;
	err: Log;
	lerr: Log;
	error: Log;
	lerror: Log;
	exit: Log;
} = {
	log: (...msg: any[]) =>
		process.stdout.write(`[INFO] ${isObjectOrArray(msg)}\n`),
	llog: (...msg: any[]) =>
		process.stdout.write(`[INFO] ${isObjectOrArray(msg, '\n')}\n`),
	debug: (...msg: any[]) =>
		process.stdout.write(`${OKBLUE}[DEBUG] ${isObjectOrArray(msg)}${RESET}\n`),
	ldebug: (...msg: any[]) =>
		process.stdout.write(`${OKBLUE}[DEBUG] ${isObjectOrArray(msg, '\n')}${RESET}\n`),
	warn: (...msg: any[]) =>
		process.stdout.write(`${WARN}[WARN] ${isObjectOrArray(msg)}${RESET}\n`),
	lwarn: (...msg: any[]) =>
		process.stdout.write(`${WARN}[WARN] ${isObjectOrArray(msg, '\n')}${RESET}\n`),
	err: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg)}${RESET}\n`),
	error: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg)}${RESET}\n`),
	lerr: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg, '\n')}${RESET}\n`),
	lerror: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg, '\n')}${RESET}\n`),
	exit: (...msg: any[]) => {
		process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg)}${RESET}\n`);
		process.exit(1);
	},
};
