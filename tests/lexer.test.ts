import { describe, it, expect } from 'vitest';

import {
	lex,
	// token types
	TOKEN_DATA,
	TOKEN_BLOCK_START,
	TOKEN_BLOCK_END,
	TOKEN_VARIABLE_START,
	TOKEN_VARIABLE_END,
	TOKEN_COMMENT,
	TOKEN_STRING,
	TOKEN_WHITESPACE,
	TOKEN_INT,
	TOKEN_FLOAT,
	TOKEN_BOOLEAN,
	TOKEN_NONE,
	TOKEN_SYMBOL,
	TOKEN_LEFT_PAREN,
	TOKEN_RIGHT_PAREN,
	TOKEN_LEFT_BRACKET,
	TOKEN_RIGHT_BRACKET,
	TOKEN_LEFT_CURLY,
	TOKEN_RIGHT_CURLY,
	TOKEN_COMMA,
	TOKEN_COLON,
	TOKEN_TILDE,
	TOKEN_PIPE,
	TOKEN_OPERATOR,
	TOKEN_REGEX,
	// tag strings (optional checks)
	BLOCK_START,
	BLOCK_END,
	VARIABLE_START,
	VARIABLE_END,
	COMMENT_START,
	COMMENT_END,
} from '../nunjucks/src/lexer';

type Tok = { type: string; value: any; lineno: number; colno: number };

function allTokens(t: { nextToken(): Tok | null }) {
	const out: Tok[] = [];
	for (;;) {
		const tok = t.nextToken();
		if (!tok) break;
		out.push(tok);
	}
	return out;
}

describe('lexer basic tokenization', () => {
	it('emits DATA outside of tags', () => {
		const t = lex('hello world', {});
		const toks = allTokens(t);

		expect(toks).toHaveLength(1);
		expect(toks[0].type).toBe(TOKEN_DATA);
		expect(toks[0].value).toBe('hello world');
		expect(toks[0].lineno).toBe(0);
		expect(toks[0].colno).toBe(0);
	});

	it('tokenizes a variable tag start/end and symbol inside', () => {
		const t = lex('Hi {{ name }}!', {});
		const toks = allTokens(t);

		expect(toks.map((x) => x.type)).toEqual([
			TOKEN_DATA,
			TOKEN_VARIABLE_START,
			TOKEN_WHITESPACE,
			TOKEN_SYMBOL,
			TOKEN_WHITESPACE,
			TOKEN_VARIABLE_END,
			TOKEN_DATA,
		]);

		expect(toks[0].value).toBe('Hi ');
		expect(toks[1].value).toBe(VARIABLE_START);
		expect(toks[3].value).toBe('name');
		expect(toks[5].value).toBe(VARIABLE_END);
		expect(toks[6].value).toBe('!');
	});

	it('tokenizes a block tag start/end and symbols inside', () => {
		const t = lex('{% if ok %}YES{% endif %}', {});
		const toks = allTokens(t);

		expect(toks.map((x) => x.type)).toEqual([
			TOKEN_BLOCK_START,
			TOKEN_WHITESPACE,
			TOKEN_SYMBOL,
			TOKEN_WHITESPACE,
			TOKEN_SYMBOL,
			TOKEN_WHITESPACE,
			TOKEN_BLOCK_END,
			TOKEN_DATA,
			TOKEN_BLOCK_START,
			TOKEN_WHITESPACE,
			TOKEN_SYMBOL,
			TOKEN_WHITESPACE,
			TOKEN_BLOCK_END,
		]);

		expect(toks[0].value).toBe(BLOCK_START);
		expect(toks[6].value).toBe(BLOCK_END);
		expect(toks[7].value).toBe('YES');
	});

	it('tokenizes comments as TOKEN_COMMENT and does not enter code', () => {
		const t = lex('a{# hi #}b', {});
		const toks = allTokens(t);

		expect(toks.map((x) => x.type)).toEqual([
			TOKEN_DATA,
			TOKEN_COMMENT,
			TOKEN_DATA,
		]);
		expect(toks[0].value).toBe('a');
		expect(toks[1].value).toBe(COMMENT_START + ' hi ' + COMMENT_END);
		expect(toks[2].value).toBe('b');
	});

	it('throws on unexpected end of comment', () => {
		const t = lex('a{# no end', {});
		expect(() => allTokens(t)).toThrow(/expected end of comment/i);
	});

	it('throws on unexpected end-of-comment when not in comment', () => {
		const t = lex('oops #}', {});
		expect(() => allTokens(t)).toThrow(/unexpected end of comment/i);
	});
});

