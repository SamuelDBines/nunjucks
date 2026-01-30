#!/usr/bin/env node
/* eslint-disable no-console */

import * as fs from "node:fs";
import * as path from "node:path";

// ----------------- basic tag scanning -----------------
const TAG_RE = /{%\s*([\s\S]*?)\s*%}/g;
const EXTENDS_RE = /{%\s*extends\s+["']([^"']+)["']\s*%}/;

const PAIRS = new Map<string, string>([
  ["block", "endblock"],
  ["for", "endfor"],
  ["if", "endif"],
  ["macro", "endmacro"],
  ["call", "endcall"],
  ["with", "endwith"],
]);

type NodeType =
  | "root"
  | "block"
  | "for"
  | "if"
  | "macro"
  | "call"
  | "with"
  | "then"
  | "elif"
  | "else"
  | string;

type ScopeNode = {
  type: NodeType;
  name: string | null;
  expr: string | null;

  startIndex: number | null; 
  openTagEnd: number | null; 

  closeTagStart: number | null;
  closeTagEnd: number | null;

  bodyStart: number | null; // typically openTagEnd
  bodyEnd: number | null; // set when closing tag is found

  children: ScopeNode[];
};

type MakeNodeProps = {
  type: NodeType;
  name?: string | null;
  expr?: string | null;
  startIndex?: number | null;
  openTagEnd?: number | null;
};

function makeNode({
  type,
  name = null,
  expr = null,
  startIndex = null,
  openTagEnd = null,
}: MakeNodeProps): ScopeNode {
  return {
    type,
    name,
    expr,
    startIndex,
    openTagEnd,
    closeTagStart: null,
    closeTagEnd: null,
    bodyStart: openTagEnd,
    bodyEnd: null,
    children: [],
  };
}

type ParsedTag = { keyword: string; rest: string } | null;

function parseTag(inner: string): ParsedTag {
  const trimmed = inner.trim();
  const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\b([\s\S]*)$/);
  if (!m) return null;
  return { keyword: m[1], rest: (m[2] ?? "").trim() };
}

function extractNameAndExpr(keyword: string, rest: string): { name: string | null; expr: string | null } {
  if (keyword === "block") {
    const name = rest.split(/\s+/)[0] || null;
    return { name, expr: rest || null };
  }
  if (keyword === "macro") {
    const name = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? null;
    return { name, expr: rest || null };
  }
  return { name: null, expr: rest || null };
}

function openTagForClose(closeKeyword: string): string | null {
  for (const [open, close] of PAIRS.entries()) {
    if (close === closeKeyword) return open;
  }
  return null;
}

function parseScopes(template: string): ScopeNode {
  const root = makeNode({ type: "root", name: "(root)", startIndex: 0, openTagEnd: 0 });
  const stack: ScopeNode[] = [root];

  const current = (): ScopeNode => stack[stack.length - 1];

  let match: RegExpExecArray | null;
  // NOTE: TAG_RE is global; exec() maintains state. Reset before use.
  TAG_RE.lastIndex = 0;

  while ((match = TAG_RE.exec(template))) {
    const full = match[0];
    const inner = match[1];
    const tagStart = match.index;
    const tagEnd = tagStart + full.length;

    const t = parseTag(inner);
    if (!t) continue;

    const { keyword, rest } = t;

    const isOpener = PAIRS.has(keyword);
    const isCloser = [...PAIRS.values()].includes(keyword);

    // ---- branches for if ----
    if (keyword === "elif" || keyword === "else") {
      // find nearest 'if' node
      let ifIndex = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].type === "if") {
          ifIndex = i;
          break;
        }
      }
      if (ifIndex === -1) continue;

      // pop everything above that if (the active branch)
      while (stack.length - 1 > ifIndex) {
        const node = stack.pop()!;
        if (node.bodyEnd == null) node.bodyEnd = tagStart;
        node.closeTagStart = tagStart;
        node.closeTagEnd = tagEnd;
      }

      const branch = makeNode({
        type: keyword,
        expr: keyword === "elif" ? (rest || null) : null,
        startIndex: tagStart,
        openTagEnd: tagEnd,
      });

      stack[ifIndex]!.children.push(branch);
      stack.push(branch);
      continue;
    }

    // ---- openers ----
    if (isOpener) {
      const { name, expr } = extractNameAndExpr(keyword, rest);
      const node = makeNode({ type: keyword, name, expr, startIndex: tagStart, openTagEnd: tagEnd });
      current().children.push(node);

      if (keyword === "if") {
        stack.push(node);

        const thenBranch = makeNode({
          type: "then",
          expr: rest || null,
          startIndex: tagStart,
          openTagEnd: tagEnd,
        });
        node.children.push(thenBranch);
        stack.push(thenBranch);
      } else {
        stack.push(node);
      }
      continue;
    }

    // ---- closers ----
    if (isCloser) {
      if (keyword === "endif") {
        // close branch first
        while (stack.length > 1 && stack[stack.length - 1]!.type !== "if") {
          const node = stack.pop()!;
          if (node.bodyEnd == null) node.bodyEnd = tagStart;
          node.closeTagStart = tagStart;
          node.closeTagEnd = tagEnd;
        }
        // close if node
        if (stack.length > 1 && stack[stack.length - 1]!.type === "if") {
          const ifNode = stack.pop()!;
          if (ifNode.bodyEnd == null) ifNode.bodyEnd = tagStart;
          ifNode.closeTagStart = tagStart;
          ifNode.closeTagEnd = tagEnd;
        }
        continue;
      }

      const opener = openTagForClose(keyword);
      if (!opener) continue;

      // find matching opener on stack
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i]!.type === opener) {
          // pop anything above it (tolerance)
          while (stack.length - 1 > i) {
            const node = stack.pop()!;
            if (node.bodyEnd == null) node.bodyEnd = tagStart;
            node.closeTagStart = tagStart;
            node.closeTagEnd = tagEnd;
          }
          const node = stack.pop()!;
          if (node.bodyEnd == null) node.bodyEnd = tagStart;
          node.closeTagStart = tagStart;
          node.closeTagEnd = tagEnd;
          break;
        }
      }
      continue;
    }

    // other tags (set/extends/include/import/etc.) => not a scope node
  }

  // close any unclosed nodes at EOF
  const eof = template.length;
  while (stack.length > 1) {
    const node = stack.pop()!;
    if (node.bodyEnd == null) node.bodyEnd = eof;
    node.closeTagStart = eof;
    node.closeTagEnd = eof;
  }

  return root;
}

