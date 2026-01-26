import path from 'node:path'
import fs from 'node:fs'
import { p, is_quoted, unquote, remove_between, match_tags, is_callable } from './lib'
import { Loader, FileSystemLoader } from './loader'
import { LexerType, Callback, GlobalOpts, Lexer, action_name, param_action, LexResponse } from './types'
import { lex_init } from './lexer'
import { keywords, is_keyword, _eval, fns} from './eval'

interface IConfigureOptions {
	path?: string;
	outpath?: string;
	throwOnUndefined?: boolean;
	dev?: boolean;
	autoescape?: boolean;
	watch?: boolean;
	cache?: boolean;
	loader: Loader;
	_lexer?: Partial<Lexer>
	ext?: string;
}

const initConfigureOptions: IConfigureOptions = {
	path: 'views',
	outpath: 'compiled',
	throwOnUndefined: false,
	watch: false,
	dev: true,
	autoescape: true,
	cache: true,
	loader: FileSystemLoader,
	ext: '.njk'
};

export const LEXER_SYMBOLS = {
  START: '{',
	END: '}',
	BLOCK_START :'{%',
	BLOCK_END : '%}',
	VARIABLE_START : '{{',
	VARIABLE_END : '}}',
	COMMENT_START : '{#',
	COMMENT_END : '#}',
	SINGLE_QUOTE : "'",
	DOUBLE_QUOTE : '"'
} as const


// --- control
// if
// elif
// else
// endif

// for
// endfor

// set
// block
// endblock

// extends
// include
// import
// from

// macro
// endmacro
// call
// endcall

// raw
// endraw

// with
// endwith

// autoescape
// endautoescape

// trans
// pluralize
// endtrans



// --- lib
// abs
// attr
// batch
// capitalize
// center
// default
// dictsort
// escape
// first
// float
// groupby
// indent
// int
// join
// last
// length
// list
// lower
// map
// max
// min
// random
// replace
// reverse
// round
// safe
// select
// slice
// sort
// string
// striptags
// sum
// title
// trim
// truncate
// upper
// urlencode


// --- Has only children no siblings max 2
// for <condition> -> endfor 
// block -> endblock
// macro -> endmacro
// call -> endcall
// with -> endwith
// autoescape -> endautoescape
// filter <condition> -> endfilter
// --- Has children and siblings
// if <condition> -> elif <condition> -> else -> endif

const block_conds = {
	'for': 'endfor',
	'block': 'endblock',
	'call': 'endcall',
	'macro': 'endmacro',
	'with' : 'endwidth',
	'autoescape': 'endautoescape',
	'filter': 'endfilter'
} as const

type block_cond_type = keyof typeof block_conds

// --- comparrasion
// ==
// !=
// <
// >
// <=
// >=


// set

// extends
// include
// import
// from

// filter
// with
// autoescape
// raw


export type LexerSymbolKey = keyof typeof LEXER_SYMBOLS;
export type LexerSymbolMap = typeof LEXER_SYMBOLS
export type Tags = LexerSymbolMap & Record<string, string>;

type LexerCurr = {
	val: string
	start: LexerType;
	end?: LexerType
	children?: LexerCurr[]
	parent?: string | null
}
type LexerMap = Record<string, LexerCurr>

type ReformatBreaks = {
	break: string;
	replace: string;
}
const initReformatBreaks: ReformatBreaks = {
	break:  '\n',
	replace:'<br />'
}

const reformatBreaks = (str?: string, opts: Partial<ReformatBreaks> = {}): string => {
	const options = { ...initReformatBreaks, opts };
	if(!str) return ''
	return str.replaceAll(options.break, options.replace)
}

const readByChar = (str: string, opts: GlobalOpts): LexerCurr[]  => {
	const stack: LexerCurr[] = []
	if(!str) return stack
	const len = str.length;
	const map: LexerMap = {}
	let row = 0;
	let col = 0
	let curr: LexerType | null = null
	
	for(let i = 0; i < len; i++) {
		const char = str[i];
		
		if(char === LEXER_SYMBOLS.START) {
			const _lex = opts.lexer.find(i, row, col, false)
			if(!_lex) continue 
			if(curr) {
				throw `The tags are incorrect col: ${col} row:${row} - value: ${map[curr.id].val} symbol: ${curr.symbol} `
			} 
			curr = _lex
			map[curr.id] = {
				val: '',
				start: _lex
			}
		}
		if(curr && char) {
			map[curr.id].val += char
		}
		if(char === LEXER_SYMBOLS.END) {
			const _lex = opts.lexer.find(i, row, col, true)
			if(!_lex) continue 
			if(!curr) {
				throw `The tags are incorrect col: ${col} row:${row} - value: ${map[curr.id].val} symbol: ${curr.symbol} `
			}
			if(curr?.until !== _lex.type)  p.err(`Incorrect syntax - col: ${col} row:${row}`, _lex, curr);
			map[curr.id].end = _lex
			stack.push(map[curr.id])
			curr = null			
		}
		if(char === '\n') {
			col++ 
			row = 0
		} else {
			row++;
		}
	}
	return stack;
}

