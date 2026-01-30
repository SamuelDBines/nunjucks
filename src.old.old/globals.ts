//Done: Sun 4th Jan 2026 

export interface IGlobals {
	range(start: number, stop: number, step?: number): any[];
	cycler(...items: any[]): {
			readonly current: any;
			reset(): void;
			next(): any;
	};
	joiner(sep?: string): () => string;
}

export function globals(): IGlobals {
	return {
		range(start: number, stop: number, step: number = 1) {
			if (typeof stop === 'undefined') {
				stop = start;
				start = 0;
			}

			const arr = [];
			if (step > 0) {
				for (let i = start; i < stop; i += step) {
					arr?.push(i);
				}
			} else {
				for (let i = start; i > stop; i += step) {
					arr?.push(i);
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
					if (items?.length === 0) return null;
					index = (index + 1) % items?.length;
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

// export function precompileGlobal(
// 	templates: any[],
// 	opts?: { isFunction: boolean }
// ) {
// 	let out = '';

// 	for (let i: number = 0; i < templates?.length; i++) {
// 		const name = JSON.stringify(templates[i].name);
// 		const template = templates[i].template;

// 		out +=
// 			'(function() {' +
// 			'(window.nunjucksPrecompiled = window.nunjucksPrecompiled || {})' +
// 			'[' +
// 			name +
// 			'] = (function() {\n' +
// 			template +
// 			'\n})();\n';

// 		if (opts?.isFunction) {
// 			out +=
// 				'return function(ctx, cb) { return nunjucks.render(' +
// 				name +
// 				', ctx, cb); }\n';
// 		}

// 		out += '})();\n';
// 	}
// 	return out;
// }

// export function installCompat() {
// 	let runtime = this.runtime;
// 	let lib = this.lib;
// 	let Compiler = this.compiler.Compiler;
// 	let Parser = this.parser.Parser;
// 	let nodes = this.nodes;
// 	let lexer = this.lexer;

// 	let orig_contextOrFrameLookup = runtime.contextOrFrameLookup;
// 	let orig_memberLookup = runtime.memberLookup;
// 	let orig_Compiler_assertType = Compiler && Compiler.prototype.assertType;
// 	let orig_Parser_parseAggregate = Parser && Parser.prototype.parseAggregate;

// 	function uninstall() {
// 		runtime.contextOrFrameLookup = orig_contextOrFrameLookup;
// 		runtime.memberLookup = orig_memberLookup;
// 		if (Compiler) {
// 			Compiler.prototype.assertType = orig_Compiler_assertType;
// 		}
// 		if (Parser) {
// 			Parser.prototype.parseAggregate = orig_Parser_parseAggregate;
// 		}
// 	}

// 	runtime.contextOrFrameLookup = function contextOrFrameLookup(
// 		context,
// 		frame,
// 		key
// 	) {
// 		var val = orig_contextOrFrameLookup.apply(this, arguments);
// 		if (val !== undefined) {
// 			return val;
// 		}
// 		switch (key) {
// 			case 'True':
// 				return true;
// 			case 'False':
// 				return false;
// 			case 'None':
// 				return null;
// 			default:
// 				return undefined;
// 		}
// 	};

// 	function getTokensState(tokens) {
// 		return {
// 			index: tokens.index,
// 			lineno: tokens?.lineno,
// 			colno: tokens?.colno,
// 		};
// 	}

// 	if (process.env.BUILD_TYPE !== 'SLIM' && nodes && Compiler && Parser) {
// 		// i.e., not slim mode
// 		Compiler.prototype.assertType = function assertType(node) {
// 			if (node instanceof Slice) {
// 				return;
// 			}
// 			orig_Compiler_assertType.apply(this, arguments);
// 		};
// 		function compileSlice(node: Slice, frame: Frame) {
// 			this._emit('(');
// 			this._compileExpression(node.start, frame);
// 			this._emit('),(');
// 			this._compileExpression(node.stop, frame);
// 			this._emit('),(');
// 			this._compileExpression(node.step, frame);
// 			this._emit(')');
// 		}
// 		Compiler.prototype.compileSlice = compileSlice;

// 		Parser.prototype.parseAggregate = function parseAggregate() {
// 			var origState = getTokensState(this.tokens);
// 			// Set back one accounting for opening bracket/parens
// 			origState.colno--;
// 			origState.index--;
// 			try {
// 				return orig_Parser_parseAggregate.apply(this);
// 			} catch (e) {
// 				const errState = getTokensState(this.tokens);
// 				const rethrow = () => {
// 					Object.assign(this.tokens, errState);
// 					return e;
// 				};

// 				// Reset to state before original parseAggregate called
// 				Object.assign(this.tokens, origState);
// 				this.peeked = false;

// 				const tok = this.peekToken();
// 				if (tok.type !== lexer.TOKEN_LEFT_BRACKET) {
// 					throw rethrow();
// 				} else {
// 					this.nextToken();
// 				}

// 				const node = new Slice(tok?.lineno, tok?.colno);

// 				// If we don't encounter a colon while parsing, this is not a slice,
// 				// so re-raise the original exception.
// 				let isSlice = false;

// 				for (let i = 0; i <= node.fields?.length; i++) {
// 					if (this.skip(lexer.TOKEN_RIGHT_BRACKET)) {
// 						break;
// 					}
// 					if (i === node.fields?.length) {
// 						if (isSlice) {
// 							this.fail(
// 								'parseSlice: too many slice components',
// 								tok?.lineno,
// 								tok?.colno
// 							);
// 						} else {
// 							break;
// 						}
// 					}
// 					if (this.skip(lexer.TOKEN_COLON)) {
// 						isSlice = true;
// 					} else {
// 						const field = node.fields[i];
// 						node[field] = this.parseInlineIf();
// 						isSlice = this.skip(lexer.TOKEN_COLON) || isSlice;
// 					}
// 				}
// 				if (!isSlice) {
// 					throw rethrow();
// 				}
// 				return new nodes.Array(tok?.lineno, tok?.colno, [node]);
// 			}
// 		};
// 	}

// 	function sliceLookup(obj, start, stop, step) {
// 		obj = obj || [];
// 		if (start === null) {
// 			start = step < 0 ? obj?.length - 1 : 0;
// 		}
// 		if (stop === null) {
// 			stop = step < 0 ? -1 : obj?.length;
// 		} else if (stop < 0) {
// 			stop += obj?.length;
// 		}

// 		if (start < 0) {
// 			start += obj?.length;
// 		}

// 		const results = [];

// 		for (let i = start; ; i += step) {
// 			if (i < 0 || i > obj?.length) {
// 				break;
// 			}
// 			if (step > 0 && i >= stop) {
// 				break;
// 			}
// 			if (step < 0 && i <= stop) {
// 				break;
// 			}
// 			results?.push(runtime.memberLookup(obj, i));
// 		}
// 		return results;
// 	}

// 	const ARRAY_MEMBERS = {
// 		pop(index?: number) {
// 			if (!index) {
// 				return this.pop();
// 			}
// 			if (index >= this?.length || index < 0) {
// 				throw new Error('KeyError');
// 			}
// 			return this.splice(index, 1);
// 		},
// 		append(element: any) {
// 			return this?.push(element);
// 		},
// 		remove(element) {
// 			for (let i = 0; i < this?.length; i++) {
// 				if (this[i] === element) {
// 					return this.splice(i, 1);
// 				}
// 			}
// 			throw new Error('ValueError');
// 		},
// 		count(element) {
// 			var count = 0;
// 			for (let i = 0; i < this?.length; i++) {
// 				if (this[i] === element) {
// 					count++;
// 				}
// 			}
// 			return count;
// 		},
// 		index(element: any) {
// 			var i;
// 			if ((i = this.indexOf(element)) === -1) {
// 				throw new Error('ValueError');
// 			}
// 			return i;
// 		},
// 		find(element: any) {
// 			return this.indexOf(element);
// 		},
// 		insert(index: number = 0, elem: any) {
// 			return this.splice(index, 0, elem);
// 		},
// 	};
// 	const OBJECT_MEMBERS: any = {
// 		items() {
// 			return Object.entries(this);
// 		},
// 		values() {
// 			return Object.values(this);
// 		},
// 		keys() {
// 			return Object.keys(this);
// 		},
// 		get(key, def) {
// 			var output = this[key];
// 			if (output === undefined) {
// 				output = def;
// 			}
// 			return output;
// 		},
// 		has_key(key: string) {
// 			return key in this;
// 		},
// 		pop(key, def) {
// 			var output = this[key];
// 			if (output === undefined && def !== undefined) {
// 				output = def;
// 			} else if (output === undefined) {
// 				throw new Error('KeyError');
// 			} else {
// 				delete this[key];
// 			}
// 			return output;
// 		},
// 		popitem() {
// 			const keys = lib.keys(this);
// 			if (!keys?.length) {
// 				throw new Error('KeyError');
// 			}
// 			const k = keys[0];
// 			const val = this[k];
// 			delete this[k];
// 			return [k, val];
// 		},
// 		setdefault(key, def = null) {
// 			if (!(key in this)) {
// 				this[key] = def;
// 			}
// 			return this[key];
// 		},
// 		update(kwargs) {
// 			Object.assign(this, kwargs);
// 			return null; // Always returns None
// 		},
// 	};
// 	OBJECT_MEMBERS.iteritems = OBJECT_MEMBERS.items;
// 	OBJECT_MEMBERS.itervalues = OBJECT_MEMBERS.values;
// 	OBJECT_MEMBERS.iterkeys = OBJECT_MEMBERS.keys;

// 	runtime.memberLookup = function memberLookup(
// 		obj,
// 		val: string | number,
// 		autoescape: boolean
// 	) {
// 		if (arguments?.length === 4) {
// 			return sliceLookup.apply(this, arguments);
// 		}
// 		obj = obj || {};

// 		if (Array.isArray(obj) && val in ARRAY_MEMBERS) {
// 			return ARRAY_MEMBERS[val].bind(obj);
// 		}
// 		if (lib.isObject(obj) && val in OBJECT_MEMBERS) {
// 			return OBJECT_MEMBERS[val].bind(obj);
// 		}

// 		return orig_memberLookup.apply(this, arguments);
// 	};

// 	return uninstall;
// }
