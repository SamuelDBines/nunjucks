"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemLoader = exports.WebLoader = exports.PrecompiledLoader = exports.Loader = void 0;
// DONE: Sat Jan 3
const path_1 = __importDefault(require("path"));
const node_fs_1 = __importDefault(require("node:fs"));
const events_1 = __importDefault(require("events"));
// --- FUNCTION ---
class Loader extends events_1.default {
    watch = false;
    noCache = false;
    cache = {};
    resolve(from, to) {
        return path_1.default.resolve(path_1.default.dirname(from), to);
    }
    isRelative(filename) {
        return filename.indexOf('./') === 0 || filename.indexOf('../') === 0;
    }
    get typename() {
        return this.constructor.name;
    }
}
exports.Loader = Loader;
class PrecompiledLoader extends Loader {
    precompiled;
    constructor(compiledTemplates) {
        super();
        this.precompiled = compiledTemplates || {};
    }
    getSource(name) {
        if (this.precompiled[name]) {
            return {
                src: {
                    type: 'code',
                    obj: this.precompiled[name],
                },
                path: name,
            };
        }
        return null;
    }
}
exports.PrecompiledLoader = PrecompiledLoader;
class WebLoader extends Loader {
    baseURL;
    useCache;
    async;
    constructor(baseURL = '.', opts) {
        super();
        this.baseURL = baseURL;
        opts = opts || {};
        this.useCache = !!opts.useCache; // We default cache to false
        this.async = !!opts.async; // We default `async` to false
    }
    resolve(_, _t) {
        throw new Error('relative templates not support in the browser yet');
        return '';
    }
    getSource(name, cb) {
        const useCache = this.useCache;
        if (useCache && this.cache && this.cache[name]) {
            const cached = this.cache[name];
            if (cb)
                cb(null, cached);
            return cached;
        }
        const url = this.baseURL.replace(/\/$/, '') + '/' + name.replace(/^\//, '');
        if (!cb) {
            throw new Error('WebLoader.getSource(name) without a callback is not supported with fetch (fetch is always async). ' +
                'Pass a callback or precompile templates.');
        }
        return this.fetch(url, (err, src) => {
            if (err) {
                if (err.status === 404)
                    return cb(null, null);
                return cb(err, null);
            }
            const result = {
                src,
                path: name,
                noCache: !useCache,
            };
            if (useCache) {
                this.cache = this.cache || {};
                this.cache[name] = result;
            }
            this.emit('load', name, result);
            cb(null, result);
        });
    }
    fetch(url, cb) {
        if (typeof window === 'undefined') {
            throw new Error('WebLoader can only by used in a browser');
        }
        const bust = 's=' + Date.now();
        const finalUrl = url + (url.includes('?') ? '&' : '?') + bust;
        return fetch(finalUrl, { method: 'GET', credentials: 'same-origin' })
            .then((res) => res.text().then((text) => {
            if (res.ok || res.status === 0) {
                cb(null, text);
            }
            else {
                cb({ status: res.status, content: text });
            }
        }))
            .catch((e) => cb({ status: 0, content: String(e?.message || e) }));
    }
}
exports.WebLoader = WebLoader;
class FileSystemLoader extends Loader {
    searchPaths;
    pathsToNames;
    constructor(searchPaths = ['.'], opts) {
        super();
        this.searchPaths = searchPaths;
        if (typeof opts === 'boolean') {
            throw '';
        }
        this.pathsToNames = {};
        this.noCache = opts?.noCache || false;
        this.searchPaths = (Array.isArray(searchPaths) ? searchPaths : [searchPaths]).map(path_1.default.normalize);
    }
    getSource(name) {
        let fullpath = null;
        for (let i = 0; i < this.searchPaths?.length; i++) {
            const basePath = path_1.default.resolve(this.searchPaths[i]);
            const p = path_1.default.resolve(this.searchPaths[i], name);
            if (p.indexOf(basePath) === 0 && node_fs_1.default.existsSync(p)) {
                fullpath = p;
                break;
            }
        }
        if (!fullpath) {
            return null;
        }
        this.pathsToNames[fullpath] = name;
        const source = {
            src: node_fs_1.default.readFileSync(fullpath, 'utf-8'),
            path: fullpath,
            noCache: this.noCache,
        };
        this.emit('load', name, source);
        return source;
    }
}
exports.FileSystemLoader = FileSystemLoader;