type TreeNode =
  | {
      kind: "root";
      id: "root";
      children: TreeNode[];
      extends?: string;
      includes: string[];
    }
  | {
      kind: "block";
      id: string;          
      name: string;     
      // start: LexerType;
      // end?: LexerType;
			endname?: string;
      children: TreeNode[];
    }
  | {
      kind: "tag";
      id: string;
      tag: string;
      // raw: string;
      // start: LexerType;
      // end: LexerType;
    };


export function buildTree(str: string, stackSpans: LexerCurr[],  _opts: GlobalOpts) {
  const root: TreeNode = {
    kind: "root",
    id: "root",
    children: [],
    includes: [],
  };

  const open: TreeNode[] = [root]; // stack of open nodes (root + blocks)

  const current = () => open[open.length - 1] as any;

  for (const it of stackSpans) {
    if (!it.start || !it.end) continue;
    if (it.start.type !== "block_start" && it.start.type !== "block_end") {
      continue;
    }
		const tokens = str.slice(it.start.i, it.end.i).split(' ');



    const kw = tokens[1]; // "extends" / "block" / "endblock" / "include" ...
    if (!kw) continue;

    if (kw === "extends") {
      root.extends = unquote(tokens[2]); 
      continue;
    }
		if (kw === "set") {
      continue;
    }
    if (kw === "include") {
      root.includes.push(tokens[2]);
      continue;
    }

    if (kw === "block" || kw === "for" || kw === "with" || kw === "macro" || kw === 'call' ) {
      const name = tokens[1];
      if (!name) throw new Error(`block missing name at ${it.start.id}`);

      const node: TreeNode = {
        kind: "block",
        id: it.start.id,
        name,
        // start: it.start,
        children: [],
      };

      // attach to current parent
      (current().children as TreeNode[]).push(node);

      // push as new parent
      open.push(node);
      continue;
    }

    if (kw.includes("end")) {
      const top = open[open.length - 1];
      if (!top || top.kind !== "block") {
        throw new Error(`endblock without open block at ${it.start.id}`);
      }
      (top as any).end = it.end;
			(top as any).endname = kw;
      open.pop();
      continue;
    }

    // other tags if you want to keep them in tree
    const tagNode: TreeNode = {
      kind: "tag",
      id: it.start.id,
      tag: kw,
			// inner: 'any',
      // start: it.start,
      // end: it.end,
    };
    (current().children as TreeNode[]).push(tagNode);
  }

  if (open.length !== 1) {
    const unclosed = open.slice(1).map((n: any) => n.name ?? n.id);
    throw new Error(`Unclosed blocks: ${unclosed.join(", ")}`);
  }

  return root;
}

const format_actions = (str: string) => {
  const arr =  str.split(' ').filter(i => i && i);
  const actions: param_action[] = []
  const push_action = (name: action_name, value:string, args: string[] = [], callable: boolean = false) => actions.push({ name, value, callable, args })
  for(var i in arr) {
    const value = arr[i]
    if(value === '|') {
      push_action('pipe', value)
      continue
    }
    if(is_keyword(value)) {
      push_action('keyword', value)
      continue
    }
    const call = is_callable(value)
    if(call) {
      if(is_keyword(call.name)) 
        push_action('keyword', call.name, call.args, true)
      continue
    }
    push_action('data', value)
  }
  return actions;
}

type Replacement = {
  start: number;
  end: number;
  value: string;
};

const spanInner = (src: string, it: LexerCurr) => {
  const raw = src.slice(it.start.i, it.end.i + 1);
  const inner = raw
    .replace(it.start.symbol, "")
    .replace(it.end!.symbol, "")
    .trim();
  return { raw, inner };
};


const build_replacements = (src: string, spans: LexerCurr[], opts: GlobalOpts): Replacement[] => {
  const reps: Replacement[] = [];
  for (const it of spans) {
    if (!it.start || !it.end) continue;

    const { inner } = spanInner(src, it);

    // evaluate based on type
    // - statements: "{% ... %}" (set, include, block, add, etc)
    // - prints: "{{ ... }}" (output expression)
    // - comments: "{# ... #}" (remove)
    let out: any = "";

    if (it.start.type === opts.lexer.symbols.expression.start_type) {
      out = String(_eval(inner, opts) ?? "");
    } else if (it.start.type === opts.lexer.symbols.statement.start_type) {
      const res = _eval(inner, opts);
      out = res == null ? "" : String(res);
    } else {
      continue;
    }
    reps.push({
      start: it.start.i,
      end: it.end.i + 1,
      value: out,
    });
  }

  return reps;
};

