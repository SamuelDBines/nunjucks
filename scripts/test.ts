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


const combiner = (funs: any[]) => (x: any) => {
	funs.reduce((r, _p) => {
		if(Array.isArray(_p)) return r.to(..._p)
		return r.to(_p)
	}, x)
}

type Step = (value: any, ...args: any[]) => any;
type StepWithArgs = [Step, ...any[]];
type PipelineStep = Step | StepWithArgs;

type Pipe = {
	value: any;
	to: Step;
}

const pipe = (value: any): Pipe => ({
	value,
	to: (cb: Step, ...args: any[]) => pipe(cb(value, ...args)),
});

const steps: PipelineStep[] = [
  (x) => x.trim(),
	[(x, n) => x.slice(0, n), 3],
  (x) => x.toUpperCase(),
]

const res = combiner(steps)(pipe(' HELLO '))
console.log(res)

  // 