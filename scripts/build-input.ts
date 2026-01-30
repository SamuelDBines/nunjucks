#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

const SRC_DIR = path.resolve(process.cwd(), "src");
const OUT_FILE = path.resolve(process.cwd(), "chatgpt.input.txt");

const SEP = "\n\n----\n\n";

function isTsFile(p: string): boolean {
  const lower = p.toLowerCase();
  return lower.endsWith(".ts") || lower.endsWith(".tsx");
}

function walkDir(dir: string, out: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const ent of entries) {
    if (ent.isDirectory() && (ent.name === "node_modules" || ent.name === "dist" || ent.name === "build")) {
      continue;
    }

    const full = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      walkDir(full, out);
    } else if (ent.isFile() && isTsFile(full)) {
      out.push(full);
    }
  }

  return out;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`src/ directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = walkDir(SRC_DIR).sort((a, b) => a.localeCompare(b));

  let buf = "";
  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const contents = fs.readFileSync(file, "utf-8");

    buf += `${rel}\n${contents}${SEP}`;
  }

  if (buf.endsWith(SEP)) buf = buf.slice(0, -SEP.length) + "\n";

  fs.writeFileSync(OUT_FILE, buf, "utf-8");
  console.log(`Wrote ${OUT_FILE} (${files.length} files)`);
}

main();
