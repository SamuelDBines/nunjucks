import path from 'path';
import fs from 'node:fs';
import EventEmitter from 'events';
import { Environment } from './environment';
let chokidar;
// --- FUNCTION ---
function parentWrap(parent, prop) {
    if (typeof parent !== 'function' || typeof prop !== 'function')
        return prop;
    return function (...args) {
        const tmp = this.parent;
        this.parent = parent;
        const res = prop.apply(this, args);
        this.parent = tmp;
        return res;
    };
}
function extendClass(cls, name, props = {}) {
    Object.keys(props).forEach((k) => {
        props[k] = parentWrap(cls.prototype[k], props[k]);
    });
    class subclass extends cls {
        get typename() {
            return name;
        }
    }
    return Object.assign(subclass.prototype ?? {}, props);
    return subclass;
}
// --- CLASSES ---
export class Obj {
    extname;
    __typename;
    constructor(...args) {
        this.init(...args);
        this.__typename = this.constructor.name;
    }
    init(...args) { }
    get typename() {
        return this.constructor.name;
    }
    static extend(name, props) {
        if (typeof name === 'object') {
            props = name;
            name = 'anonymous';
        }
        return extendClass(this, name, props);
    }
}
export class EmitterObj extends EventEmitter {
    constructor(...args) {
        super(...args);
        // this.init(...args);
    }
    get typename() {
        return this.constructor.name;
    }
    static extend(name, props = {}) {
        if (typeof name === 'object') {
            props = name;
            name = 'anonymous';
        }
        return extendClass(this, name, props);
    }
}
export class Loader extends EmitterObj {
    watch = false;
    noCache = false;
    cache = {};
    resolve(from, to) {
        return path.resolve(path.dirname(from), to);
    }
    isRelative(filename) {
        return filename.indexOf('./') === 0 || filename.indexOf('../') === 0;
    }
}
new Environment([new Loader([])]);
export class PrecompiledLoader extends Loader {
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
export class WebLoader extends Loader {
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
export class FileSystemLoader extends Loader {
    searchPaths;
    pathsToNames;
    constructor(searchPaths, opts) {
        super();
        if (typeof opts === 'boolean') {
            throw '';
        }
        this.pathsToNames = {};
        this.noCache = opts?.noCache || false;
        this.watch = opts?.watch || false;
        if (searchPaths) {
            searchPaths = Array.isArray(searchPaths) ? searchPaths : [searchPaths];
            this.searchPaths = searchPaths.map(path.normalize);
        }
        else {
            this.searchPaths = ['.'];
        }
        if (this.watch) {
            // Watch all the templates in the paths and fire an event when
            // they change
            try {
                chokidar = require('chokidar'); // eslint-disable-line global-require
            }
            catch (e) {
                throw new Error('watch requires chokidar to be installed');
            }
            const paths = this.searchPaths.filter(fs.existsSync);
            const watcher = chokidar.watch(paths);
            watcher.on('all', (event, fullname) => {
                fullname = path.resolve(fullname);
                if (event === 'change' && fullname in this.pathsToNames) {
                    this.emit('update', this.pathsToNames[fullname], fullname);
                }
            });
            watcher.on('error', (error) => {
                // TODO: added log helper
                console.log('Watcher error: ' + error);
            });
        }
    }
    getSource(name) {
        let fullpath = null;
        for (let i = 0; i < this.searchPaths.length; i++) {
            const basePath = path.resolve(this.searchPaths[i]);
            const p = path.resolve(this.searchPaths[i], name);
            if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
                fullpath = p;
                break;
            }
        }
        if (!fullpath) {
            return null;
        }
        this.pathsToNames[fullpath] = name;
        const source = {
            src: fs.readFileSync(fullpath, 'utf-8'),
            path: fullpath,
            noCache: this.noCache,
        };
        this.emit('load', name, source);
        return source;
    }
}
export class NodeResolveLoader extends Loader {
    pathsToNames;
    watcher;
    constructor(opts) {
        super();
        this.pathsToNames = {};
        this.noCache = opts?.noCache || false;
        if (opts?.watch) {
            try {
                chokidar = require('chokidar'); // eslint-disable-line global-require
            }
            catch (e) {
                throw new Error('watch requires chokidar to be installed');
            }
            this.watcher = chokidar.watch();
            this.watcher.on('change', (fullname) => {
                this.emit('update', this.pathsToNames[fullname], fullname);
            });
            this.watcher.on('error', (error) => {
                console.log('Watcher error: ' + error);
            });
            this.on('load', (name, source) => {
                this.watcher.add(source.path);
            });
        }
    }
    getSource(name) {
        // Don't allow file-system traversal
        if (/^\.?\.?(\/|\\)/.test(name)) {
            return null;
        }
        if (/^[A-Z]:/.test(name)) {
            return null;
        }
        let fullpath;
        try {
            fullpath = require.resolve(name);
        }
        catch (e) {
            return null;
        }
        this.pathsToNames[fullpath] = name;
        const source = {
            src: fs.readFileSync(fullpath, 'utf-8'),
            path: fullpath,
            noCache: this.noCache,
        };
        this.emit('load', name, source);
        return source;
    }
}
