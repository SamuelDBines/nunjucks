import { is_keyword_func, p  } from './lib';

const arithmetic_symbols = {
	add: '+',
	sub: '-',
	mul: '*',
	div: '/',
	mod: '%',
};

export const arithmetic = {
	add: 'add',
	sub: 'sub',
	mul: 'mul',
	div: 'div',
	mod: 'mod',
} as const;

const format_arith = (x: any, ...args: any[]) => {
	let first = x;
	if (Array.isArray(first)) {
		first = x[0];
		x.shift();
		return { first, arr: [...x, ...args] };
	}
	return { first, arr: args };
};
const _add = (x: any, ...args: any[]) => {
	const { first, arr } = format_arith(x, ...args);
  p.log(x, args)
	return arr.reduce((c, v) => c + v, first);
};
const _sub = (x: any, ...args: any[]) => {
	const { first, arr } = format_arith(x, ...args);
	return arr.reduce((c, v) => c - v, first);
};
const _mul = (x: any, ...args: any[]) => {
	const { first, arr } = format_arith(x, ...args);
	return arr.reduce((c, v) => c * v, first);
};
const _div = (x: any, ...args: any[]) => {
	const { first, arr } = format_arith(x, ...args);
	return arr.reduce((c, v) => c / v, first);
};
const _mod = (x: any, ...args: any[]) => {
	const { first, arr } = format_arith(x, ...args);
	return arr.reduce((c, v) => c % v, first);
};

type arithmetic_key_type = keyof typeof arithmetic;

export const is_arithmetic_keyword =
	is_keyword_func<arithmetic_key_type>(arithmetic);

export const arithmetic_map = {
	add: _add,
	sub: _sub,
	mul: _mul,
	div: _div,
	mod: _mod,
};
