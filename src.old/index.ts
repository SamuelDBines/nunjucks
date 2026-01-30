import path from "node:path";
import type { Callback, GlobalOpts, LexerType, LexResponse, Lexer, param_action, action_name } from "./types";
import { FileSystemLoader, type Loader } from "./loader";
import { lex_init } from "./lexer";
import { _eval, fns } from "./eval";
import { p } from "./lib";
import { compileTemplate } from "./compiler";

export const LEXER_SYMBOLS = {
  START: "{",
  END: "}",
} as const;

interface IConfigureOptions {
  path?: string;
  dev?: boolean;
  loader: Loader;
  _lexer?: Partial<Lexer>;
  ext?: string;
}

const initConfigureOptions: IConfigureOptions = {
  path: "views",
  dev: true,
  loader: FileSystemLoader,
  ext: ".njk",
};

export type LexerCurr = {
  val: string;
  start: LexerType;
  end?: LexerType;
};

type LexerMap = Record<string, LexerCurr>;

export const readByChar = (str: string, opts: GlobalOpts): LexerCurr[] => {
  const stack: LexerCurr[] = [];
  if (!str) return stack;

  const len = str.length;
  const map: LexerMap = {};
  let row = 0;
  let col = 0;
  let curr: LexerType | null = null;

  for (let i = 0; i < len; i++) {
    const char = str[i];

    if (char === LEXER_SYMBOLS.START) {
      const _lex = opts.lexer.find(i, row, col, false);
      if (!_lex) continue;
      if (curr) throw new Error(`Bad tags col:${col} row:${row}`);
      curr = _lex;
      map[curr.id] = { val: "", start: _lex };
    }

    if (curr && char) map[curr.id].val += char;

    if (char === LEXER_SYMBOLS.END) {
      const _lex = opts.lexer.find(i, row, col, true);
      if (!_lex) continue;
      if (!curr) throw new Error(`Bad tags col:${col} row:${row}`);
      if (curr.until !== _lex.type) p.err("Incorrect syntax", _lex, curr);
      map[curr.id].end = _lex;
      stack.push(map[curr.id]);
      curr = null;
    }

    if (char === "\n") {
      col++;
      row = 0;
    } else {
      row++;
    }
  }

  return stack;
};

export const spanInner = (src: string, it: LexerCurr) => {
  const raw = src.slice(it.start.i, it.end!.i + 1);
  const inner = raw.replace(it.start.symbol, "").replace(it.end!.symbol, "").trim();
  return { raw, inner };
};

type Replacement = { start: number; end: number; value: string };

const build_replacements = (src: string, spans: LexerCurr[], opts: GlobalOpts): Replacement[] => {
  const reps: Replacement[] = [];

  for (const it of spans) {
    if (!it.start || !it.end) continue;
    const { inner } = spanInner(src, it);

    let out = "";

    if (it.start.type === opts.lexer.symbols.expression.start_type) {
      out = String(_eval(inner, opts) ?? "");
    } else if (it.start.type === opts.lexer.symbols.statement.start_type) {
      const res = _eval(inner, opts);
      out = res == null ? "" : String(res);
    } else {
      // comment or unknown
      out = "";
    }

    reps.push({ start: it.start.i, end: it.end.i + 1, value: out });
  }

  return reps;
};

const apply_replacements = (src: string, reps: Replacement[]) => {
  reps.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of reps) out = out.slice(0, r.start) + r.value + out.slice(r.end);
  return out;
};

export const renderString = (src: string, opts: GlobalOpts) => {
  const spans = readByChar(src, opts);
  const reps = build_replacements(src, spans, opts);
  return apply_replacements(src, reps);
};

export function configure(opts: Partial<IConfigureOptions> = {}) {
  const options: IConfigureOptions = { ...initConfigureOptions, ...opts };

  const lex = lex_init({ _lexer: options._lexer }).lex;
  const _loader = options.loader(options.path);

  const _opts: GlobalOpts = {
    loader: _loader,
    lex,
    lexer: {} as LexResponse,
    files: {},
    ctx: {},
    vars: {},
    fns: {} as any,
  };

  _opts.fns = fns(_opts);

  function express(app: any) {
    function View(this: any, _name: string) {
      this.name = _name;
      this.path = _name;

      const ext = path.extname(_name);
      this.ext = ext || options.ext || ".njk";

      if (!ext) this.name = _name + this.ext;
    }

    function renderTemp(name: string, ctx: any, cb: Callback) {
      try {
        const html = compileTemplate(name, ctx, _opts);
        cb(null, html);
      } catch (e: any) {
        cb(e?.message ?? String(e));
      }
    }

    View.prototype.render = function render(this: any, ctx: any, cb: Callback) {
      renderTemp(this.name, ctx, cb);
    };

    app.set("view", View);
    app.set("nunjucksEnv", () => {});
  }

  return { express };
}

export const reset = configure;
