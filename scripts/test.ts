export enum LexerSymbols {
	BLOCK_START = '{%',
	BLOCK_END = '%}',
	VARIABLE_START = '{{',
	VARIABLE_END = '}}',
	COMMENT_START = '{#',
	COMMENT_END = '#}',
	SINGLE_QUOTE = "'",
	DOUBLE_QUOTE = '"'
}

const match: any = "'"

console.log(match === LexerSymbols.DOUBLE_QUOTE)

const tags = (tags:any ={}) => ({
  ...LexerSymbols,
  ...tags,
});

console.log(tags())