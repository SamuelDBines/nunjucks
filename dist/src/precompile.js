import fs from 'fs';
import path from 'path';
import { _prettifyError, TemplateError } from './lib';
import { compile } from './compiler';
import { Environment } from './environment';
import { precompileGlobal } from './globals';
function match(filename, patterns) {
    if (!Array.isArray(patterns)) {
        return false;
    }
    return patterns.some((pattern) => filename.match(pattern));
}
const precompileOpts = {
    isString: true,
    isFunction: false,
    force: false,
    wrapper: precompileGlobal,
    env: new Environment([]),
    exclude: [],
    include: [],
};
function precompileString(str, opts) {
    const _out = {
        ...precompileOpts,
        ...opts,
    };
    if (!_precompile.name) {
        throw new Error('the "name" option is required when compiling a string');
    }
    // @ts-ignore
    return _out?.wrapper([_precompile(str, opts.name, opts.env)], opts);
}
function precompile(input, opts) {
    // The following options are available:
    //
    // * name: name of the template (auto-generated when compiling a directory)
    // * force: keep compiling on error
    // * env: the Environment to use (gets extensions and async filters from it)
    // * include: which file/folders to include (folders are auto-included, files are auto-excluded)
    // * exclude: which file/folders to exclude (folders are auto-included, files are auto-excluded)
    // * wrapper: function(templates, opts) {...}
    //       Customize the output format to store the compiled template.
    //       By default, templates are stored in a global variable used by the runtime.
    //       A custom loader will be necessary to load your custom wrapper.
    const env = opts?.env || new Environment([]);
    const wrapper = opts?.wrapper || precompileGlobal;
    if (opts?.isString) {
        return precompileString(input, opts);
    }
    const pathStats = fs.statSync(input);
    const precompiled = [];
    const templates = [];
    function addTemplates(dir) {
        fs.readdirSync(dir).forEach((file) => {
            const filepath = path.join(dir, file);
            let subpath = filepath.substr(path.join(input, '/').length);
            const stat = fs.statSync(filepath);
            if (stat && stat.isDirectory()) {
                subpath += '/';
                if (!match(subpath, opts?.exclude)) {
                    addTemplates(filepath);
                }
            }
            else if (match(subpath, opts?.include)) {
                templates.push(filepath);
            }
        });
    }
    if (pathStats.isFile()) {
        precompiled.push(_precompile(fs.readFileSync(input, 'utf-8'), opts.name || input, env));
    }
    else if (pathStats.isDirectory()) {
        addTemplates(input);
        for (let i = 0; i < templates.length; i++) {
            const name = templates[i].replace(path.join(input, '/'), '');
            try {
                precompiled.push(_precompile(fs.readFileSync(templates[i], 'utf-8'), name, env));
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
export function _precompile(str, name, env = new Environment([])) {
    const asyncFilters = env.asyncFilters;
    const extensions = env.extensionsList;
    let template;
    name = name.replace(/\\/g, '/');
    try {
        template = compile(str, asyncFilters, extensions, name, {
            throwOnUndefined: env.throwOnUndefined,
        });
    }
    catch (err) {
        throw _prettifyError(name, false, TemplateError(err));
    }
    return {
        name: name,
        template: template,
    };
}
export default {
    precompile,
    precompileString,
};
