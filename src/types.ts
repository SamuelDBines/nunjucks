// DONE: Sat Jan 3 2026
// --- COMMON ---
export type Callback<E = unknown, R = unknown> = (
	err?: E | null,
	res?: R
) => void;

type TokenType = string;

export interface Token {
	type: TokenType;
	value?: any;
	lineno?: number;
	colno?: number;
}

export interface TokenStream {
	nextToken(): Token | null;
	_extractRegex(re: RegExp): RegExpExecArray | null;
	backN(n: number): void;
	tags: {
		VARIABLE_START: string;
		VARIABLE_END: string;
		BLOCK_START: string;
		BLOCK_END: string;
		COMMENT_START: string;
		COMMENT_END: string;
	};
}

export interface ParserExtension<P> {
	tags?: string[]; // names like ["mytag", "otherTag"]
	parse(
		parser: P,
		nodes: typeof import('./nodes'),
		lexer: typeof import('./lexer')
	): Node;
	preprocess?: (src: string) => string; // used in compiler.ts preprocessor pipeline
}
