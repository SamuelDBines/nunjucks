import { escape, TemplateError, asyncIter, asyncFor, inOperator, isString, } from './lib';
const supportsIterators = typeof Symbol === 'function' &&
    Symbol.iterator &&
    typeof Array.from === 'function';
// Frames keep track of scoping both at compile-time and run-time so
// we know how to access variables. Block tags can introduce special
// variables, for example.
export class Frame {
    parent = null;
    topLevel = false;
    variables;
    isolateWrites; // TODO: find out the type
    constructor(parent, isolateWrites) {
        this.variables = Object.create(null);
        this.parent = parent;
        this.topLevel = !!parent || false;
        // if this is true, writes (set) should never propagate upwards past
        // this frame to its parent (though reads may).
        this.isolateWrites = isolateWrites;
    }
    set(name, val, resolveUp) {
        // Allow variables with dots by automatically creating the
        // nested structure
        let parts = name.split('.');
        let obj = this.variables;
        let frame = this;
        if (resolveUp) {
            if ((frame = this.resolve(parts[0], true))) {
                frame.set(name, val);
                return;
            }
        }
        for (let i = 0; i < parts.length - 1; i++) {
            const id = parts[i];
            if (!obj[id]) {
                obj[id] = {};
            }
            obj = obj[id];
        }
        obj[parts[parts.length - 1]] = val;
    }
    get(name) {
        var val = this.variables[name];
        if (val !== undefined) {
            return val;
        }
        return null;
    }
    lookup(name) {
        var p = this.parent;
        var val = this.variables[name];
        if (val !== undefined) {
            return val;
        }
        return p && p.lookup(name);
    }
    resolve(name, forWrite) {
        const p = forWrite && this.isolateWrites ? undefined : this.parent;
        const val = this.variables[name];
        if (!val) {
            return this;
        }
        return p && p.resolve(name, forWrite);
    }
    push(isolateWrites) {
        return new Frame(this, isolateWrites);
    }
    pop() {
        return this.parent;
    }
}
function makeMacro(argNames, kwargNames, func) {
    return function macro(...macroArgs) {
        var argCount = numArgs(macroArgs);
        var args;
        var kwargs = getKeywordArgs(macroArgs);
        if (argCount > argNames.length) {
            args = macroArgs.slice(0, argNames.length);
            // Positional arguments that should be passed in as
            // keyword arguments (essentially default values)
            macroArgs.slice(args.length, argCount).forEach((val, i) => {
                if (i < kwargNames.length) {
                    kwargs[kwargNames[i]] = val;
                }
            });
            args.push(kwargs);
        }
        else if (argCount < argNames.length) {
            args = macroArgs.slice(0, argCount);
            for (let i = argCount; i < argNames.length; i++) {
                const arg = argNames[i];
                // Keyword arguments that should be passed as
                // positional arguments, i.e. the caller explicitly
                // used the name of a positional arg
                args.push(kwargs[arg]);
                delete kwargs[arg];
            }
            args.push(kwargs);
        }
        else {
            args = macroArgs;
        }
        return func.apply(this, args);
    };
}
function makeKeywordArgs(obj) {
    obj.__keywords = true;
    return obj;
}
const isKeywordArgs = (obj) => obj && Object.prototype.hasOwnProperty.call(obj, '__keywords');
function getKeywordArgs(args) {
    let len = args.length;
    if (len) {
        const lastArg = args[len - 1];
        if (isKeywordArgs(lastArg)) {
            return lastArg;
        }
    }
    return {};
}
function numArgs(args) {
    const len = args.length;
    if (len === 0)
        return 0;
    const lastArg = args[len - 1];
    if (isKeywordArgs(lastArg)) {
        return len - 1;
    }
    return len;
}
function copySafeness(dest, target) {
    if (isString(dest)) {
        return target;
    }
    return target.toString();
}
function markSafe(val) {
    const type = typeof val;
    if (type === 'string') {
        return val.toString();
    }
    else if (type !== 'function') {
        return val;
    }
    else {
        return function wrapSafe(args) {
            var ret = val.apply(this, arguments);
            if (typeof ret === 'string') {
                return ret.toString();
            }
            return ret;
        };
    }
}
export function suppressValue(val, autoescape) {
    if (autoescape) {
        return escape(val);
    }
    return val;
}
export function ensureDefined(val, lineno = 0, colno = 0) {
    if (val === null || val === undefined) {
        throw TemplateError('attempted to output null or undefined value', lineno + 1, colno + 1);
    }
    return val;
}
export function memberLookup(obj, val) {
    if (!obj)
        return undefined;
    if (typeof obj[val] === 'function') {
        return (...args) => obj[val].apply(obj, args);
    }
    return obj[val];
}
function callWrap(obj, name, context, args) {
    if (!obj) {
        throw new Error('Unable to call `' + name + '`, which is undefined or falsey');
    }
    else if (typeof obj !== 'function') {
        throw new Error('Unable to call `' + name + '`, which is not a function');
    }
    return obj.apply(context, args);
}
function contextOrFrameLookup(context, frame, name) {
    var val = frame.lookup(name);
    return val !== undefined ? val : context.lookup(name);
}
function handleError(error, lineno = 0, colno = 0) {
    if (error.lineno)
        return error;
    return TemplateError(error, lineno, colno);
}
function asyncEach(arr, dimen, iter, cb) {
    if (Array.isArray(arr)) {
        const len = arr.length;
        // TODO: confirm types here
        asyncIter(arr, function iterCallback(item, i, next) {
            switch (dimen) {
                case 1:
                    iter(item, i, len, next);
                    break;
                case 2:
                    iter(item[0], item[1], i, len, next);
                    break;
                case 3:
                    iter(item[0], item[1], item[2], i, len, next);
                    break;
                default:
                    item.push(i, len, next);
                    iter.apply(this, item);
            }
        }, cb);
    }
    else {
        asyncFor(arr, function iterCallback(key, val, i, len, next) {
            iter(key, val, i, len, next);
        }, cb);
    }
}
export function asyncAll(arr, dimen, func, cb) {
    let finished = 0;
    let len = 0;
    let outputArr = [];
    function done(i, output) {
        //Find types for here with theses
        finished++;
        outputArr[i] = output;
        if (finished === len) {
            cb(null, outputArr.join(''));
        }
    }
    if (Array.isArray(arr)) {
        len = arr.length;
        outputArr = new Array(len);
        if (len === 0) {
            cb(null, '');
        }
        else {
            for (let i = 0; i < arr.length; i++) {
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
                        item.push(i, len, done);
                        func.apply(this, item);
                }
            }
        }
    }
    else {
        const keys = Object.keys(arr || {});
        len = keys.length;
        outputArr = new Array(len);
        if (len === 0) {
            cb(null, '');
        }
        else {
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                func(k, arr[k], i, len, done);
            }
        }
    }
}
export function fromIterator(arr) {
    if (typeof arr !== 'object' || arr === null || Array.isArray(arr)) {
        return arr;
    }
    else if (supportsIterators && Symbol.iterator in arr) {
        return Array.from(arr);
    }
    return arr;
}
export default {
    Frame,
    makeMacro,
    makeKeywordArgs,
    numArgs,
    ensureDefined,
    memberLookup,
    contextOrFrameLookup,
    callWrap,
    handleError,
    isArray: Array.isArray,
    keys: Object.keys,
    copySafeness,
    markSafe,
    asyncEach,
    asyncAll,
    inOperator,
    fromIterator,
};
