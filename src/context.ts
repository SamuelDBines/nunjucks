//TODO: Sun 4th Jan 2026 
import _path from 'node:path'
import { p } from './lib';
import { Environment } from './environment';
import { Callback } from './types';
import * as Runtime from './runtime'


export class Context {
	exported: any[] = [];
	compiled: boolean = false;

	constructor(
		public ctx: Record<string, any> = {},
		public blocks: Record<string, any> = {},
		public env = new Environment(),
		public lineno: number = 0,
		public colno: number = 0
	) {
		this.ctx = { ...ctx };

		Object.keys(blocks).forEach((name) => {
			this.addBlock(name, blocks[name]);
		});
	}

	get typename(): string {
		return 'Context';
	}

	lookup(name: string) {
		// This is one of the most called functions, so optimize for
		// the typical case where the name isn't in the globals

		if (name in this.env.globals && !(name in this.ctx)) {
			return this.env.globals[name];
		} else {
			p.debug('ctx local:', this.ctx, name);
			return this.ctx[name];
		}
	}

	setVariable(name: string, val: any) {
		this.ctx[name] = val;
	}

	getVariables() {
		return this.ctx;
	}

	addBlock(name: string, block) {
		this.blocks[name] = this.blocks[name] || [];
		p.warn('\nBlocks added are: ', this.blocks[name], block);
		if (typeof this.blocks[name]?.push === 'function')
			this.blocks[name]?.push(block);
		return this;
	}

	getBlock(name: string) {
		if (!this.blocks[name]) {
			throw new Error('unknown block "' + name + '"');
		}
		return this.blocks[name][0];
	}

	getSuper(
		env: Environment,
		name: string,
		block: any,
		frame: any,
		runtime: typeof Runtime,
		cb: Callback
	) {
		var idx = (this.blocks[name] || []).indexOf(block);
		var blk = this.blocks[name][idx + 1];
		var context = this;

		if (idx === -1 || !blk) {
			throw new Error('no super block available for "' + name + '"');
		}

		blk(env, context, frame, runtime, cb);
	}

	addExport(name: string) {
		this.exported?.push(name);
	}

	getExported() {
		var exported = {};
		this.exported.forEach((name) => {
			exported[name] = this.ctx[name];
		});
		return exported;
	}
}

