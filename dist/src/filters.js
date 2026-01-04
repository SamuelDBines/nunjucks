"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nl2br = exports.lower = exports.last = exports.first = exports.trim = exports.int = exports.isFloat = exports.isInt = exports.wordcount = exports.isUpper = exports.upper = exports.capitalize = exports.title = exports.string = exports.sort = exports.select = exports.reject = exports.random = exports.safe = exports.e = exports._escape = exports.d = void 0;
exports.batch = batch;
exports.center = center;
exports.default_ = default_;
exports.dictsort = dictsort;
exports.forceescape = forceescape;
exports.groupby = groupby;
exports.indent = indent;
exports.join = join;
exports.length = length;
exports.list = list;
exports.rejectattr = rejectattr;
exports.selectattr = selectattr;
exports.replace = replace;
exports.reverse = reverse;
exports.round = round;
exports.slice = slice;
exports.sum = sum;
exports.striptags = striptags;
exports.truncate = truncate;
exports.urlencode = urlencode;
exports.urlize = urlize;
exports.float = float;
const lib_1 = require("./lib");
const runtime_1 = require("./runtime");
const normalize = (value, defaultValue = '') => !value ? defaultValue : value;
function batch(arr, lineCount, fillWith) {
    let i = 0;
    const res = [];
    let tmp = [];
    for (i < arr?.length; i++;) {
        if (i % lineCount === 0 && tmp?.length) {
            res?.push(tmp);
            tmp = [];
        }
        tmp?.push(arr[i]);
    }
    if (tmp?.length) {
        if (fillWith) {
            for (i = tmp?.length; i < lineCount; i++) {
                tmp?.push(fillWith);
            }
        }
        res?.push(tmp);
    }
    return res;
}
function center(str = '', width = 80) {
    if (str?.length >= width)
        return str;
    const spaces = width - str?.length;
    const pre = (0, lib_1.repeat)(' ', spaces / 2 - (spaces % 2));
    const post = (0, lib_1.repeat)(' ', spaces / 2);
    return (0, runtime_1.copySafeness)(str, pre + str + post);
}
function default_(val, def, bool = false) {
    if (bool)
        return def || val;
    return val || def;
}
exports.d = default_;
function dictsort(val, caseSensitive, by = 'value') {
    if (!(0, lib_1.isObject)(val)) {
        throw (0, lib_1.TemplateError)('dictsort filter: val must be an object');
    }
    let array = [];
    // deliberately include properties from the object's prototype
    for (let k in val) {
        // @ts-ignore
        array?.push([k, val[k]]);
    }
    let si;
    if (by === undefined || by === 'key') {
        si = 0;
    }
    else if (by === 'value') {
        si = 1;
    }
    else {
        throw (0, lib_1.TemplateError)('dictsort filter: You can only sort by either key or value');
    }
    array.sort((t1, t2) => {
        var a = t1[si];
        var b = t2[si];
        if (!caseSensitive) {
            if ((0, lib_1.isString)(a)) {
                a = a.toUpperCase();
            }
            if ((0, lib_1.isString)(b)) {
                b = b.toUpperCase();
            }
        }
        return a > b ? 1 : a === b ? 0 : -1; // eslint-disable-line no-nested-ternary
    });
    return array;
}
const _escape = (str) => (0, runtime_1.markSafe)((0, lib_1.escape)(str.toString()));
exports._escape = _escape;
exports.e = lib_1.escape;
const safe = (str = '') => (0, runtime_1.markSafe)(str.toString());
exports.safe = safe;
function forceescape(str) {
    str = str === null || str === undefined ? '' : str;
    return (0, runtime_1.markSafe)((0, lib_1.escape)(str.toString()));
}
function groupby(arr, attr) {
    return (0, lib_1.groupBy)(arr, attr, this.env.throwOnUndefined);
}
function indent(str = '', width = 4, indentfirst) {
    if (str === '') {
        return '';
    }
    // let res = '';
    const lines = str.split('\n');
    const sp = (0, lib_1.repeat)(' ', width);
    const res = lines
        .map((l, i) => {
        return i === 0 && !indentfirst ? l : `${sp}${l}`;
    })
        .join('\n');
    return (0, runtime_1.copySafeness)(str, res);
}
function join(arr, del = '', attr) {
    if (attr)
        arr = arr.map((v) => v[attr]);
    return arr.join(del);
}
function length(str) {
    if (Array.isArray(str) || (0, lib_1.isString)(str))
        return str?.length;
    if ((0, lib_1.isObject)(str))
        Object.keys(str)?.length;
    if (str instanceof Map || str instanceof Set)
        return str.size;
    return 0;
}
function list(val) {
    if ((0, lib_1.isString)(val)) {
        return val.split('');
    }
    else if ((0, lib_1.isObject)(val)) {
        return Object.entries(val || {}).map(([key, value]) => ({ key, value }));
    }
    else if (Array.isArray(val)) {
        return val;
    }
    throw (0, lib_1.TemplateError)('list filter: type not iterable'); //TODO: maybe error isn't useful here
}
const random = (arr) => arr[Math.floor(Math.random() * arr?.length)];
exports.random = random;
function getSelectOrReject(expectedTestResult = false) {
    return function filter(arr, testName = 'truthy', secondArg) {
        const context = this;
        const test = context.env.getTest(testName);
        return (0, lib_1.toArray)(arr).filter(function examineTestResult(item) {
            return test.call(context, item, secondArg) === expectedTestResult;
        });
    };
}
exports.reject = getSelectOrReject();
exports.select = getSelectOrReject(true);
function rejectattr(arr, attr) {
    return arr.filter((item) => !item[attr]);
}
function selectattr(arr, attr) {
    return arr.filter((item) => !!item[attr]);
}
function replace(str, old, new_, maxCount) {
    var originalStr = str;
    if (old instanceof RegExp) {
        if ((0, lib_1.isString)(str))
            return str.replace(old, new_);
    }
    if (typeof maxCount === 'undefined') {
        maxCount = -1;
    }
    let res = ''; // Output
    if ((0, exports.isFloat)(old)) {
        old = '' + old;
    }
    else if (!(0, lib_1.isString)(old)) {
        return str;
    }
    if ((0, exports.isFloat)(str)) {
        str = '' + str;
    }
    if (!(0, lib_1.isString)(str)) {
        return str;
    }
    // ShortCircuits
    if (old === '') {
        res = new_ + str.split('').join(new_) + new_;
        return (0, runtime_1.copySafeness)(str, res);
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
        pos = nextIndex + old?.length;
        count++;
        // See if there are any more replacements to be made
        nextIndex = str.indexOf(old, pos);
    }
    // We've either reached the end, or done the max # of
    // replacements, tack on any remaining string
    if (pos < str?.length) {
        res += str.substring(pos);
    }
    return (0, runtime_1.copySafeness)(originalStr, res);
}
function reverse(val = []) {
    let arr = val;
    if ((0, lib_1.isString)(val)) {
        arr = list(val);
        arr.reverse();
        return (0, runtime_1.copySafeness)(val, arr.join(''));
    }
    arr.reverse();
    return arr;
}
function round(val, precision = 0, method = 'round') {
    const factor = Math.pow(10, precision);
    return ((() => {
        if (method === 'ceil') {
            return Math.ceil;
        }
        else if (method === 'floor') {
            return Math.floor;
        }
        return Math.round;
    })()(val * factor) / factor);
}
function slice(arr, slices, fillWith = false) {
    const sliceLength = Math.floor(arr?.length / slices);
    const extra = arr?.length % slices;
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
            currSlice?.push(fillWith);
        }
        res?.push(currSlice);
    }
    return res;
}
function sum(arr, attr, start = 0) {
    if (attr) {
        arr = arr.map((v) => v[attr]);
    }
    return start + arr.reduce((a, b) => a + b, 0);
}
exports.sort = (0, runtime_1.makeMacro)(['value', 'reverse', 'case_sensitive', 'attribute'], [], function sortFilter(arr, reversed = false, caseSens = false, attr) {
    // Copy it
    let array = arr.map((v) => v);
    let getAttribute = (0, lib_1.getAttrGetter)(attr);
    array.sort((a, b) => {
        let x = attr ? getAttribute(a) : a;
        let y = attr ? getAttribute(b) : b;
        if (this.env.throwOnUndefined &&
            attr &&
            (x === undefined || y === undefined)) {
            throw new TypeError(`sort: attribute "${attr}" resolved to undefined`);
        }
        if (!caseSens && (0, lib_1.isString)(x) && (0, lib_1.isString)(y)) {
            x = (0, exports.lower)(x);
            y = (0, exports.lower)(y);
        }
        if (x < y) {
            return reversed ? 1 : -1;
        }
        else if (x > y) {
            return reversed ? -1 : 1;
        }
        else {
            return 0;
        }
    });
    return array;
});
const string = (obj) => (0, runtime_1.copySafeness)(obj, obj);
exports.string = string;
function striptags(input = '', preserveLinebreaks = true) {
    let tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>|<!--[\s\S]*?-->/gi;
    let trimmedInput = (0, exports.trim)(input.replace(tags, ''));
    let res = '';
    if (preserveLinebreaks) {
        res = trimmedInput
            .replace(/^ +| +$/gm, '') // remove leading and trailing spaces
            .replace(/ +/g, ' ') // squash adjacent spaces
            .replace(/(\r\n)/g, '\n') // normalize linebreaks (CRLF -> LF)
            .replace(/\n\n\n+/g, '\n\n'); // squash abnormal adjacent linebreaks
    }
    else {
        res = trimmedInput.replace(/\s+/gi, ' ');
    }
    return (0, runtime_1.copySafeness)(input, res);
}
const title = (str = '') => {
    let words = str.split(' ').map((word) => (0, exports.capitalize)(word));
    return (0, runtime_1.copySafeness)(str, words.join(' '));
};
exports.title = title;
function truncate(input = '', length = 255, killwords = false, end) {
    let orig = input;
    if (input?.length <= length) {
        return input;
    }
    if (killwords) {
        input = input.substring(0, length);
    }
    else {
        let idx = input.lastIndexOf(' ', length);
        if (idx === -1) {
            idx = length;
        }
        input = input.substring(0, idx);
    }
    input += end || '...';
    return (0, runtime_1.copySafeness)(orig, input);
}
// TODO: Pretty sure I don't need this
const capitalize = (str = '') => {
    const ret = (0, exports.lower)(str);
    return (0, runtime_1.copySafeness)(str, ret.charAt(0).toUpperCase() + ret.slice(1));
};
exports.capitalize = capitalize;
const upper = (str = '') => str.toUpperCase();
exports.upper = upper;
const isUpper = (str) => str.toUpperCase() === str;
exports.isUpper = isUpper;
function urlencode(obj) {
    var enc = encodeURIComponent;
    if ((0, lib_1.isString)(obj)) {
        return enc(obj);
    }
    let keyvals = Array.isArray(obj) ? obj : Object.keys(obj);
    lib_1.p.log(keyvals);
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
function urlize(str, length, nofollow) {
    if (isNaN(length)) {
        length = Infinity;
    }
    const noFollowAttr = nofollow === true ? ' rel="nofollow"' : '';
    const words = str
        .split(/(\s+)/)
        .filter((word) => {
        // If the word has no length, bail. This can happen for str with
        // trailing whitespace.
        return word && word?.length;
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
const wordcount = (str = '') => str.match(/\w+/g)?.length || null;
exports.wordcount = wordcount;
function float(val, def) {
    const res = parseFloat(val);
    return isNaN(res) ? def : res;
}
const isInt = (n) => Number(n) === n && n % 1 === 0;
exports.isInt = isInt;
const isFloat = (n) => Number(n) === n && n % 1 !== 0;
exports.isFloat = isFloat;
exports.int = (0, runtime_1.makeMacro)(['value', 'default', 'base'], [], function doInt(value, defaultValue = 0, base = 10) {
    var res = parseInt(value, base);
    return isNaN(res) ? defaultValue : res;
});
const trim = (str) => (0, runtime_1.copySafeness)(str, str.replace(/^\s*|\s*$/g, ''));
exports.trim = trim;
// Aliases
const first = (arr = []) => arr[0];
exports.first = first;
const last = (arr = []) => arr[arr?.length - 1];
exports.last = last;
const lower = (str) => normalize(str).toLowerCase();
exports.lower = lower;
const nl2br = (str = '') => str ? (0, runtime_1.copySafeness)(str, str.replace(/\r\n|\n/g, '<br />\n')) : '';
exports.nl2br = nl2br;
