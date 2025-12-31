import path from 'path';
import EventEmitter from 'events';

export class EmitterObj extends EventEmitter {
	constructor(...args: any[]) {
		super(...args);
	}

	get typename() {
		return this.constructor.name;
	}

	static extend(name: any, props: any) {
		if (typeof name === 'object') {
			props = name;
			name = 'anonymous';
		}
		return extendClass(this, name, props);
	}
}

export class Loader extends EmitterObj {
	resolve(from: string, to: string) {
		return path.resolve(path.dirname(from), to);
	}

	isRelative(filename: string) {
		return filename.indexOf('./') === 0 || filename.indexOf('../') === 0;
	}
}

export default {
	EmitterObj,
	Loader,
};
