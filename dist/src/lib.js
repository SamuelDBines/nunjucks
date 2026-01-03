// --- PRIVATE ---
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
};
// type EscapeMap = typeof escapeMap;
// type EscapeEntity = (typeof escapeMap)[EscapeChar];
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
export const escape = (val) => val.replace(escapeRegex, escapeMap[val]);
// -- TODO: Doesn't seem to be useds
export const callable = (value) => typeof value === 'function';
export const defined = (value) => value !== undefined;
// -- END
export const dump = (obj, spaces) => JSON.stringify(obj, null, spaces);
// function waterfall(tasks, done) {
//   tasks.reduce(
//     (p, task, i) =>
//       p.then((res) =>
//         new Promise((resolve, reject) => {
//           if (i === 0) task((err, out) => (err ? reject(err) : resolve(out)));
//           else task(res, (err, out) => (err ? reject(err) : resolve(out)));
//         })
//       ),
//     Promise.resolve(undefined)
//   )
//   .then((res) => done(null, res))
//   .catch((err) => done(err));
// }
export const match = (filename, patterns) => Array.isArray(patterns) &&
    patterns.some((pattern) => filename.match(pattern));
export const hasOwnProp = (obj, key) => key in obj;
export function _prettifyError(path, withInternals, err) {
    if (!err.update) {
        err = TemplateError(err);
    }
    err.update(path);
    // Unless they marked the dev flag, show them a trace from here
    if (!withInternals) {
        const old = err;
        // err = new Error(old.message);
        err.name = old.name;
    }
    return err;
}
export function TemplateError(message, lineno = 0, colno = 0) {
    const cause = message instanceof Error ? message : undefined;
    const msg = cause ? `${cause.name}: ${cause.message}` : String(message ?? '');
    const err = new Error(msg, cause ? { cause } : undefined);
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
    err.update = (path) => {
        let prefix = `(${path || 'unknown path'})`;
        if (err.firstUpdate) {
            if (err.lineno && err.colno)
                prefix += ` [Line ${err.lineno}, Column ${err.colno}]`;
            else if (err.lineno)
                prefix += ` [Line ${err.lineno}]`;
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
}
else {
    TemplateError.prototype = Object.create(Error.prototype, {
        constructor: {
            value: TemplateError,
        },
    });
}
export const isFunction = (obj) => typeof obj === typeOfItems.function;
export const isArray = (obj) => Array.isArray(obj);
export const isString = (obj) => typeof obj === typeOfItems.string;
export const isObject = (obj) => ObjProto.toString.call(obj) === '[object Object]';
export const _prepareAttributeParts = (attr) => (typeof attr === 'string' ? attr.split('.') : [attr]);
export function getAttrGetter(attribute) {
    const parts = _prepareAttributeParts(attribute);
    return function (item) {
        let _item = item; //TODO fix any
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            // If item is not an object, and we still got parts to handle, it means
            // that something goes wrong. Just roll out to undefined in that case.
            if (part in _item) {
                _item = _item[part]; // TODO: FIX THIS
            }
            else {
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
export function toArray(obj) {
    return ArrayProto.slice.call(obj);
}
export function without(array = [], ...contains) {
    const result = [];
    for (const item of array) {
        if (!contains.includes(item))
            result.push(item);
    }
    return result;
}
export const repeat = (char_, n) => {
    let str = '';
    for (let i = 0; i < n; i++) {
        str += char_;
    }
    return str;
};
export function each(obj, func, context) {
    if (!obj)
        return;
    if (ArrayProto.forEach && obj.forEach === ArrayProto.forEach) {
        obj.forEach(func, context);
    }
    else if (obj.length === +obj.length) {
        for (let i = 0, l = obj.length; i < l; i++) {
            func.call(context, obj[i], i, obj);
        }
    }
}
export function asyncIter(arr, iter, cb) {
    let i = -1;
    function next() {
        i++;
        if (i < arr.length) {
            iter(arr[i], i, next, cb);
        }
        else {
            cb();
        }
    }
    next();
}
export function asyncFor(obj, iter, cb) {
    const keys = Object.keys(obj || {});
    const len = keys.length;
    let i = -1;
    function next() {
        i++;
        const k = keys[i];
        if (i < len) {
            iter(k, obj[k], i, len, next);
        }
        else {
            cb();
        }
    }
    next();
}
export const indexOf = ArrayProto.indexOf;
export const keys_ = Object.keys;
export const _entries = Object.entries;
export const _values = Object.values;
export function inOperator(key, val) {
    if (Array.isArray(val) || isString(val)) {
        return val.indexOf(key) !== -1;
    }
    else if (isObject(val)) {
        return key in val;
    }
    throw new Error('Cannot use "in" operator to search for "' + key + '" in unexpected types.');
}
