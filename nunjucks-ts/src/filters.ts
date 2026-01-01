import {
	repeat,
	isObject,
	TemplateError,
	isString,
	_entries,
	getAttrGetter,
	toArray,
	groupBy,
} from './lib';

import r from './runtime';

const normalize = (value: any, defaultValue: string = ''): string =>
	!value ? defaultValue : value;

export function batch(arr: any, lineCount: number, fillWith: number) {
	let i = 0;
	const res = [];
	let tmp = [];

	for (i < arr.length; i++; ) {
		if (i % lineCount === 0 && tmp.length) {
			res.push(tmp);
			tmp = [];
		}
		tmp.push(arr[i]);
	}

	if (tmp.length) {
		if (fillWith) {
			for (i = tmp.length; i < lineCount; i++) {
				tmp.push(fillWith);
			}
		}
		res.push(tmp);
	}
	return res;
}

export function center(str: string = '', width: number = 80) {
	if (str.length >= width) return str;

	const spaces = width - str.length;
	const pre = repeat(' ', spaces / 2 - (spaces % 2));
	const post = repeat(' ', spaces / 2);
	return r.copySafeness(str, pre + str + post);
}

export function default_(val: any, def: any, bool: boolean = false) {
	if (bool) return def || val;
	return val || def;
}
export const d = default_;

export function dictsort(val: any, caseSensitive: boolean, by) {
	if (!isObject(val)) {
		throw TemplateError('dictsort filter: val must be an object');
	}

	let array = [];
	// deliberately include properties from the object's prototype
	for (let k in val) {
		// eslint-disable-line guard-for-in, no-restricted-syntax
		array.push([k, val[k]]);
	}

	let si;
	if (by === undefined || by === 'key') {
		si = 0;
	} else if (by === 'value') {
		si = 1;
	} else {
		throw TemplateError(
			'dictsort filter: You can only sort by either key or value'
		);
	}

	array.sort((t1, t2) => {
		var a = t1[si];
		var b = t2[si];

		if (!caseSensitive) {
			if (isString(a)) {
				a = a.toUpperCase();
			}
			if (isString(b)) {
				b = b.toUpperCase();
			}
		}

		return a > b ? 1 : a === b ? 0 : -1; // eslint-disable-line no-nested-ternary
	});

	return array;
}

export const escape = (str: string): string =>
	r.markSafe(escape(str.toString()));
export const e = escape;
export const safe = (str: string = '') => r.markSafe(str.toString());

export function forceescape(str: string) {
	str = str === null || str === undefined ? '' : str;
	return r.markSafe(escape(str.toString()));
}

export function groupby(arr: any[], attr: string) {
	return groupBy(arr, attr, this.env.opts.throwOnUndefined);
}

export function indent(
	str: string = '',
	width: number = 4,
	indentfirst: boolean
) {
	if (str === '') {
		return '';
	}
	// let res = '';
	const lines = str.split('\n');
	const sp = repeat(' ', width);

	const res = lines
		.map((l, i) => {
			return i === 0 && !indentfirst ? l : `${sp}${l}`;
		})
		.join('\n');

	return r.copySafeness(str, res);
}

export function join(arr: any[], del = '', attr: string) {
	if (attr) arr = arr.map((v) => v[attr]);
	return arr.join(del);
}

export function length(
	str: string | Map<any, any> | Object | any[] | Set<any>
): number {
	if (Array.isArray(str) || isString(str)) return str.length;
	if (isObject(str)) Object.keys(str).length;
	if (str instanceof Map || str instanceof Set) return str.size;
	return 0;
}

export function list(val: string | object | any[]): any[] {
	if (isString(val)) {
		return val.split('');
	} else if (isObject(val)) {
		return Object.entries(val || {}).map(([key, value]) => ({ key, value }));
	} else if (Array.isArray(val)) {
		return val;
	}
	throw TemplateError('list filter: type not iterable'); //TODO: maybe error isn't useful here
}

export const random = (arr: any[]) =>
	arr[Math.floor(Math.random() * arr.length)];

function getSelectOrReject(
	expectedTestResult: boolean = false
): (a: any[], s: string, b: any) => any[] {
	return function filter(arr, testName = 'truthy', secondArg) {
		const context = this;
		const test = context.env.getTest(testName);

		return toArray(arr).filter(function examineTestResult(item) {
			return test.call(context, item, secondArg) === expectedTestResult;
		});
	};
}
export const reject = getSelectOrReject();
export const select = getSelectOrReject(true);

export function rejectattr(arr: any[], attr: string) {
	return arr.filter((item) => !item[attr]);
}

