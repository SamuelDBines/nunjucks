import { GlobalOpts } from '../types';
const applyForLoops = (src: string, opts: GlobalOpts): string => {
  opts.lexer = opts.lex(src, src.length);

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
        forTagEnd: it.end!.i + 1,
        endforEnd: -1,
        varName: parsed.varName,
        expr: parsed.expr,
        bodyStart: it.end!.i + 1,
        bodyEnd: it.end!.i + 1, // set later
      });
      continue;
    }

    if (kw === "endfor") {
      const ctx = stack.pop();
      if (!ctx) continue;

      ctx.bodyEnd = it.start.i;
      ctx.endforEnd = it.end!.i + 1;

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

        // allow nested fors/ifs inside loop body
        let chunk = body;
        chunk = applyForLoops(chunk, opts);
        // chunk = applyIfElse(chunk, opts);

        out += chunk;
      }

      // restore var
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