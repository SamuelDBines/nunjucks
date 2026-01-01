// Making this a function instead so it returns a new object
// each time it's called. That way, if something like an environment
// uses it, they will each have their own copy.
function globals() {
	return {
		range(start: number, stop: number, step: number = 1) {
			if (typeof stop === 'undefined') {
				stop = start;
				start = 0;
			}

			const arr = [];
			if (step > 0) {
				for (let i = start; i < stop; i += step) {
					arr.push(i);
				}
			} else {
				for (let i = start; i > stop; i += step) {
					arr.push(i);
				}
			}
			return arr;
		},

		cycler(...items: any[]) {
			let index: number = -1;
			let current: any = null;
			return {
				get current() {
					return current;
				},
				reset() {
					index = -1;
					current = null;
				},

				next() {
					if (items.length === 0) return null;
					index = (index + 1) % items.length;
					current = items[index];
					return current;
				},
			};
		},

		joiner(sep: string = ',') {
			let first = true;
			return () => {
				const val = first ? '' : sep;
				first = false;
				return val;
			};
		},
	};
}

export function precompileGlobal(templates: any[], opts = {}) {
	let out = '';

	for (let i: number = 0; i < templates.length; i++) {
		const name = JSON.stringify(templates[i].name);
		const template = templates[i].template;

		out +=
			'(function() {' +
			'(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})' +
			'[' +
			name +
			'] = (function() {\n' +
			template +
			'\n})();\n';

		if ('asFunction' in opts && opts.asFunction) {
			out +=
				'return function(ctx, cb) { return nunjucks.render(' +
				name +
				', ctx, cb); }\n';
		}

		out += '})();\n';
	}
	return out;
}

export default globals;
