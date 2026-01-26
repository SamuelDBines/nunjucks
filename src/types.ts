// DONE: Sat Jan 3 2026
// --- COMMON ---
export type Callback<E = unknown, R = unknown> = (
	err?: E | null,
	res?: R
) => void;

export type LexerType = { type: string, until?: string, symbol: string, row: number, col: number, id: string, i: number }

export interface LexerItem {
  start_symbol: string;
  start_type: string;
  end_symbol: string;
  end_type: string;
}
export interface Lexer {
  statement: LexerItem
  expression: LexerItem,
  comment: LexerItem
}
export type LexResponse = ({
	next: (i: number, isPrev: boolean) => string | null
	find: (i: number,row: number, col: number, isPrev: boolean) => LexerType
	symbols: Lexer
})
export type Lex = (str: string, len: number) => LexResponse

export type LoaderResponse = {
	typename: string;
	source: (name: string) => { err?: string, res: string };
	read: (name: string) => { err?: string, res: string };
}



export type action_name = 'keyword' | 'var' | 'data' | 'pipe' | 'call' | 'lit' | 'sym'
export type param_action = {
	name: action_name
	callable?: boolean
	value: string;
	args?: any;
}

type statement_handler_type<T = void> = (str: string,  actions: param_action[], _opts?: GlobalOpts) => T

export type pipe_fn = statement_handler_type

export interface GlobalOpts {
	loader: LoaderResponse
	lex: Lex
	lexer: LexResponse
	fns: Record<string, pipe_fn>,
	files: Record<string, string>
	ctx: Record<string, any>
	vars: Record<string, any>
}