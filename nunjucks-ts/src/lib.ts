const ArrayProto = Array.prototype;
const ObjProto = Object.prototype;

// ---- ESCAPE CHARACTERS ----
const escapeRegex = /[&"'<>\\]/g;

const escapeMap = {
	'&': '&amp;',
	'"': '&quot;',
	"'": '&#39;',
	'<': '&lt;',
	'>': '&gt;',
	'\\': '&#92;',
} as const;

type EscapeMap = typeof escapeMap;
type EscapeChar = keyof typeof escapeMap;
type EscapeEntity = (typeof escapeMap)[EscapeChar];

const lookupEscape = (ch: EscapeChar): EscapeEntity => escapeMap[ch];
export const escape = (val: string) => val.replace(escapeRegex, lookupEscape);

const supportsIterators =
	typeof Symbol === 'function' &&
	Symbol.iterator &&
	typeof Array.from === 'function';

// -- TODO: Doesn't seem to be useds
export const callable = (value: any) => typeof value === 'function';

export const defined = (value: any) => value !== undefined;

// -- END

export const match = (filename: string, patterns: any) =>
	Array.isArray(patterns) &&
	patterns.some((pattern) => filename.match(pattern));

export const hasOwnProp = (obj: Record<string, any>, k: any) =>
	ObjProto.hasOwnProperty.call(obj, k);

export function _prettifyError(path, withInternals, err) {
	if (!err.Update) {
		// not one of ours, cast it
		err = new exports.TemplateError(err);
	}
	err.Update(path);

	// Unless they marked the dev flag, show them a trace from here
	if (!withInternals) {
		const old = err;
		err = new Error(old.message);
		err.name = old.name;
	}

	return err;
}

export function TemplateError(message, lineno, colno) {
	var err;
	var cause;

	if (message instanceof Error) {
		cause = message;
		message = `${cause.name}: ${cause.message}`;
	}

	if (Object.setPrototypeOf) {
		err = new Error(message);
		Object.setPrototypeOf(err, TemplateError.prototype);
	} else {
		err = this;
		Object.defineProperty(err, 'message', {
			enumerable: false,
			writable: true,
			value: message,
		});
	}

	Object.defineProperty(err, 'name', {
		value: 'Template render error',
	});

	if (Error.captureStackTrace) {
		Error.captureStackTrace(err, this.constructor);
	}

	let getStack;

	if (cause) {
		const stackDescriptor = Object.getOwnPropertyDescriptor(cause, 'stack');
		getStack =
			stackDescriptor && (stackDescriptor.get || (() => stackDescriptor.value));
		if (!getStack) {
			getStack = () => cause.stack;
		}
	} else {
		const stack = new Error(message).stack;
		getStack = () => stack;
	}

	Object.defineProperty(err, 'stack', {
		get: () => getStack.call(err),
	});

	Object.defineProperty(err, 'cause', {
		value: cause,
	});

	err.lineno = lineno;
	err.colno = colno;
	err.firstUpdate = true;

	err.Update = function Update(path) {
		let msg = '(' + (path || 'unknown path') + ')';

		// only show lineno + colno next to path of template
		// where error occurred
		if (this.firstUpdate) {
			if (this.lineno && this.colno) {
				msg += ` [Line ${this.lineno}, Column ${this.colno}]`;
			} else if (this.lineno) {
				msg += ` [Line ${this.lineno}]`;
			}
		}

		msg += '\n ';
		if (this.firstUpdate) {
			msg += ' ';
		}

		this.message = msg + (this.message || '');
		this.firstUpdate = false;
		return this;
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

export const isFunction = (obj) =>
	ObjProto.toString.call(obj) === '[object Function]';

export const isArray = (obj) =>
	ObjProto.toString.call(obj) === '[object Array]';

export const isString = (obj) =>
	ObjProto.toString.call(obj) === '[object String]';

export const isObject = (obj) =>
	ObjProto.toString.call(obj) === '[object Object]';

/**
 * @param {string|number} attr
 * @returns {(string|number)[]}
 * @private
 */
export function _prepareAttributeParts(attr) {
	if (!attr) {
		return [];
	}

	if (typeof attr === 'string') {
		return attr.split('.');
	}

	return [attr];
}

/**
 * @param {string}   attribute      Attribute value. Dots allowed.
 * @returns {function(Object): *}
 */
export function getAttrGetter(attribute) {
	const parts = _prepareAttributeParts(attribute);

	return function attrGetter(item) {
		let _item = item;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];

			// If item is not an object, and we still got parts to handle, it means
			// that something goes wrong. Just roll out to undefined in that case.
			if (hasOwnProp(_item, part)) {
				_item = _item[part];
			} else {
				return undefined;
			}
		}

		return _item;
	};
}

export function groupBy(obj, val, throwOnUndefined) {
	const result = {};
	const iterator = isFunction(val) ? val : getAttrGetter(val);
	for (let i = 0; i < obj.length; i++) {
		const value = obj[i];
		const key = iterator(value, i);
		if (key === undefined && throwOnUndefined === true) {
			throw new TypeError(`groupby: attribute "${val}" resolved to undefined`);
		}
		(result[key] || (result[key] = [])).push(value);
	}
	return result;
}

export function toArray(obj) {
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

function each(obj, func, context) {
	if (obj == null) {
		return;
	}

	if (ArrayProto.forEach && obj.forEach === ArrayProto.forEach) {
		obj.forEach(func, context);
	} else if (obj.length === +obj.length) {
		for (let i = 0, l = obj.length; i < l; i++) {
			func.call(context, obj[i], i, obj);
		}
	}
}

exports.each = each;
export const map = ArrayProto.map;

function asyncIter(arr, iter, cb) {
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

exports.asyncIter = asyncIter;

export function asyncFor(obj: Record<string, any>, iter, cb) {
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

export const indexOf = ArrayProto.indexOf;
export const keys_ = Object.keys;
export const _entries = Object.entries;
export const _values = Object.values;

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
