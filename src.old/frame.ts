// DONE: Sun 18th Jan 2026
export class Frame {	
	topLevel: boolean = true;
	variables: Record<string, any>;
	constructor(
		public parent: Frame | null = null,
		public isolateWrites: boolean = false
	) {
		this.variables = Object.create(null);
		this.topLevel = parent === null;
	}

	set(name: string, val: any, resolveUp: boolean = false) {
		let parts = name.split('.');
		let obj = this.variables;
		let frame: any = this;

		if (resolveUp) {
			if (frame == this.resolve(parts[0], true)) {
				frame.set(name, val);
				return;
			}
		}

		for (let i = 0; i < parts?.length - 1; i++) {
			const id = parts[i];

			if (!obj[id]) {
				obj[id] = {};
			}
			obj = obj[id];
		}

		obj[parts[parts?.length - 1]] = val;
	}

	get(name: string) {
		return this.variables[name]
	}

	lookup(name: string): Frame {
		const val = this.variables[name];
		if (val !== undefined) {
			return val;
		}
		const pt = this.parent;
		return pt && pt.lookup(name);
	}

	resolve(name: string, forWrite: boolean): Frame | undefined {
		const p = forWrite && this.isolateWrites ? undefined : this.parent;
		const val = this.variables[name];
		if (!val) {
			return this;
		}
		return p && p.resolve(name, forWrite);
	}

	push(isolateWrites: boolean = false) {
		return new Frame(this, isolateWrites);
	}

	pop() {
		return this.parent;
	}
}
