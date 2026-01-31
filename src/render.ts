
import type { GlobalOpts, LexerType, LexerCurr } from "./types";
import { spanInner, spanStatements, p, cleanIdent } from "./lib";
import { _eval } from "./eval";
type LexerMap = Record<string, LexerCurr>;

const LEXER_SYMBOLS = {
  START: "{",
  END: "}",
} as const;

const truthy = (v: any) => !!v;

const applySets = (src: string, opts: GlobalOpts) => {
  const spans = readByChar(src, opts).filter(
    (s) => s.start && s.end && s.start.type === opts.lexer.symbols.statement.start_type
  );

  for (const it of spans) {
    const { inner } = spanInner(src, it); // e.g. "set user = null"
    const m = inner.trim().match(/^set\s+([\s\S]+)$/);
  
    if (!m) continue;
    console.log(m, inner)
    // reuse your existing handler if you want, but your handler expects args[0] being "user = null"
    opts.fns.set?.(inner, [{ name: "data", value: m[1] } as any], opts);
  }

  return src;
};

const evalCond = (cond: string, opts: GlobalOpts) => {
  const s = cond.trim();

  const notM = s.match(/^not\s+([\s\S]+)$/);
  if (notM) return !truthy(_eval(notM[1], opts));

  const andParts = s.split(/\s+and\s+/);
  if (andParts.length > 1) {
    for (const part of andParts) {
      if (!truthy(_eval(part, opts))) return false;
    }
    return true;
  }

  const orParts = s.split(/\s+or\s+/);
  if (orParts.length > 1) {
    for (const part of orParts) {
      if (truthy(_eval(part, opts))) return true;
    }
    return false;
  }

  return truthy(_eval(s, opts));
};

const applyIfElse = (src: string, opts: GlobalOpts): string => {
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
        ifEnd: it.end!.i ,
        branches: [
          {
            kind: "if",
            cond: rest || null,
            bodyStart: it.end!.i ,
            bodyEnd: it.end!.i , // will be fixed later
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
        bodyStart: it.end!.i ,
        bodyEnd: it.end!.i , // fixed later
      });
      continue;
    }

    if (kw === "endif") {
      // close last branch
      top.branches[top.branches.length - 1].bodyEnd = it.start.i;

      const ctx = stack.pop()!;
      const endifEnd = it.end!.i ;

      // pick branch
      let chosen = "";
      for (const b of ctx.branches) {
        if (b.kind === "else") {
          chosen = src.slice(b.bodyStart, b.bodyEnd);
          break;
        }
        const cond = b.cond ?? "";
        if (evalCond(cond, opts)) {
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

export const applyForLoops = (src: string, opts: GlobalOpts): string => {
  const spans = readByChar(src, opts).filter(
    (s) => s.start && s.end && s.start.type === opts.lexer.symbols.statement.start_type
  );

  type ForCtx = {
    forStart: number;      // "{% for ... %}" start
    forTagEnd: number;     // right after "%}"
    endforEnd: number;     // right after "{% endfor %}"
    varName: string;
    expr: string;
    bodyStart: number;     // after opener tag
    bodyEnd: number;       // before endfor tag
  };

  const stack: ForCtx[] = [];
  const edits: { start: number; end: number; value: string }[] = [];

  const kwAndRest = (inner: string) => {
    const trimmed = inner.trim();
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\b([\s\S]*)$/);
    if (!m) return { kw: "", rest: "" };
    return { kw: m[1], rest: (m[2] ?? "").trim() };
  };

  const parseFor = (rest: string) => {
    // rest like: "item in items" OR "(k,v) in obj" (we only support "x in expr")
    const m = rest.match(/^([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+)$/);
    if (!m) return null;
    return { varName: m[1], expr: m[2].trim() };
  };

  for (const it of spans) {
    const { inner } = spanInner(src, it);
    const { kw, rest } = kwAndRest(inner);

    if (kw === "for") {
      const parsed = parseFor(rest);
      if (!parsed) continue;

      stack.push({
        forStart: it.start.i,
        forTagEnd: it.end!.i ,
        endforEnd: -1,
        varName: parsed.varName,
        expr: parsed.expr,
        bodyStart: it.end!.i ,
        bodyEnd: it.end!.i , // set later
      });
      continue;
    }

    if (kw === "endfor") {
      const ctx = stack.pop();
      if (!ctx) continue;

      ctx.bodyEnd = it.start.i;
      ctx.endforEnd = it.end!.i ;

      // evaluate iterable
      const iterable = _eval(ctx.expr, opts);

      let arr: any[] = [];
      if (Array.isArray(iterable)) arr = iterable;
      else if (iterable && typeof iterable === "object") arr = Object.values(iterable);
      else if (iterable == null) arr = [];
      else arr = [iterable]; // minimal fallback

      const body = src.slice(ctx.bodyStart, ctx.bodyEnd);

      // expand
      const prev = opts.vars[ctx.varName];
      let out = "";

      for (const item of arr) {
        opts.vars[ctx.varName] = item;

        let chunk = renderString(body, opts);
        chunk = applyForLoops(chunk, opts);
        chunk = applyIfElse(chunk, opts);

        out += chunk;
      }

      if (prev === undefined) delete opts.vars[ctx.varName];
      else opts.vars[ctx.varName] = prev;

      edits.push({ start: ctx.forStart, end: ctx.endforEnd, value: out });
      continue;
    }
  }

  if (!edits.length) return src;

  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.value + out.slice(e.end);
  }
  return out;
};

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
      row++;
      col = 0;
    } else {
      col++;
    }
  }

  return stack;
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
      out = "";
    }

    reps.push({ start: it.start.i, end: it.end.i , value: out });
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
  opts.lexer = opts.lex(src, src.length);
  let out = applySets(src, opts);
  p.debug(out)
  opts.lexer = opts.lex(src, src.length);
  out = applyForLoops(src, opts);
  p.debug(out)
  opts.lexer = opts.lex(out, out.length);
  out = applyIfElse(out, opts);
  p.debug(out)
  opts.lexer = opts.lex(out, out.length);
  const spans = readByChar(out, opts);
  const reps = build_replacements(out, spans, opts);
  return apply_replacements(out, reps)
};