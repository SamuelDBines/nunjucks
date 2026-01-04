"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.p = exports.repeat = exports._prepareAttributeParts = exports.isObject = exports.isString = exports.isFunction = exports.hasOwnProp = exports.dump = exports.escape = exports.escapeMap = void 0;
exports._prettifyError = _prettifyError;
exports.TemplateError = TemplateError;
exports.getAttrGetter = getAttrGetter;
exports.groupBy = groupBy;
exports.toArray = toArray;
exports.without = without;
exports.each = each;
exports.asyncIter = asyncIter;
exports.asyncFor = asyncFor;
exports.inOperator = inOperator;
// --- PRIVATE ---
const ArrayProto = Array.prototype;
const ObjProto = Object.prototype;
// ---- ESCAPE CHARACTERS ----
const escapeRegex = /[&"'<>\\]/g;
exports.escapeMap = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
    '<': '&lt;',
    '>': '&gt;',
    '\\': '&#92;',
};
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
const escape = (val) => val.replace(escapeRegex, (ch) => exports.escapeMap[ch]);
exports.escape = escape;
const dump = (obj, spaces) => JSON.stringify(obj, null, spaces);
exports.dump = dump;
const hasOwnProp = (obj, key) => (key ? key in obj : false);
exports.hasOwnProp = hasOwnProp;
function _prettifyError(path, withInternals, err) {
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
// Update template errors
function TemplateError(message, lineno = 0, colno = 0) {
    const cause = message instanceof Error ? message : undefined;
    const msg = cause ? `${cause.name}: ${cause.message}` : String(message ?? '');
    const err = new Error(msg, cause ? { cause } : undefined);
    err.name = 'Template render error';
    err.lineno = lineno;
    err.colno = colno;
    err.firstUpdate = true;
    console.error('Whats the error?', message, cause);
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
            if (err?.lineno && err?.colno)
                prefix += ` [Line ${err?.lineno}, Column ${err?.colno}]`;
            else if (err?.lineno)
                prefix += ` [Line ${err?.lineno}]`;
        }
        prefix += '\n  '; // newline + indentation
        err.message = prefix + (err.message || '');
        err.firstUpdate = false;
        return err;
    };
    return err;
}
const isFunction = (obj) => typeof obj === typeOfItems.function;
exports.isFunction = isFunction;
const isString = (obj) => typeof obj === typeOfItems.string;
exports.isString = isString;
const isObject = (obj) => ObjProto.toString.call(obj) === '[object Object]';
exports.isObject = isObject;
const _prepareAttributeParts = (attr) => (typeof attr === 'string' ? attr.split('.') : [attr]);
exports._prepareAttributeParts = _prepareAttributeParts;
function getAttrGetter(attribute) {
    const parts = (0, exports._prepareAttributeParts)(attribute);
    return function (item) {
        let _item = item; //TODO fix any
        for (let i = 0; i < parts?.length; i++) {
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
function groupBy(obj, val, throwOnUndefined) {
    const result = {};
    const iterator = (0, exports.isFunction)(val) ? val : getAttrGetter(val);
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
function toArray(obj) {
    return ArrayProto.slice.call(obj);
}
function without(array = [], ...contains) {
    const result = [];
    for (const item of array) {
        if (!contains.includes(item))
            result?.push(item);
    }
    return result;
}
const repeat = (char_, n) => {
    let str = '';
    for (let i = 0; i < n; i++) {
        str += char_;
    }
    return str;
};
exports.repeat = repeat;
function each(obj, func, context) {
    if (!obj)
        return;
    if (ArrayProto.forEach && obj.forEach === ArrayProto.forEach) {
        obj.forEach(func, context);
    }
    else if (obj?.length === +obj?.length) {
        for (let i = 0, l = obj?.length; i < l; i++) {
            func.call(context, obj[i], i, obj);
        }
    }
}
function asyncIter(arr, iter, cb) {
    let i = -1;
    function next() {
        i++;
        if (i < arr?.length) {
            iter(arr[i], i, next, cb);
        }
        else {
            cb();
        }
    }
    next();
}
function asyncFor(obj, iter, cb) {
    const keys = Object.keys(obj || {});
    const len = keys?.length;
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
function inOperator(key, val) {
    if (Array.isArray(val) || (0, exports.isString)(val)) {
        return val.indexOf(key) !== -1;
    }
    else if ((0, exports.isObject)(val)) {
        return key in val;
    }
    throw new Error('Cannot use "in" operator to search for "' + key + '" in unexpected types.');
}
const RESET = '\x1b[0m';
const WARN = '\x1b[33m';
const ERR = '\x1b[31m';
const HEADER = '\x1b[95m';
const OKBLUE = '\x1b[94m';
const OKCYAN = '\x1b[96m';
const OKGREEN = '\x1b[92m';
const WARNING = '\x1b[93m';
const FAIL = '\x1b[91m';
const ENDC = '\x1b[0m';
const BOLD = '\x1b[1m';
const UNDERLINE = '\x1b[4m';
const isObjectOrArray = (msg) => {
    const parts = Array.isArray(msg) ? msg : [msg];
    return parts
        .map((i) => {
        if (typeof i === 'string')
            return i;
        if (typeof i === 'number' ||
            typeof i === 'bigint' ||
            typeof i === 'boolean')
            return String(i);
        if (i instanceof Error)
            return i.stack ?? i.message;
        if (i && typeof i === 'object') {
            try {
                return JSON.stringify(i);
            }
            catch {
                return '[Unserializable object]';
            }
        }
        return String(i); // undefined, null, symbol, function, etc
    })
        .join('');
};
exports.p = {
    log: (...msg) => process.stdout.write(`[INFO] ${isObjectOrArray(msg)}\n`),
    debug: (...msg) => process.stdout.write(`${OKBLUE}[DEBUG] ${isObjectOrArray(msg)}${RESET}\n`),
    warn: (...msg) => process.stdout.write(`${WARN}[WARN] ${isObjectOrArray(msg)}${RESET}\n`),
    err: (...msg) => process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg)}${RESET}\n`),
    exit: (...msg) => {
        process.stderr.write(`${ERR}[ERR ] ${isObjectOrArray(msg)}${RESET}\n`);
        process.exit(1);
    },
};
