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

const truthy = (v: any) => !!v;

const applyIfElse = (src: string, opts: GlobalOpts): string => {
  // ensure lexer is set for this src
  opts.lexer = opts.lex(src, src.length);

  const spans = readByChar(src, opts).filter(
    (s) => s.start && s.end && s.start.type === opts.lexer.symbols.statement.start_type
  );

  type Branch = { kind: "if" | "elif" | "else"; cond: string | null; bodyStart: number; bodyEnd: number };
  type IfCtx = { ifStart: number; ifEnd: number; branches: Branch[] };

  const stack: IfCtx[] = [];
  const edits: { start: number; end: number; value: string }[] = [];

  const kwAndRest = (inner: string) => {
    const trimmed = inner.trim();
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\b([\s\S]*)$/);
    if (!m) return { kw: "", rest: "" };
    return { kw: m[1], rest: (m[2] ?? "").trim() };
  };

  for (const it of spans) {
    const { inner } = spanInner(src, it);
    const { kw, rest } = kwAndRest(inner);

    if (kw === "if") {
      stack.push({
        ifStart: it.start.i,
        ifEnd: it.end!.i + 1,
        branches: [
          {
            kind: "if",
            cond: rest || null,
            bodyStart: it.end!.i + 1,
            bodyEnd: it.end!.i + 1, // will be fixed later
          },
        ],
      });
      continue;
    }

    if (!stack.length) continue;

    const top = stack[stack.length - 1];

    if (kw === "elif" || kw === "else") {
      // close previous branch body at this tag start
      top.branches[top.branches.length - 1].bodyEnd = it.start.i;

      top.branches.push({
        kind: kw,
        cond: kw === "elif" ? (rest || null) : null,
        bodyStart: it.end!.i + 1,
        bodyEnd: it.end!.i + 1, // fixed later
      });
      continue;
    }

    if (kw === "endif") {
      // close last branch
      top.branches[top.branches.length - 1].bodyEnd = it.start.i;

      const ctx = stack.pop()!;
      const endifEnd = it.end!.i + 1;

      // pick branch
      let chosen = "";
      for (const b of ctx.branches) {
        if (b.kind === "else") {
          chosen = src.slice(b.bodyStart, b.bodyEnd);
          break;
        }
        const cond = b.cond ?? "";
        const res = _eval(cond, opts);
        if (truthy(res)) {
          chosen = src.slice(b.bodyStart, b.bodyEnd);
          break;
        }
      }

      // resolve nested ifs inside the chosen body
      chosen = applyIfElse(chosen, opts);

      edits.push({
        start: ctx.ifStart,
        end: endifEnd,
        value: chosen,
      });

      continue;
    }
  }

  if (!edits.length) return src;

  // apply edits from end -> start so indices stay valid
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.value + out.slice(e.end);
  }

  return out;
};

export const renderString = (src: string, opts: GlobalOpts) => {
  const withIf = applyIfElse(src, opts);
  opts.lexer = opts.lex(withIf, withIf.length);

  const spans = readByChar(withIf, opts);
  const reps = build_replacements(withIf, spans, opts);
  return apply_replacements(withIf, reps);
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
