import { parse_var } from './lib';

type Step = (value: any, ...args: any[]) => any;
export type StepWithArgs = [Step, ...any[]];
export type PipelineStep = Step | StepWithArgs;

type Pipe = {
	value: any;
	to: Step;
}

export const combiner = (funs: PipelineStep[]) => (x: any) => funs.reduce((acc, step) => {
		if(Array.isArray(step)) {
      let [fn, ...args] = step;
      args = args.map(parse_var)
      console.log(fn, ...args)
      return acc.to(fn, ...args);
    }
		return acc.to(step)
	}, pipe(x))

export const pipe = (value: any): Pipe => ({
  value,
  to: (cb: Step, ...args: any[]) => pipe(cb(value, ...args)),
})
