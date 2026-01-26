//DONE: Sun 4th Jan 2026 
import path from 'path';
import { Environment } from './environment';
import { Callback } from './types';
import { p } from './lib';

interface NunjucksOpts {
	name: string;
	path: string;
	ext?: string;
}

// app.set('view engine', ext);
// app.engine(ext, (filePath, ctx, cb) => {
// 	const name = path.relative(app.get('views'), filePath).replace(/\\/g, '/');
// 	env.render(name, ctx, cb); // name like "emails/welcome.html"
// })

export function express(env: Environment, app: any) {
	function View(_name: string) {
		this.name = _name;
		this.path = _name;
		this.ext = env.ext || path.extname(_name);
		p.err(_name, this.ext);
		if (!this.ext) {
			this.ext = '.html';
			this.name = _name + this.ext;
			p.err(_name, path.extname(_name));
		}
	}


	View.prototype.render = function render(
		opts: NunjucksOpts,
		cb: Callback
	) {
		p.log('Trying to render');
		env.render(this.name, opts, cb);
	};

	app.set('view', View);
	app.set('nunjucksEnv', env);
	return env;
}