describe('lexer: strings + escapes in code', () => {
	it('parses double-quoted strings with escapes', () => {
		const t = lex('{{ "a\\n\\t\\r\\\\b" }}', {});
		const toks = allTokens(t);

		const strTok = toks.find((x) => x.type === TOKEN_STRING)!;
		expect(strTok.value).toBe('a\n\t\r\\b');
	});

	it('parses single-quoted strings with escapes', () => {
		const t = lex("{{ 'x\\nY' }}", {});
		const toks = allTokens(t);

		const strTok = toks.find((x) => x.type === TOKEN_STRING)!;
		expect(strTok.value).toBe('x\nY');
	});
});

describe('lexer: numbers, booleans, none/null', () => {
	it('parses ints and floats', () => {
		const t = lex('{{ 10 3.14 -2 +7 }}', {});
		const toks = allTokens(t);

		const typesAndVals = toks
			.filter((x) => [TOKEN_INT, TOKEN_FLOAT].includes(x.type))
			.map((x) => [x.type, x.value]);

		expect(typesAndVals).toEqual([
			[TOKEN_INT, '10'],
			[TOKEN_FLOAT, '3.14'],
			[TOKEN_INT, '-2'],
			[TOKEN_INT, '+7'],
		]);
	});

	it('parses booleans', () => {
		const t = lex('{{ true false }}', {});
		const toks = allTokens(t);

		const bools = toks
			.filter((x) => x.type === TOKEN_BOOLEAN)
			.map((x) => x.value);
		expect(bools).toEqual(['true', 'false']);
	});

	it('parses none and null as TOKEN_NONE', () => {
		const t = lex('{{ none null }}', {});
		const toks = allTokens(t);

		const nones = toks.filter((x) => x.type === TOKEN_NONE).map((x) => x.value);
		expect(nones).toEqual(['none', 'null']);
	});
});

describe('lexer: delimiters/operators', () => {
	it('parses parens/brackets/braces, comma, colon, tilde, pipe', () => {
		const t = lex('{{ (a)[b]{c},:~| }}', {});
		const toks = allTokens(t);

		// extract only delimiter/operator-ish tokens (ignore whitespace + start/end)
		const filtered = toks
			.filter(
				(x) =>
					![
						TOKEN_VARIABLE_START,
						TOKEN_VARIABLE_END,
						TOKEN_WHITESPACE,
						TOKEN_SYMBOL,
					].includes(x.type)
			)
			.map((x) => [x.type, x.value]);

		expect(filtered).toEqual([
			[TOKEN_LEFT_PAREN, '('],
			[TOKEN_RIGHT_PAREN, ')'],
			[TOKEN_LEFT_BRACKET, '['],
			[TOKEN_RIGHT_BRACKET, ']'],
			[TOKEN_LEFT_CURLY, '{'],
			[TOKEN_RIGHT_CURLY, '}'],
			[TOKEN_COMMA, ','],
			[TOKEN_COLON, ':'],
			[TOKEN_TILDE, '~'],
			[TOKEN_PIPE, '|'],
		]);
	});

	it('parses operators as TOKEN_OPERATOR', () => {
		const t = lex('{{ a + b * c - d / e }}', {});
		const toks = allTokens(t);

		const ops = toks
			.filter((x) => x.type === TOKEN_OPERATOR)
			.map((x) => x.value);
		// at least these should appear; exact set depends on spacing but these are delimiters
		expect(ops).toEqual(expect.arrayContaining(['+', '*', '-', '/']));
	});
});

