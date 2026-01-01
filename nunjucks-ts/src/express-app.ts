import path from 'path';
import { Environment } from './environment';
import { Callback } from './types';

interface NunjucksOpts {
	name: string;
	path: string;
	defaultEngine: 'express';
	ext: string;
}

export function express(env: Environment, app: any) {
	let name: string = '',
		_path: string = '',
		ext: string = '',
		defaultEngine: 'express' = 'express';

	function NunjucksView(_name: string, opts: NunjucksOpts) {
		name = _name;
		_path = _name;
		ext = path.extname(name);
		if (!ext && !defaultEngine) {
			throw new Error(
				'No default engine was specified and no extension was provided.'
			);
		}
		if (!ext) {
			name += ext = (defaultEngine[0] !== '.' ? '.' : '') + defaultEngine;
		}
	}

	NunjucksView.prototype.render = function render(
		opts: NunjucksOpts,
		cb: Callback
	) {
		env.render(this.name, opts, cb);
	};

	app.set('view', NunjucksView);
	app.set('nunjucksEnv', env);
	return env;
}
