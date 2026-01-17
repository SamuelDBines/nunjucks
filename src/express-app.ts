//DONE: Sun 4th Jan 2026 
import path from 'path';
import { Environment } from './environment';
import { Callback } from './types';
import { p } from './lib';

interface NunjucksOpts {
	name: string;
	path: string;
	defaultEngine: 'express';
	ext: string;
}

export function express(env: Environment, app: any, opts?: { ext?: string }) {
	let ext: string = opts?.ext || '.njk';

	// app.set('view engine', ext);

	// app.engine(ext, (filePath, ctx, cb) => {
	// 	const name = path.relative(app.get('views'), filePath).replace(/\\/g, '/');
	// 	env.render(name, ctx, cb); // name like "emails/welcome.html"
	// })

	function NunjucksView(_name: string, opts: NunjucksOpts) {
		this.name = _name;
		this.path = _name;
		this.ext = path.extname(_name);
		p.err(_name, this.ext);
		if (!this.ext) {
			this.ext = '.html';
			this.name = _name + this.ext;
			p.err(_name, path.extname(_name));
			// throw new Error(
			// 	'No default engine was specified and no extension was provided.'
			// );
		}
	}


	NunjucksView.prototype.render = function render(
		opts: NunjucksOpts,
		cb: Callback
	) {
		p.log('Trying to render');
		env.render(this.name, opts, cb);
	};

	app.set('view', NunjucksView);
	app.set('nunjucksEnv', env);
	return env;
}
