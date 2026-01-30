import { renderString } from "./index"; // or wherever
import { unquote, p } from "./lib";
import type { GlobalOpts } from "./types";

type Replacement = { start: number; end: number; value: string };

const applyReplacements = (src: string, reps: Replacement[]) => {
  reps.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of reps) out = out.slice(0, r.start) + r.value + out.slice(r.end);
  return out;
};

const getStatementInner = (src: string, startSym: string, endSym: string, start: number, end: number) => {
  const raw = src.slice(start, end);
  return raw.replace(startSym, "").replace(endSym, "").trim();
};

type BlockBody = {
  name: string;
  bodyStart: number;
  bodyEnd: number;
  openStart: number;
  openEnd: number;
  closeStart: number;
  closeEnd: number;
};

// Extract blocks using ONLY spans and simple token split
const extractBlocks = (src: string, spans: any[], opts: GlobalOpts): Map<string, BlockBody> => {
  const blocks = new Map<string, BlockBody>();
  const stack: { name: string; openStart: number; openEnd: number }[] = [];

  for (const it of spans) {
    if (!it.start || !it.end) continue;
    if (it.start.type !== opts.lexer.symbols.statement.start_type) continue;

    const inner = getStatementInner(src, it.start.symbol, it.end.symbol, it.start.i, it.end.i + 1);
    const tokens = inner.split(/\s+/).filter(Boolean);
    const kw = tokens[0];

    if (kw === "block") {
      const name = tokens[1]; // <-- block NAME
      if (!name) continue;
      stack.push({ name, openStart: it.start.i, openEnd: it.end.i + 1 });
      continue;
    }

    if (kw === "endblock") {
      const open = stack.pop();
      if (!open) continue;

      blocks.set(open.name, {
        name: open.name,
        openStart: open.openStart,
        openEnd: open.openEnd,
        closeStart: it.start.i,
        closeEnd: it.end.i + 1,
        bodyStart: open.openEnd,
        bodyEnd: it.start.i,
      });
      continue;
    }
  }

  return blocks;
};

const findExtends = (src: string) => {
  const m = src.match(/{%\s*extends\s+["']([^"']+)["']\s*%}/);
  return m ? m[1] : null;
};

// Merge child into base by block override (supports {{ super() }})
const mergeExtends = (baseSrc: string, childSrc: string, opts: GlobalOpts) => {
  const baseSpans = (opts as any).readByChar(baseSrc, opts);  // or import your readByChar
  const childSpans = (opts as any).readByChar(childSrc, opts);

  const baseBlocks = extractBlocks(baseSrc, baseSpans, opts);
  const childBlocks = extractBlocks(childSrc, childSpans, opts);

  const edits: Replacement[] = [];

  for (const [name, baseB] of baseBlocks.entries()) {
    const childB = childBlocks.get(name);
    if (!childB) continue;

    const baseBody = baseSrc.slice(baseB.bodyStart, baseB.bodyEnd);
    let childBody = childSrc.slice(childB.bodyStart, childB.bodyEnd);

    // minimal super support
    childBody = childBody.replace(/\{\{\s*super\(\)\s*\}\}/g, baseBody);

    edits.push({
      start: baseB.bodyStart,
      end: baseB.bodyEnd,
      value: childBody,
    });
  }

  return applyReplacements(baseSrc, edits);
};

// The pipeline: load, prepass handlers, extends merge, render
export const compileTemplate = (entryName: string, opts: GlobalOpts) => {
  // 1) read entry
  const res = opts.loader.read(entryName);
  if (res.err) throw new Error(res.err);
  let childSrc = res.res;

  // set lexer for entry and collect deps (extends/includes/vars)
  opts.lexer = opts.lex(childSrc, childSrc.length);

  // IMPORTANT: run your statement handlers (extends/set/include) here
  const spansChild = (opts as any).readByChar(childSrc, opts);
  (opts as any).readStack(childSrc, spansChild, opts);

  // 2) extends?
  const baseRel = findExtends(childSrc);
  if (baseRel) {
    const baseName = unquote(baseRel);
    const base = opts.files[baseName] ?? opts.loader.read(baseName).res;

    // Merge blocks
    const merged = mergeExtends(base, childSrc, opts);

    opts.lexer = opts.lex(merged, merged.length);
    return renderString(merged, opts);
  }
  return renderString(childSrc, opts);
};
