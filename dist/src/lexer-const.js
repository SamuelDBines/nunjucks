// Incase I which to switch back
// export const whitespaceChars = ' \n\t\r\u00A0';
// export const delimChars = '()[]{}%*-+~/#,:|.<>=!';
// export const intChars = '0123456789';
// export const BLOCK_START = '{%';
// export const BLOCK_END = '%}';
// export const VARIABLE_START = '{{';
// export const VARIABLE_END = '}}';
// export const COMMENT_START = '{#';
// export const COMMENT_END = '#}';
// export const TOKEN_STRING = 'string';
// export const TOKEN_WHITESPACE = 'whitespace';
// export const TOKEN_DATA = 'data';
// export const TOKEN_BLOCK_START = 'block-start';
// export const TOKEN_BLOCK_END = 'block-end';
// export const TOKEN_VARIABLE_START = 'variable-start';
// export const TOKEN_VARIABLE_END = 'variable-end';
// export const TOKEN_COMMENT = 'comment';
// export const TOKEN_LEFT_PAREN = 'left-paren';
// export const TOKEN_RIGHT_PAREN = 'right-paren';
// export const TOKEN_LEFT_BRACKET = 'left-bracket';
// export const TOKEN_RIGHT_BRACKET = 'right-bracket';
// export const TOKEN_LEFT_CURLY = 'left-curly';
// export const TOKEN_RIGHT_CURLY = 'right-curly';
// export const TOKEN_OPERATOR = 'operator';
// export const TOKEN_COMMA = 'comma';
// export const TOKEN_COLON = 'colon';
// export const TOKEN_TILDE = 'tilde';
// export const TOKEN_PIPE = 'pipe';
// export const TOKEN_INT = 'int';
// export const TOKEN_FLOAT = 'float';
// export const TOKEN_BOOLEAN = 'boolean';
// export const TOKEN_NONE = 'none';
// export const TOKEN_SYMBOL = 'symbol';
// export const TOKEN_SPECIAL = 'special';
// export const TOKEN_REGEX = 'regex';
export const CHARS = {
    whitespace: ' \n\t\r\u00A0',
    delim: '()[]{}%*-+~/#,:|.<>=!',
    int: '0123456789',
};
export const DELIMS = {
    BLOCK_START: '{%',
    BLOCK_END: '%}',
    VARIABLE_START: '{{',
    VARIABLE_END: '}}',
    COMMENT_START: '{#',
    COMMENT_END: '#}',
};
export const TOKENS = {
    STRING: 'string',
    WHITESPACE: 'whitespace',
    DATA: 'data',
    BLOCK_START: 'block-start',
    BLOCK_END: 'block-end',
    VARIABLE_START: 'variable-start',
    VARIABLE_END: 'variable-end',
    COMMENT: 'comment',
    LEFT_PAREN: 'left-paren',
    RIGHT_PAREN: 'right-paren',
    LEFT_BRACKET: 'left-bracket',
    RIGHT_BRACKET: 'right-bracket',
    LEFT_CURLY: 'left-curly',
    RIGHT_CURLY: 'right-curly',
    OPERATOR: 'operator',
    COMMA: 'comma',
    COLON: 'colon',
    TILDE: 'tilde',
    PIPE: 'pipe',
    INT: 'int',
    FLOAT: 'float',
    BOOLEAN: 'boolean',
    NONE: 'none',
    SYMBOL: 'symbol',
    SPECIAL: 'special',
    REGEX: 'regex',
};
export default {
    ...TOKENS,
    ...DELIMS,
    ...CHARS,
};
