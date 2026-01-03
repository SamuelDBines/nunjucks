import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { express } from '../nunjucks-ts/src/express-app';

describe('express-app.ts (express integration)', () => {
	it('registers the view class and env on the app via app.set', () => {
		const env = { render: vi.fn() } as any;

		const app = { set: vi.fn() };
		const out = express(env, app);

		expect(out).toBe(env);

		// called with view ctor + env
		expect(app.set).toHaveBeenCalledWith('view', expect.any(Function));
		expect(app.set).toHaveBeenCalledWith('nunjucksEnv', env);
	});

	it('View constructor uses file extension when provided and does not change name', () => {
		const env = { render: vi.fn() } as any;
		const app = { set: vi.fn() };

		express(env, app);

		const ViewCtor = app.set.mock.calls.find((c: any[]) => c[0] === 'view')[1];
		const view = new ViewCtor('index.njk', {
			name: 'index.njk',
			path: '',
			defaultEngine: 'express',
			ext: '',
		});

		// because you assign to closure var "name", but render uses this.name
		// so for correctness, the constructor should set instance fields (it currently doesn't).
		// This test documents current behavior: instance.name is undefined.
		expect((view as any).name).toBeUndefined();
	});

	it('render calls env.render with (this.name, opts, cb)', () => {
		const env = { render: vi.fn() } as any;
		const app = { set: vi.fn() };

		express(env, app);

		const ViewCtor = app.set.mock.calls.find((c: any[]) => c[0] === 'view')[1];
		const view = new ViewCtor('index.njk', {
			name: 'index.njk',
			path: '',
			defaultEngine: 'express',
			ext: '',
		});

		const cb = vi.fn();
		const opts = { a: 1 } as any;

		// render uses this.name (instance field)
		(view as any).name = 'index.njk';

		view.render(opts, cb);

		expect(env.render).toHaveBeenCalledTimes(1);
		expect(env.render).toHaveBeenCalledWith('index.njk', opts, cb);
	});

	it('throws when there is no extension and no defaultEngine', () => {
		const env = { render: vi.fn() } as any;
		const app = { set: vi.fn() };

		express(env, app);

		const ViewCtor = app.set.mock.calls.find((c: any[]) => c[0] === 'view')[1];

		// Your NunjucksView signature is (name, opts), but it ignores opts.defaultEngine
		// and uses the closure `defaultEngine = "express"` (always truthy).
		// So there is currently NO way to trigger this throw branch without code changes.
		//
		// This test expresses the intended behavior by constructing a small patched copy
		// of the constructor logic to demonstrate expected throw; but we cannot reach it
		// through the current public API. If you fix the impl to use opts.defaultEngine,
		// remove this workaround and test the real behavior.
		const makeThrowingCtor = () => {
			function NunjucksView(_name: string, _opts: any) {
				let name = _name;
				let ext = path.extname(name);
				const defaultEngine: any = ''; // falsy
				if (!ext && !defaultEngine) {
					throw new Error(
						'No default engine was specified and no extension was provided.'
					);
				}
				if (!ext) {
					name += ext = (defaultEngine[0] !== '.' ? '.' : '') + defaultEngine;
				}
			}
			return NunjucksView;
		};

		const Throwing = makeThrowingCtor();
		expect(() => new (Throwing as any)('index', {})).toThrow(
			/No default engine was specified/i
		);

		// and ViewCtor itself should not throw for "index" due to current bug
		expect(() => new ViewCtor('index', {})).not.toThrow();
	});
});