function collectBlocks(root: ScopeNode): Map<string, ScopeNode> {
  const out = new Map<string, ScopeNode>();
  const stack: ScopeNode[] = [root];

  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === "block" && n.name) out.set(n.name, n);
    for (const c of n.children) stack.push(c);
  }
  return out;
}

function sliceBody(template: string, node: ScopeNode): string {
  if (node.bodyStart == null || node.bodyEnd == null) return "";
  return template.slice(node.bodyStart, node.bodyEnd);
}

type Edit = { start: number; end: number; replacement: string };

function applyEdits(text: string, edits: Edit[]): string {
  edits.sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  return out;
}

// ----------------- extends resolver -----------------
function findExtends(template: string): string | null {
  const m = template.match(EXTENDS_RE);
  return m ? m[1] : null;
}

type ResolveExtendsOpts = { childPath: string; stripControlTags?: boolean };

export function resolveExtends({ childPath, stripControlTags = true }: ResolveExtendsOpts): string {
  const childDir = path.dirname(childPath);
  const child = fs.readFileSync(childPath, "utf-8");

  const baseRel = findExtends(child);
  if (!baseRel) {
    return stripControlTags ? child.replace(TAG_RE, "") : child;
  }

  const basePath = path.resolve(childDir, baseRel);
  const base = fs.readFileSync(basePath, "utf-8");

  const baseTree = parseScopes(base);
  const childTree = parseScopes(child);

  const baseBlocks = collectBlocks(baseTree);
  const childBlocks = collectBlocks(childTree);

  const edits: Edit[] = [];

  for (const [blockName, baseNode] of baseBlocks.entries()) {
    const override = childBlocks.get(blockName);
    if (!override) continue;

    const baseBody = sliceBody(base, baseNode);
    let overrideBody = sliceBody(child, override);

    // super() support (simple textual replacement)
    overrideBody = overrideBody.replace(/\{\{\s*super\(\)\s*\}\}/g, baseBody);

    edits.push({
      start: baseNode.bodyStart ?? 0,
      end: baseNode.bodyEnd ?? 0,
      replacement: overrideBody,
    });
  }

  let merged = applyEdits(base, edits);

  // Optionally strip all {% ... %} control tags after block merging
  if (stripControlTags) merged = merged.replace(TAG_RE, "");

  return merged;
}

// // ----------------- main -----------------
// (function main() {
//   const input = "./test.njk";
//   const output = "./test.output.html";
//   const treeOut = "./treefull.json";

//   const child = fs.readFileSync(input, "utf-8");
//   const childTree = parseScopes(child);
//   fs.writeFileSync(treeOut, JSON.stringify(childTree, null, 2), "utf-8");

//   const html = resolveExtends({ childPath: input, stripControlTags: true });
//   fs.writeFileSync(output, html, "utf-8");

//   console.log(`Wrote: ${treeOut}`);
//   console.log(`Wrote: ${output}`);
// })();
