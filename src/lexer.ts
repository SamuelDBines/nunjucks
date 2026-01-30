import type { LexerType, Lex, LexerItem, Lexer } from "./types";

const buildLexer = (start_symbol: string, end_symbol: string, key: string): LexerItem => ({
  start_symbol,
  start_type: key + "_start",
  end_symbol,
  end_type: key + "_end",
});

const initVariables: Lexer = {
  statement: buildLexer("{%", "%}", "statement"),
  expression: buildLexer("{{", "}}", "expression"),
  comment: buildLexer("{#", "#}", "comment"),
};

const lex_start = (row: number, col: number, i: number, lexItem: LexerItem): LexerType => ({
  type: lexItem.start_type,
  until: lexItem.end_type,
  symbol: lexItem.start_symbol,
  row,
  col,
  id: `[${col}][${row}]`,
  i,
});

const lex_end = (row: number, col: number, i: number, lexItem: LexerItem): LexerType => ({
  type: lexItem.end_type,
  symbol: lexItem.end_symbol,
  row,
  col,
  id: `[${col}][${row}]`,
  i: i + 1,
});

export const lex_init = (opts: { _lexer?: Partial<Lexer> }) => {
  const _lexer: Lexer = { ...initVariables, ...(opts._lexer ?? {}) };

  const lex: Lex = (str: string, len: number) => {
    const next = (i: number, isPrev = false) => {
      if (isPrev && i - 1 >= 0) return str[i - 1];
      if (!isPrev && i + 1 < len) return str[i + 1];
      return null;
    };

    const find = (i: number, row: number, col: number, isPrev = false): LexerType | null => {
      const n = next(i, isPrev);
      if (!n) return null;

      const item = isPrev ? n + str[i] : str[i] + n;

      switch (item) {
        case _lexer.statement.start_symbol:
          return lex_start(row, col, i, _lexer.statement);
        case _lexer.statement.end_symbol:
          return lex_end(row, col, i, _lexer.statement);
        case _lexer.expression.start_symbol:
          return lex_start(row, col, i, _lexer.expression);
        case _lexer.expression.end_symbol:
          return lex_end(row, col, i, _lexer.expression);
        case _lexer.comment.start_symbol:
          return lex_start(row, col, i, _lexer.comment);
        case _lexer.comment.end_symbol:
          return lex_end(row, col, i, _lexer.comment);
        default:
          return null;
      }
    };

    return { symbols: _lexer, next, find };
  };

  return { lex };
};
