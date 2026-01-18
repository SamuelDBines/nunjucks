//TODO: Sun 4th Jan 2026 
import _path from 'node:path'
import {
	isString,
	TemplateErr,
	p,
} from './lib';
import { LoaderEnum, LoaderSrcType } from './loader';

import { parse } from './parser'
import { transform } from './transformer';
import { renderAST } from './interpreter';
import { Context } from './context'
import { Environment } from './environment';
import { Frame } from './frame';
import { Callback } from './types';
import * as Runtime from './runtime';



type RootRenderFunctionProps = (
	env: Environment,
	context: Context,
	frame: typeof Frame,
	_runtime: typeof Runtime,
	cb: Callback
) => void;




// const root: RootRenderFunctionProps = (env, context, frame, runtime, cb) => {
// 	try {
// 		cb(null, 'hello');
// 	} catch (e) {
// 		cb(e, null);
// 	}
// };


export function TemplateError(
	message: string | Error,
	lineno: number = 0,
	colno: number = 0
): TemplateErr {
	const cause = message instanceof Error ? message : undefined;
	const msg = cause ? `${cause.name}: ${cause.message}` : String(message ?? '');
	const err = new Error(msg, cause ? { cause } : undefined) as TemplateErr;
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
	err.update = (path?: string) => {
		let prefix = `(${path || 'unknown path'})`;

		if (err.firstUpdate) {
			if (err?.lineno && err?.colno)
				prefix += ` [Line ${err?.lineno}, Column ${err?.colno}]`;
			else if (err?.lineno) prefix += ` [Line ${err?.lineno}]`;
		}

		prefix += '\n  '; // newline + indentation
		err.message = prefix + (err.message || '');
		err.firstUpdate = false;
		return err;
	};
	return err;
}


export class Template {
	env: Environment = new Environment();
	tmplSrc: LoaderSrcType;
	path: string = '';
	blocks: any;
	compiled: boolean = false;
	rootRenderFunction: any;
	ast: any
	constructor(
		src: LoaderSrcType,
		env = new Environment(),
		path: string,
		eagerCompile?: boolean,
		public lineno: number = 0,
		public colno: number = 0
	) {
		this.env = env;
		this.tmplSrc = src
		this.path = path;

		if (eagerCompile) {
			try {
				this.compile();
			} catch (err: any) {
				throw TemplateError(err);
			}
		} else {
			this.compiled = false;
		}
	}

	render(ctx: any, parentFrame: any, cb?: Callback) {
		console.log(ctx, parentFrame, cb)
		if (typeof ctx === 'function') {
			cb = ctx;
			ctx = {};
		} else if (typeof parentFrame === 'function') {
			cb = parentFrame;
			parentFrame = null;
		}

		try {
			this.compile();
		} catch (e) {
			p.err('Error when compiling', this.path, this.env.dev, e)
			const err = TemplateError(e);
			if (cb) {
				return cb(err);
			} else {
				throw err;
			}
		}

		const context = new Context(ctx || {}, this.blocks, this.env);
		const frame = parentFrame ? parentFrame?.push(true) : new Frame();
		frame.topLevel = true;
		let didError = false;
		this.rootRenderFunction(this.env, context, frame, Runtime, (err, res) => {
			p.log('Root render frame',  res)
			if (didError && cb && typeof res !== 'undefined') return;
		
			if (err) {
				p.err('err: ', err);
				cb(TemplateError(err));
				didError = true;
				return;
			}
			cb(err, res);
		});
	}

	getExported(ctx: any, parentFrame: any, cb: Callback) {
		// eslint-disable-line consistent-return
		if (typeof ctx === 'function') {
			cb = ctx;
			ctx = {};
		}

		if (typeof parentFrame === 'function') {
			cb = parentFrame;
			parentFrame = null;
		}

		// Catch compile errors for async rendering
		try {
			this.compile();
		} catch (e) {
			p.err('[template.getExported] ', e)
			return cb(e);
		}

		const frame = parentFrame ? parentFrame?.push() : new Frame();
		frame.topLevel = true;

		// Run the rootRenderFunc to populate the context with exported vars
		const context = new Context(ctx || {}, this.blocks, this.env);
		p.err('rootRenderFunction', this.rootRenderFunction);
		this.rootRenderFunction(this.env, context, frame, Runtime, (err) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, context.getExported());
			}
		});
	}

	compile() {
		if (this.compiled) return 
		this.ast = transform(parse(this.tmplSrc, this.env.extensionsList, this.env));
		this.rootRenderFunction = (env: Environment, context: Context, frame: Frame, runtime: typeof Runtime, cb: Callback) => {
    	renderAST(env, this.ast!, context.getVariables(), runtime)
				.then((out) => cb(null, out))
				.catch((e) => {
					p.err('[template][compile] - ', e)
					cb(e, null)
				});
		};
		this.compiled = true;
	}

	_getBlocks(props) {
		var blocks = {};

		Object.keys(props).forEach((k) => {
			if (k.slice(0, 2) === 'b_') {
				blocks[k.slice(2)] = props[k];
			}
		});

		return blocks;
	}
}
