import { isObject, p } from './src/lib';
import { Environment, Template, Context } from './src/environment';
import { FileSystemLoader } from './src/loader';

import { Callback } from './src/types';

export * from './src/runtime';
export * as lib from './src/lib';
export * as lexer from './src/lexer';
export * as parser from './src/parser';
export * as nodes from './src/nodes';
export * as compiler from './src/compiler';
// Maybe should be private?
export * as transformer from './src/transformer';

let e: Environment = new Environment();

export function configure(templatesPath: string = '.', opts: any = {}) {
	let tmp = opts;
	if (isObject(templatesPath)) {
		tmp = templatesPath;
	}
	const TemplateLoader = new FileSystemLoader([templatesPath], {
		watch: opts.watch,
		noCache: opts.noCache,
	});
	// if (FileSystemLoader) {
	// 	TemplateLoader = new FileSystemLoader([templatesPath], {
	// 		watch: opts.watch,
	// 		noCache: opts.noCache,
	// 	});
	// }
	// else if (WebLoader) {
	// 	TemplateLoader = new WebLoader(templatesPath, {
	// 		useCache: opts.web && opts.web.useCache,
	// 		async: opts.web && opts.web.async,
	// 	});
	// }
	if (!TemplateLoader) {
		throw 'NO LOADER FOUND';
		return;
	}
	opts.loaders = [TemplateLoader];
	e = new Environment(opts);

	if (opts && opts.express) {
		e.express(opts.express);
	}

	return e;
}

export const reset = () => {
	e = new Environment();
};

export const compile = (src: any, env: any, path: any, eagerCompile: any) => {
	if (!e) {
		configure();
	}
	return new Template(src, env, path, eagerCompile);
};
export const render = (src: string, ctx: Context, cb: Callback) => {
	if (!e) {
		configure();
	}
	return e.render(src, ctx, cb);
};
export const renderString = (src: string, ctx: Context, cb: Callback) => {
	if (!e) {
		configure();
	}
	return e.renderString(src, ctx, cb);
};
