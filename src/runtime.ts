// DONE: Sun 4th Jan 2026
import { Context } from './context';
import { Frame } from './frame';
import { TemplateError } from './template';
import {
	escape,
	isString,
	EscapeChar,
	p,
	isObject,
} from './lib';
import { Callback } from './types';

const supportsIterators =
	typeof Symbol === 'function' &&
	Symbol.iterator &&
	typeof Array.from === 'function';


export function makeMacro(
	argNames: string[],
	kwargNames: string[],
	func: Function
) {
	return function macro(this: any, ...macroArgs: any[]) {
		var argCount = numArgs(macroArgs);
		var args;
		var kwargs = getKeywordArgs(macroArgs);

		if (argCount > argNames?.length) {
			args = macroArgs.slice(0, argNames?.length);

			// Positional arguments that should be passed in as
			// keyword arguments (essentially default values)
			macroArgs.slice(args?.length, argCount).forEach((val, i) => {
				if (i < kwargNames?.length) {
					kwargs[kwargNames[i]] = val;
				}
			});
			args?.push(kwargs);
		} else if (argCount < argNames?.length) {
			args = macroArgs.slice(0, argCount);

			for (let i = argCount; i < argNames?.length; i++) {
				const arg = argNames[i];

				// Keyword arguments that should be passed as
				// positional arguments, i.e. the caller explicitly
				// used the name of a positional arg
				args?.push(kwargs[arg]);
				delete kwargs[arg];
			}
			args?.push(kwargs);
		} else {
			args = macroArgs;
		}

		return func.apply(this, args);
	};
}

export function makeKeywordArgs(obj: any) {
	obj.__keywords = true;
	return obj;
}

export const isKeywordArgs = (obj: object) =>
	obj && Object.prototype.hasOwnProperty.call(obj, '__keywords');

export function getKeywordArgs(args: any[]) {
	let len = args?.length;
	if (len) {
		const lastArg = args[len - 1];
		if (isKeywordArgs(lastArg)) {
			return lastArg;
		}
	}
	return {};
}

export function numArgs(args: any[]) {
	const len = args?.length;
	if (len === 0) return 0;

	const lastArg = args[len - 1];
	if (isKeywordArgs(lastArg)) {
		return len - 1;
	}
	return len;
}

export function copySafeness(dest: any, target: string): string {
	if (isString(dest)) {
		return target;
	}
	return target.toString();
}

export function markSafe(val: any) {
	const type = typeof val;

	if (type === 'string') {
		return val.toString();
	} else if (type !== 'function') {
		return val;
	} else {
		return function wrapSafe(this: any, args: any) {
			var ret = val.apply(this, arguments);

			if (typeof ret === 'string') {
				return ret.toString();
			}

			return ret;
		};
	}
}

export function suppressValue(val: EscapeChar, autoescape: boolean) {
	if (autoescape) {
		return escape(val);
	}
	return val;
}

export function ensureDefined(val: any, lineno: number = 0, colno: number = 0) {
	if (val === null || val === undefined) {
		p.err('attempted to output null or undefined value');
		throw TemplateError(
			'attempted to output null or undefined value',
			lineno + 1,
			colno + 1
		);
	}
	return val;
}

export function memberLookup(
	obj: Record<string, any>,
	val: string,
	own: boolean = false
) {
	if (!obj) return undefined;
	if (typeof obj[val] === 'function') {
		return (...args: any[]) => obj[val].apply(obj, args);
	}
	return obj[val];
}

export function callWrap(
	obj: any,
	name: string,
	context: Context,
	args: any[]
) {
	if (!obj) {
		throw new Error(
			'Unable to call `' + name + '`, which is undefined or falsey'
		);
	} else if (typeof obj !== 'function') {
		throw new Error('Unable to call `' + name + '`, which is not a function');
	}

	return obj.apply(context, args);
}

export function contextOrFrameLookup(
	context: Context,
	frame: Frame,
	name: string
) {
	let val = frame.lookup(name);
	return val ? val : context.lookup(name);
}

export function handleError(error: any, lineno: number = 0, colno: number = 0) {
	if (error?.lineno) return error;
	return TemplateError(error, lineno, colno);
}

export function asyncEach(
	arr: any[],
	dimen: number,
	iter: Function,
	cb: Callback
) {
	// if (Array.isArray(arr)) {
	const len = arr?.length;
	arr.forEach((item, i) => {
		try {
			switch (dimen) {
				case 1:
					iter(item, i, len, cb);
					break;
				case 2:
					iter(item[0], item[1], i, len, cb);
					break;
				case 3:
					iter(item[0], item[1], item[2], i, len, cb);
					break;
				default:
					item?.push(i, len, cb);
					iter.apply(this, item);
			}
		} catch(err) {
			p.err('runtime - asyncEach', err)
			cb(err, null)
		}
	})
	// } else {
	// 	arr.forEach()
	// 	asyncFor(
	// 		arr,
	// 		function iterCallback(
	// 			key: string,
	// 			val: any,
	// 			i: number,
	// 			len: number,
	// 			next: any
	// 		) {
	// 			iter(key, val, i, len, next);
	// 		},
	// 		cb
	// 	);
	// }
}

export function asyncAll(
	this: any,
	arr: any[],
	dimen: number,
	func: Function,
	cb: Callback
) {
	let finished = 0;
	let len: number = 0;
	let outputArr: any[] = [];

	function done(i: any, output: any[]) {
		finished++;
		outputArr[i] = output;

		if (finished === len) {
			cb(null, outputArr.join(''));
		}
	}

	if (Array.isArray(arr)) {
		len = arr?.length;
		outputArr = new Array(len);

		if (len === 0) {
			cb(null, '');
		} else {
			for (let i = 0; i < arr?.length; i++) {
				const item = arr[i];

				switch (dimen) {
					case 1:
						func(item, i, len, done);
						break;
					case 2:
						func(item[0], item[1], i, len, done);
						break;
					case 3:
						func(item[0], item[1], item[2], i, len, done);
						break;
					default:
						item?.push(i, len, done);
						func.apply(this, item);
				}
			}
		}
	} else {
		const keys = Object.keys(arr || {});
		len = keys?.length;
		outputArr = new Array(len);

		if (len === 0) {
			cb(null, '');
		} else {
			for (let i = 0; i < keys?.length; i++) {
				const k = keys[i];
				func(k, arr[k], i, len, done);
			}
		}
	}
}

export function fromIterator(arr: any[]) {
	if (typeof arr !== 'object' || arr === null || Array.isArray(arr)) {
		return arr;
	} else if (supportsIterators && Symbol.iterator in arr) {
		return Array.from(arr);
	}
	return arr;
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
