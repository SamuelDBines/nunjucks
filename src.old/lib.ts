const RESET = "\x1b[0m";
const WARN = "\x1b[33m";
const ERR = "\x1b[31m";
const OKBLUE = "\x1b[94m";

type Log = (...msg: any[]) => void;

const fmt = (msg: unknown[]) => msg.map(String).join(" ");

export const p: {
  log: Log;
  warn: Log;
  debug: Log;
  err: Log;
  exit: Log;
} = {
  log: (...msg) => process.stdout.write(`[INFO] ${fmt(msg)}\n`),
  debug: (...msg) => process.stdout.write(`${OKBLUE}[DEBUG] ${fmt(msg)}${RESET}\n`),
  warn: (...msg) => process.stdout.write(`${WARN}[WARN] ${fmt(msg)}${RESET}\n`),
  err: (...msg) => process.stderr.write(`${ERR}[ERR ] ${fmt(msg)}${RESET}\n`),
  exit: (...msg) => {
    process.stderr.write(`${ERR}[ERR ] ${fmt(msg)}${RESET}\n`);
    process.exit(1);
  },
};

export function is_keyword_func<T extends string>(list: Record<string, string>) {
  const keys = new Set<T>(Object.keys(list) as T[]);
  return (k: unknown): k is T => keys.has(k as T);
}

export const is_quoted = (t: string) =>
  (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));

export function unquote(t: string) {
  return is_quoted(t) ? t.slice(1, -1) : t;
}

export const extract_comments = (str: string) => str.replace(/\{#[\s\S]*?#\}/g, "");

export const is_callable = (str: string) => {
  const re = /\b([A-Za-z_$][\w$]*)\s*\(([\s\S]*?)\)/;
  const m = re.exec(str);
  return m ? { name: m[1], args: (m[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean) } : null;
};

export const is_boolean = (src: unknown) =>
  typeof src === "boolean" || (typeof src === "string" && (src === "true" || src === "false"));

export const is_number = (src: unknown) =>
  src !== null && src !== undefined && !Array.isArray(src) && !isNaN(src as any);

export const parse_var = (src: unknown) => {
  if (is_boolean(src)) return src === "true" || src === true;
  if (is_number(src)) return Number(src);
  // extremely minimal JSON literal support
  if (typeof src === "string") {
    const s = src.trim();
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        return JSON.parse(s);
      } catch {}
    }
  }
  return src;
};

export const _lower = (...args: any[]) => args.map((i) => (typeof i === "string" ? i.toLowerCase() : i));
export const _upper = (...args: any[]) => args.map((i) => (typeof i === "string" ? i.toUpperCase() : i));
