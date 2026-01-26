const block_start = 'block_start'
const block_end = 'block_end'
const variable_start = 'variable_start'
const variable_end = 'variable_end'
const comment_start = 'comment_start'
const comment_end = 'comment_end'

const block_start_symbol = '{%'
const block_end_symbol = '%}'
type block_symbol = '{%' | '%}'
const variable_start_symbol = '{{'
const variable_end_symbol = '}}'
type variable_symbol = '{{' | '}}'
const comment_start_symbol = '{#'
const comment_end_symbol = '#}'
type comment_symbol = '{#' | '#}'
const curly_bracket_start = 'curly_bracket_start'
const curly_bracket_start_symbol = '{'
const curly_bracket_end = 'curly_bracket_end'
const curly_bracket_end_symbol = '}'
const circle_bracket_start = 'circle_bracket_start'
const circle_bracket_start_symbol = '('
const circle_bracket_end = 'circle_bracket_end'
const circle_bracket_symbol = ')'
const square_bracket_start = 'square_bracket_start'
const square_bracket_start_symbol = '['
const square_bracket_end = 'square_bracket_end'
const square_bracket_end_symbol = ']'
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
