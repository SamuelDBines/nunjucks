// A simple class system, more documentation to come

type AnyFn = (...args: any[]) => any;
type Ctor<T = object> = abstract new (...args: any[]) => T;
type WithTypename<T> = T & { readonly typename: string };
type ParentThis = { parent?: AnyFn };

function parentWrap<P>(parent: unknown, prop: P): P {
	if (typeof parent !== 'function' || typeof prop !== 'function') return prop;

	return function (this: ParentThis, ...args: any[]) {
		const tmp = this.parent;
		this.parent = parent as AnyFn;
		const res = (prop as AnyFn).apply(this, args);
		this.parent = tmp;
		return res;
	};
}

function extendClass(cls, name, props = {}) {
	Object.keys(props).forEach((k: string) => {
		props[k] = parentWrap(cls.prototype[k], props[k]);
	});

	class subclass extends cls {
		get typename() {
			return name;
		}
	}

	Object.assign(subclass.prototype ?? {}, props);

	return subclass;
}

class Obj {
	constructor(...args) {
		// Unfortunately necessary for backwards compatibility
		this.init(...args);
	}

	init() {}

	get typename() {
		return this.constructor.name;
	}

	static extend(name, props) {
		if (typeof name === 'object') {
			props = name;
			name = 'anonymous';
		}
		return extendClass(this, name, props);
	}
}

module.exports = { Obj };
