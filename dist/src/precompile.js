"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.precompile = precompile;
// DONE: Sat Jan 3
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lib_1 = require("./lib");
const compiler_1 = require("./compiler");
const environment_1 = require("./environment");
const globals_1 = require("./globals");
// Default
const initPrecompileOpts = {
    isString: true,
    isFunction: false,
    force: false,
    wrapper: globals_1.precompileGlobal,
    env: new environment_1.Environment(),
    exclude: [],
    include: [],
};
function match(filename, patterns) {
    if (!Array.isArray(patterns)) {
        return false;
    }
    return patterns.some((pattern) => filename.match(pattern));
}
function _precompile(src, name, env = new environment_1.Environment()) {
    const asyncFilters = env.asyncFilters;
    const extensions = env.extensionsList;
    let template;
    name = name.replace(/\\/g, '/');
    try {
        template = (0, compiler_1.compile)(src, asyncFilters, extensions, name, {
            throwOnUndefined: env.throwOnUndefined,
        });
    }
    catch (err) {
        lib_1.p.err('_precompile :', err);
        throw (0, lib_1._prettifyError)(name, false, (0, lib_1.TemplateError)(err));
    }
    return {
        name: name,
        template: template,
    };
}
function precompileString(str, opts) {
    const _out = {
        ...initPrecompileOpts,
        ...opts,
    };
    if (!_precompile.name) {
        throw new Error('the "name" option is required when compiling a string');
    }
    // @ts-ignore TODO: fix this
    return _out?.wrapper([_precompile(str, opts.name, opts.env)], opts);
}
function precompile(input, opts) {
    const env = opts?.env || new environment_1.Environment();
    const wrapper = opts?.wrapper || globals_1.precompileGlobal;
    if (opts?.isString) {
        return precompileString(input, opts);
    }
    const pathStats = fs_1.default.statSync(input);
    const precompiled = [];
    const templates = [];
    function addTemplates(dir) {
        fs_1.default.readdirSync(dir).forEach((file) => {
            const filepath = path_1.default.join(dir, file);
            let subpath = filepath.substr(path_1.default.join(input, '/')?.length);
            const stat = fs_1.default.statSync(filepath);
            if (stat && stat.isDirectory()) {
                subpath += '/';
                if (!match(subpath, opts?.exclude)) {
                    addTemplates(filepath);
                }
            }
            else if (match(subpath, opts?.include)) {
                templates?.push(filepath);
            }
        });
    }
    if (pathStats.isFile()) {
        precompiled?.push(_precompile(fs_1.default.readFileSync(input, 'utf-8'), opts.name || input, env));
    }
    else if (pathStats.isDirectory()) {
        addTemplates(input);
        for (let i = 0; i < templates?.length; i++) {
            const name = templates[i].replace(path_1.default.join(input, '/'), '');
            try {
                precompiled?.push(_precompile(fs_1.default.readFileSync(templates[i], 'utf-8'), name, env));
            }
            catch (e) {
                if (opts.force) {
                    // Don't stop generating the output if we're
                    // forcing compilation.
                    console.error(e); // eslint-disable-line no-console
                }
                else {
                    throw e;
                }
            }
        }
    }
    return wrapper(precompiled, opts);
}
