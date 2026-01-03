import { isObject, TemplateErr } from './src/lib';
import { Environment, Template, Context } from './src/environment';
import {
	Loader,
	PrecompiledLoader,
	WebLoader,
	FileSystemLoader,
} from './src/loader';

import { Callback } from './src/types';
import precompile from './src/precompile';

import runtime from './src/runtime';
import installJinjaCompat from './src/jinja-compat';

let e: Environment = new Environment();

function configure(templatesPath: string = '.', opts: any = {}) {
	let tmp = opts;
	if (isObject(templatesPath)) {
		tmp = templatesPath;
	}

	let TemplateLoader;
	if (FileSystemLoader) {
		TemplateLoader = new FileSystemLoader([templatesPath], {
			watch: opts.watch,
			noCache: opts.noCache,
		});
	} else if (WebLoader) {
		TemplateLoader = new WebLoader(templatesPath, {
			useCache: opts.web && opts.web.useCache,
			async: opts.web && opts.web.async,
		});
	}
	if (!TemplateLoader) return;
	e = new Environment([TemplateLoader], opts);

	if (opts && opts.express) {
		e.express(opts.express);
	}

	return e;
}

export default {
	Environment,
	Template: Template,
	Loader: Loader,
	FileSystemLoader: FileSystemLoader,
	PrecompiledLoader,
	WebLoader,
	runtime: runtime,
	installJinjaCompat: installJinjaCompat,
	configure: configure,
	reset() {
		e = new Environment();
	},
	compile(src: any, env: any, path: any, eagerCompile: any) {
		if (!e) {
			configure();
		}
		return new Template(src, env, path, eagerCompile);
	},
	render(name: string, ctx: Context, cb: Callback) {
		if (!e) {
			configure();
		}
		return e.render(name, ctx, cb);
	},
	renderString(src: any, ctx: Context, cb: Callback) {
		if (!e) {
			configure();
		}

		return e.renderString(src, ctx, cb);
	},
	precompile: precompile ? precompile.precompile : undefined,
	precompileString: precompile ? precompile.precompileString : undefined,
};

export * as lib from './src/lib';
export * as lexer from './src/lexer';
export * as parser from './src/parser';
export * as nodes from './src/nodes';
export * as compiler from './src/compiler';
// Maybe should be private?
export * as transformer from './src/transformer';