describe('lexer: regex literal', () => {
	it('parses regex r/.../ with flags', () => {
		const t = lex('{{ r/ab\\//gim }}', {});
		const toks = allTokens(t);

		const r = toks.find((x) => x.type === TOKEN_REGEX);
		expect(r).toBeTruthy();
		expect(r!.value).toEqual({
			body: 'ab\\/',
			flags: 'gim',
		});
	});

	it('stops regex body at unescaped /', () => {
		const t = lex('{{ r/a\\/b/ }}', {});
		const toks = allTokens(t);

		const r = toks.find((x) => x.type === TOKEN_REGEX)!;
		expect(r.value.body).toBe('a\\/b');
		expect(r.value.flags).toBe('');
	});
});

describe('lexer: trimBlocks and lstripBlocks', () => {
	it('trimBlocks removes newline right after BLOCK_END', () => {
		const t = lex('{% if x %}\nhello', { trimBlocks: true });
		const toks = allTokens(t);

		// Expect: BLOCK_START ... BLOCK_END then DATA without leading newline
		const data = toks.find((x) => x.type === TOKEN_DATA)?.value;
		expect(data).toBe('hello');
	});

	it('trimBlocks handles CRLF right after BLOCK_END', () => {
		const t = lex('{% if x %}\r\nhello', { trimBlocks: true });
		const toks = allTokens(t);

		const data = toks.find((x) => x.type === TOKEN_DATA)?.value;
		expect(data).toBe('hello');
	});

	it('lstripBlocks strips whitespace before a block start on the same line', () => {
		// there is leading whitespace before the block on the same line
		const t = lex('x\n    {% if y %}Z{% endif %}', { lstripBlocks: true });
		const toks = allTokens(t);

		// The DATA token should be "x\n" (no trailing spaces before the block)
		// Then immediately a BLOCK_START (because the whitespace was stripped away)
		expect(toks[0].type).toBe(TOKEN_DATA);
		expect(toks[0].value).toBe('x\n');

		expect(toks[1].type).toBe(TOKEN_BLOCK_START);
	});
});

describe('lexer: custom tag delimiters', () => {
	it('supports custom tags via opts.tags', () => {
		const t = lex('A << name >> B', {
			tags: {
				variableStart: '<<',
				variableEnd: '>>',
			},
		});

		const toks = allTokens(t);
		expect(toks.map((x) => x.type)).toEqual([
			TOKEN_DATA,
			TOKEN_VARIABLE_START,
			TOKEN_WHITESPACE,
			TOKEN_SYMBOL,
			TOKEN_WHITESPACE,
			TOKEN_VARIABLE_END,
			TOKEN_DATA,
		]);

		expect(toks[1].value).toBe('<<');
		expect(toks[5].value).toBe('>>');
	});
});

describe('lexer: line/col tracking', () => {
	it('updates lineno/colno across newlines', () => {
		const t = lex('a\n{{ x }}\n', {});
		const toks = allTokens(t);

		const firstData = toks[0];
		expect(firstData.type).toBe(TOKEN_DATA);
		expect(firstData.lineno).toBe(0);
		expect(firstData.colno).toBe(0);

		const varStart = toks.find((x) => x.type === TOKEN_VARIABLE_START)!;
		// after "a\n" we are on line 1, col 0
		expect(varStart.lineno).toBe(1);
		expect(varStart.colno).toBe(0);

		const lastData = toks.at(-1)!;
		expect(lastData.type).toBe(TOKEN_DATA);
		expect(lastData.value).toBe('\n');
		// the final '\n' token should start on line 1 after the tag ends (depends on content)
		expect(lastData.lineno).toBeGreaterThanOrEqual(1);
	});
});
