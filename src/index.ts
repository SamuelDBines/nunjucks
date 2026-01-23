import { isString, p } from './lib';
import { Environment, } from './environment';
import { Context } from './context';
import { Template } from './template';
import { FileSystemLoader, Loader, MemoryLoader, LoaderEnum } from './loader';

import { Callback } from './types';

export * from './runtime';
export * as lib from './lib';
export * as lexer from './lexer';
export * as parser from './parser';
export * as nodes from './nodes'
export * from './express-app'
export * as transformer from './transformer';

let e: Environment = new Environment();


interface IConfigureOptions {
	path?: string;
	throwOnUndefined?: boolean;
	trimBlocks?: boolean;
	lstripBlocks?: boolean;
	dev?: boolean;
	autoescape?: boolean;
	watch?: boolean;
	cache?: boolean;
	loaders?: Loader[];
	loader?: readonly LoaderEnum[];
}

const initConfigureOptions: IConfigureOptions = {
	path: undefined,
	throwOnUndefined: false,
	trimBlocks: false,
	watch: false,
	// Assume production always override for dev
	dev: false,
	autoescape: true,
	cache: true,
	lstripBlocks: false, // IDK ?
	loader: [LoaderEnum.file],
};

export function configure(
	templatesPathOrOpts: string | IConfigureOptions = '.',
	opts: IConfigureOptions = {}
) {
	let templatesPath: string;
	let options: IConfigureOptions;

	if (isString(templatesPathOrOpts)) {
		templatesPath = templatesPathOrOpts;
		options = { ...initConfigureOptions, path: templatesPathOrOpts, ...opts };
	} else {
		options = { ...initConfigureOptions, ...opts };
		templatesPath = options.path ?? '.';
	}
	
	// const memoryLoader = new MemoryLoader([templatesPath]);

	const loaders: Loader[] = [];
	loaders.push(
		new FileSystemLoader([templatesPath], {
			watch: opts.watch,
			noCache: opts.cache,
		})
	);
	if (!loaders.length) {
		const errMessage = 'No loader found: ' + JSON.stringify(options.loader);
		p.err(errMessage);
		throw new Error(errMessage);
	}

	opts.loaders = loaders;
	console.log(opts)
	return new Environment(opts);
}

export const reset = configure;

export const compile = (
	src: any,
	env: Environment,
	path: any,
	eagerCompile: any
) => {
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
