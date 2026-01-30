import { LexerType, Lex, LexerItem, Lexer } from './types'

const buildLexer = (start_symbol: string, end_symbol: string, key: string): LexerItem => ({
  start_symbol,
  start_type: key + '_start',
  end_symbol,
  end_type: key + '_end',
})

const initVariables: Lexer = {
  statement: buildLexer('{%', '%}', 'statement'),
  expression: buildLexer('{{', '}}', 'expression'),
  comment: buildLexer('{#', '#}', 'comment')
}


const lex_start_func = (row: number, col: number, i: number, lexItem: LexerItem): LexerType => ({ type: lexItem.start_type, until: lexItem.end_type, symbol: lexItem.start_symbol, row, col, id: `[${col}][${row}]`, i })
const lex_end_func = (row: number, col: number, i: number, lexItem: LexerItem): LexerType => ({ type: lexItem.end_type, symbol: lexItem.end_symbol, row, col, id: `[${col}][${row}]`, i: i+1 })

type TransformerOpts = {
  _lexer: Partial<Lexer>
}

export const lex_init = (opts: TransformerOpts) => {
  const _lexer: Lexer = { ...initVariables, ...opts._lexer }

  const lex: Lex = (str: string, len: number) => {
    const next = (i: number, isPrev: boolean = false) => {
      if(isPrev && (i - 1) > 0) return str[i - 1] 
      if(!isPrev && (i + 1) < len) return str[i + 1] 
      return null
    }
    const find = (i: number, row: number, col: number, isPrev: boolean = false): LexerType | null => {
      const nextItem = next(i, isPrev);
      if(!nextItem) return
      const item = isPrev ? nextItem + str[i] : str[i] + nextItem;
      switch(item) {
        case _lexer.statement.start_symbol:
          return lex_start_func(row, col, i, _lexer.statement)
        case _lexer.statement.end_symbol:
          return lex_end_func(row, col, i, _lexer.statement)
        case _lexer.expression.start_symbol:
          return lex_start_func(row, col, i, _lexer.expression)
        case _lexer.expression.end_symbol:
          return lex_end_func(row, col, i, _lexer.expression)
        case _lexer.comment.start_symbol:
          return lex_start_func(row, col, i, _lexer.comment)
        case _lexer.comment.end_symbol:
          return lex_end_func(row, col, i, _lexer.comment)
        default:
          return null
      } 
    }
    return {
      symbols: _lexer,
      next,
      find,
    }
  }
  return {
    lex
  }
}