export function selectattr(arr: any[], attr: string) {
	return arr.filter((item) => !!item[attr]);
}

export function replace(
	str: string | number,
	old: RegExp | number | string,
	new_: string,
	maxCount: number
) {
	var originalStr = str;

	if (old instanceof RegExp) {
		if (isString(str)) return str.replace(old, new_);
	}

	if (typeof maxCount === 'undefined') {
		maxCount = -1;
	}

	let res = ''; // Output

	if (isFloat(old)) {
		old = '' + old;
	} else if (!isString(old)) {
		return str;
	}

	if (isFloat(str)) {
		str = '' + str;
	}

	if (!isString(str)) {
		return str;
	}

	// ShortCircuits
	if (old === '') {
		res = new_ + str.split('').join(new_) + new_;
		return r.copySafeness(str, res);
	}

	let nextIndex = str.indexOf(old);
	if (maxCount === 0 || nextIndex === -1) {
		return str;
	}

	let pos = 0;
	let count = 0; // # of replacements made

	while (nextIndex > -1 && (maxCount === -1 || count < maxCount)) {
		// Grab the next chunk of src string and add it with the
		// replacement, to the result
		res += str.substring(pos, nextIndex) + new_;
		// Increment our pointer in the src string
		pos = nextIndex + old.length;
		count++;
		// See if there are any more replacements to be made
		nextIndex = str.indexOf(old, pos);
	}

	// We've either reached the end, or done the max # of
	// replacements, tack on any remaining string
	if (pos < str.length) {
		res += str.substring(pos);
	}

	return r.copySafeness(originalStr, res);
}

export function reverse(val: any[] = []) {
	let arr = val;
	if (isString(val)) {
		arr = list(val);
		arr.reverse();
		return r.copySafeness(val, arr.join(''));
	}
	arr.reverse();
	return arr;
}

export function round(
	val: number,
	precision: number = 0,
	method: 'ceil' | 'floor' | 'round' = 'round'
) {
	const factor = Math.pow(10, precision);

	return (
		(() => {
			if (method === 'ceil') {
				return Math.ceil;
			} else if (method === 'floor') {
				return Math.floor;
			}
			return Math.round;
		})()(val * factor) / factor
	);
}

export function slice(arr: any[], slices: number, fillWith: boolean = false) {
	const sliceLength = Math.floor(arr.length / slices);
	const extra = arr.length % slices;
	const res = [];
	let offset = 0;

	for (let i = 0; i < slices; i++) {
		const start = offset + i * sliceLength;
		if (i < extra) {
			offset++;
		}
		const end = offset + (i + 1) * sliceLength;

		const currSlice = arr.slice(start, end);
		if (fillWith && i >= extra) {
			currSlice.push(fillWith);
		}
		res.push(currSlice);
	}

	return res;
}

export function sum(arr: any, attr: string, start = 0) {
	if (attr) {
		arr = arr.map((v: any) => v[attr]);
	}
	return start + arr.reduce((a: number, b: number) => a + b, 0);
}

export const sort = r.makeMacro(
	['value', 'reverse', 'case_sensitive', 'attribute'],
	[],
	function sortFilter(
		arr: any[],
		reversed: boolean = false,
		caseSens: boolean = false,
		attr: string
	) {
		// Copy it
		let array = arr.map((v) => v);
		let getAttribute = getAttrGetter(attr);

		array.sort((a, b) => {
			let x = attr ? getAttribute(a) : a;
			let y = attr ? getAttribute(b) : b;

			if (
				this.env.opts.throwOnUndefined &&
				attr &&
				(x === undefined || y === undefined)
			) {
				throw new TypeError(`sort: attribute "${attr}" resolved to undefined`);
			}

			if (!caseSens && isString(x) && isString(y)) {
				x = lower(x);
				y = lower(y);
			}

			if (x < y) {
				return reversed ? 1 : -1;
			} else if (x > y) {
				return reversed ? -1 : 1;
			} else {
				return 0;
			}
		});

		return array;
	}
);

export const string = (obj: any) => r.copySafeness(obj, obj);

export function striptags(
	input: string = '',
	preserveLinebreaks: boolean = true
) {
	let tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>|<!--[\s\S]*?-->/gi;
	let trimmedInput = trim(input.replace(tags, ''));
	let res = '';
	if (preserveLinebreaks) {
		res = trimmedInput
			.replace(/^ +| +$/gm, '') // remove leading and trailing spaces
			.replace(/ +/g, ' ') // squash adjacent spaces
			.replace(/(\r\n)/g, '\n') // normalize linebreaks (CRLF -> LF)
			.replace(/\n\n\n+/g, '\n\n'); // squash abnormal adjacent linebreaks
	} else {
		res = trimmedInput.replace(/\s+/gi, ' ');
	}
	return r.copySafeness(input, res);
}