const apply_replacements = (src: string, reps: Replacement[]) => {
  reps.sort((a, b) => b.start - a.start);

  let out = src;
  for (const r of reps) {
    out = out.slice(0, r.start) + r.value + out.slice(r.end);
  }
  return out;
};

export const renderString = (src: string, opts: GlobalOpts) => {
  const spans = readByChar(src, opts);
  for (const it of spans) {
    if (!it.start || !it.end) continue;
    if (it.start.type !== opts.lexer.symbols.statement.start_type) continue;

    const { inner } = spanInner(src, it);
    // const actions = format_actions(inner);
    // const firstKw = actions.find(a => a.name === "keyword")?.value;
    // if (firstKw === "set") {
		// 	p.log('SET is?', inner)
    //   const handler = opts.fns.set;
    //   handler?.(inner, actions, opts);
    // }
  }
  const reps = build_replacements(src, spans, opts);
  return apply_replacements(src, reps);
};

const readStack = (str: string, spans: LexerCurr[] = [], _opts: GlobalOpts): LexerCurr[]  => {
	if(!str) return []
	for(const it of spans) {
		if(!it.start || !it.end) continue;
		// if (it.start.type !== "block_start" && it.start.type !== "block_end") continue;
		const inner = str.slice(it.start.i, it.end.i+1).replace(it.start.symbol, '').replace(it.end.symbol, '').trim()
		const actions = format_actions(inner)
		const firstKw = actions.find(a => a.name === 'keyword')?.value;
		if (!firstKw) continue;

		p.debug('firstkw', firstKw)

		const handler = _opts.fns[firstKw];
    if (!handler) continue;

    handler(inner, actions, _opts);
	}
	return spans;
}

export function configure(
	opts: Partial<IConfigureOptions> = {}
) {
	const options: IConfigureOptions = { ...initConfigureOptions, ...opts }

	const lex = lex_init({ _lexer: options._lexer }).lex
	const _loader = options.loader(options.path)
	const _opts = {
		loader: _loader,
		lex,
		lexer: {} as LexResponse,
		files: {},
		ctx: {},
		vars: {},
		fns: {}
	}
	_opts.fns = fns(_opts)
	function express(app: any) {
		function View(_name: string) {
			this.name = _name;
			this.path = _name;

			this.ext = options.ext || path.extname(_name);
			p.err(_name, this.ext);
			const respath = path.resolve(this.path)
			if (!this.ext) {
				this.ext = '.html';
				this.name = _name + this.ext;
				p.err(_name, path.extname(_name));
			}
			p.log('Name is', _name)
		}

		function renderTemp(name:string, ctx: any, cb: Callback) {
			const result = _opts.loader.read(name)
			const str = result.err || result.res
			_opts.files[name] = str
			_opts.ctx = ctx;
			_opts.lexer = _opts.lex(str, str.length)
			const html = renderString(str, _opts);
			// const stack = readByChar(str, _opts)
			// readStack(str, stack, _opts)
		
			// const tree = buildTree(str, stack, _opts)
			// p.warn(tree)
			// p.warn(_opts)
			fs.writeFileSync('./src/index.context.json', JSON.stringify(_opts, null, 2))
			// fs.writeFileSync('./src/index.stack.json', JSON.stringify(stack, null, 2))
			// p.error('Matched tags', match_tags(str))
			const _html = reformatBreaks(html)
			const dev = options.dev ? `<div style="display:flex;">
				<div>${_html}</div>
				<div>${reformatBreaks(str)}</div>
			</div>` : _html
			cb(result.err, dev)
		}	


		View.prototype.render = function render(
			ctx: any,
			cb: Callback
		) {
			p.log('Trying to render', ctx, this.name, cb);
			// cb(null, ctx)
			renderTemp(this.name, opts, cb);
		};

		app.set('view', View);
		app.set('nunjucksEnv', () => {
			p.log('Here then')
		});
	}

	return {
		express
	}
}



export const reset = configure;

// export const compile = (
// 	src: any,
// 	env: Environment,
// 	path: any,
// 	eagerCompile: any
// ) => {
// 	if (!e) {
// 		configure();
// 	}
// 	return new Template(src, env, path, eagerCompile);
// };
// export const render = (src: string, ctx: Context, cb: Callback) => {
// 	if (!e) {
// 		configure();
// 	}
// 	return e.render(src, ctx, cb);
// };
// export const renderString = (src: string, ctx: Context, cb: Callback) => {
// 	if (!e) {
// 		configure();
// 	}
// 	return e.renderString(src, ctx, cb);
// };
