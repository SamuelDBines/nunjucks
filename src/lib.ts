import { GlobalOpts } from './types'
const RESET: string = '\x1b[0m';
const WARN: string = '\x1b[33m';
const ERR: string = '\x1b[31m';
const HEADER = '\x1b[95m';
const OKBLUE = '\x1b[94m';
const OKCYAN = '\x1b[96m';
const OKGREEN = '\x1b[92m';
const WARNING = '\x1b[93m';
const FAIL = '\x1b[91m';
const ENDC = '\x1b[0m';
const BOLD = '\x1b[1m';
const UNDERLINE = '\x1b[4m';

export const format_res_string = (msg: unknown, space = '') => {
	const parts = Array.isArray(msg) ? msg : [msg];

	return parts
		.map((i) => {
			if (is_string(msg)) return i;
			if (
				is_number(msg) || is_boolean(msg)
			)
				return String(i);
			if (i instanceof Error) return i.stack ?? i.message;

			const res = maybe_json(msg as string)
			if (res.ok) {
				return res.value;
			}
			return '[Unserializable object]';
		})
		.join(space);
};

type Log = (...msg: any[]) => void;


export const p: {
	log: Log;
	llog: Log;
	warn: Log;
	lwarn: Log;
	debug: Log;
	ldebug: Log;
	err: Log;
	lerr: Log;
	error: Log;
	lerror: Log;
	exit: Log;
} = {
	log: (...msg: any[]) =>
		process.stdout.write(`[INFO] ${format_res_string(msg)}\n`),
	llog: (...msg: any[]) =>
		process.stdout.write(`[INFO] ${format_res_string(msg, '\n')}\n`),
	debug: (...msg: any[]) =>
		process.stdout.write(`${OKBLUE}[DEBUG] ${format_res_string(msg)}${RESET}\n`),
	ldebug: (...msg: any[]) =>
		process.stdout.write(`${OKBLUE}[DEBUG] ${format_res_string(msg, '\n')}${RESET}\n`),
	warn: (...msg: any[]) =>
		process.stdout.write(`${WARN}[WARN] ${format_res_string(msg)}${RESET}\n`),
	lwarn: (...msg: any[]) =>
		process.stdout.write(`${WARN}[WARN] ${format_res_string(msg, '\n')}${RESET}\n`),
	err: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${format_res_string(msg)}${RESET}\n`),
	error: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${format_res_string(msg)}${RESET}\n`),
	lerr: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${format_res_string(msg, '\n')}${RESET}\n`),
	lerror: (...msg: any[]) =>
		process.stderr.write(`${ERR}[ERR ] ${format_res_string(msg, '\n')}${RESET}\n`),
	exit: (...msg: any[]) => {
		process.stderr.write(`${ERR}[ERR ] ${format_res_string(msg)}${RESET}\n`);
		process.exit(1);
	},
};

export function is_keyword_func<T>(list: Record<string, string>) {
  const keys = new Set<T>(Object.keys(list) as T[]);
  return (k: unknown): k is T => keys.has(k as T)
}

export const replace = (str?: string, key: string = '\n', value: string = '<br />' ): string => {
	if(!str) return ''
	return str.replaceAll(key, value)
}

export const is_quoted = (t: string)  =>(t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));


export function unquote(t: string) {
	if(is_quoted) return t.slice(1, -1);
	return t
}

export function remove_between(str: string, start: number, end: number): string {
  return str.slice(0, start) + str.slice(end);
}

export const extract_comments = (str: string)  => str.replace(/\{#[\s\S]*?#\}/g, '');
export const match_comments =  (str: string)  => str.match(/\{#[\s\S]*?#\}/g) ?? [];
export const match_tags = (str: string) =>
  str.match(/\{%\s*[\s\S]*?\s*%\}/g) ?? [];


export const is_callable = (str: string) => {
	const re = /\b([A-Za-z_$][\w$]*)\s*\(([\s\S]*?)\)/g;
	const m = re.exec(str);
	return  m ? { name: m[1], args: m[2].split(',') } : null;
}

export const is_boolean = (src: unknown) => is_string(src) ? src === "true" || src === "false" : typeof src === 'boolean'
export const is_number = (str: unknown) => (str !== null && str !== undefined) ? !isNaN(str as any) : false

type Parsed =
  | { ok: true; value: any }
  | { ok: false; reason: string };

export const maybe_json = (src: unknown): Parsed => {
	const err: Parsed = { ok: false, reason: "not a json literal" }
	if(!is_string(src)) {
		if(typeof src === 'object') return { ok: true, value: src };
		if(Array.isArray(src)) return { ok: true, value: src };
		return err
	}
	const s = (src as string).trim();
	const first = s[0];
  const isCandidate =
    first === "[" || first === "{" 
		// || first === '"' ||
    // first === "t" || first === "f" || first === "n" ||
    // first === "-" || (first >= "0" && first <= "9");
  if (!isCandidate) return err
	try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return err
  }
}
export const is_string = (str: unknown) => (str !== null && str !== undefined) ? typeof str === 'string' && !is_number(str) : false

export const is_array = (src: unknown) => {
	if(Array.isArray(src)) return true
	const arr = maybe_json(src as string)
	if(arr.ok) return Array.isArray(arr.value)
	return false
}

export const is_object = (src: unknown) => {
	if(typeof src === 'object') return true
	const arr = maybe_json(src as string)
	if(arr.ok) return arr.ok
	return false
}

export const is_function = (str: unknown) => typeof str === 'function'

export const parse_var = (src: unknown) => {
	if(is_boolean(src)) return src === "true" || src === true
	if(is_number(src)) return Number(src)
	const json = maybe_json(src)
	if(json.ok) return json.value;
	return src
}

export const format_type = (src: unknown) => {
	if(is_function) return { src, kind: 'function' }
	if(is_number) return { src, kind: 'number' }
	if(is_string) return src
}
 
export const html_escape = (s: string) =>
  s.replaceAll("&", "&amp;")
   .replaceAll("<", "&lt;")
   .replaceAll(">", "&gt;")
   .replaceAll('"', "&quot;")
   .replaceAll("'", "&#39;");

export const pre = (obj: any) =>
  `<pre>${html_escape(JSON.stringify(obj, null, 2))}</pre>`;


// export const first = (...args: string[]) => {
// 	if(isDef)
// 	if(is_string(args) || is_number(args)) {

// 	}

// }

// export const last = (arr: any[] = []) => arr[arr?.length - 1];

// export const lower = (str: string) => normalize(str).toLowerCase();


// --- tests
// defined
// undefined !isDefined
// none
export const _defined = (value: unknown) => (value !== undefined || value !== null) ? true : false
export const _undefined = (value: unknown) => !_defined(value) // Seperation for improvement
export const _none = (value: unknown) => value === null ? true : false

// mapping
// sequence
// iterable
// callable
// sameas <is?>


// divisibleby
// lower
// upper
export const _lower = (...args: any[]) => args.map(i => typeof i === 'string' ? i.toLowerCase() : i) 
export const _upper = (...args: any[]) => args.map(i => typeof i === 'string' ? i.toUpperCase() : i) 
// escaped
// safe