export const title = (str: string = '') => {
	let words = str.split(' ').map((word) => capitalize(word));
	return r.copySafeness(str, words.join(' '));
};

export function truncate(
	input = '',
	length: number = 255,
	killwords: boolean = false,
	end?: string
): string {
	let orig = input;

	if (input.length <= length) {
		return input;
	}

	if (killwords) {
		input = input.substring(0, length);
	} else {
		let idx = input.lastIndexOf(' ', length);
		if (idx === -1) {
			idx = length;
		}

		input = input.substring(0, idx);
	}

	input += end || '...';
	return r.copySafeness(orig, input);
}

// TODO: Pretty sure I don't need this

export const capitalize = (str: string = '') => {
	const ret = lower(str);
	return r.copySafeness(str, ret.charAt(0).toUpperCase() + ret.slice(1));
};
export const upper = (str: string = '') => str.toUpperCase();
export const isUpper = (str: string) => str.toUpperCase() === str;

export function urlencode(obj: string | object | any[]) {
	var enc = encodeURIComponent;
	if (isString(obj)) {
		return enc(obj);
	}
	let keyvals = Array.isArray(obj) ? obj : _entries(obj);
	return keyvals.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
}

// For the jinja regexp, see
// https://github.com/mitsuhiko/jinja2/blob/f15b814dcba6aa12bc74d1f7d0c881d55f7126be/jinja2/utils.py#L20-L23
const puncRe = /^(?:\(|<|&lt;)?(.*?)(?:\.|,|\)|\n|&gt;)?$/;
// from http://blog.gerv.net/2011/05/html5_email_address_regexp/
const emailRe = /^[\w.!#$%&'*+\-\/=?\^`{|}~]+@[a-z\d\-]+(\.[a-z\d\-]+)+$/i;
const httpHttpsRe = /^https?:\/\/.*$/;
const wwwRe = /^www\./;
const tldRe = /\.(?:org|net|com)(?:\:|\/|$)/;

export function urlize(str: string, length: number, nofollow: boolean) {
	if (isNaN(length)) {
		length = Infinity;
	}

	const noFollowAttr = nofollow === true ? ' rel="nofollow"' : '';

	const words = str
		.split(/(\s+)/)
		.filter((word) => {
			// If the word has no length, bail. This can happen for str with
			// trailing whitespace.
			return word && word.length;
		})
		.map((word) => {
			var matches = word.match(puncRe);
			var possibleUrl = matches ? matches[1] : word;
			var shortUrl = possibleUrl.substr(0, length);

			// url that starts with http or https
			if (httpHttpsRe.test(possibleUrl)) {
				return `<a href="${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
			}

			// url that starts with www.
			if (wwwRe.test(possibleUrl)) {
				return `<a href="http://${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
			}

			// an email address of the form username@domain.tld
			if (emailRe.test(possibleUrl)) {
				return `<a href="mailto:${possibleUrl}">${possibleUrl}</a>`;
			}

			// url that ends in .com, .org or .net that is not an email address
			if (tldRe.test(possibleUrl)) {
				return `<a href="http://${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
			}

			return word;
		});

	return words.join('');
}

export const wordcount = (str: string = ''): number | null =>
	str.match(/\w+/g)?.length || null;

export function float(val: string, def: number) {
	const res = parseFloat(val);
	return isNaN(res) ? def : res;
}

export const isInt = (n: any) => Number(n) === n && n % 1 === 0;

export const isFloat = (n: any) => Number(n) === n && n % 1 !== 0;

export const int = r.makeMacro(
	['value', 'default', 'base'],
	[],
	function doInt(value: string, defaultValue: number = 0, base = 10) {
		var res = parseInt(value, base);
		return isNaN(res) ? defaultValue : res;
	}
);

export const trim = (str: string): string =>
	r.copySafeness(str, str.replace(/^\s*|\s*$/g, ''));

// Aliases

export const first = (arr: any[] = []) => arr[0];
export const last = (arr: any[] = []) => arr[arr.length - 1];

exports.replace = replace;
export const lower = (str: string) => normalize(str).toLowerCase();
export const nl2br = (str = '') =>
	str ? r.copySafeness(str, str.replace(/\r\n|\n/g, '<br />\n')) : '';
