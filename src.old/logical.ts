import { is_keyword_func, p } from './lib';

const logical_symbols = {
  and: '&&',
  or: '||',
  not: '!',
  is: '===',
  in: '',
};

const _and = (x: string | number | any[], ...args: any[]) => {
  if(Array.isArray(x) && !args) {
    p.log('ONE ITEM',x.reduce((c, v) => c && v, x[0]))
    return x.reduce((c, v) => c && v, x[0]);
  }
  return args.reduce((c, v) => c && v, args[0]);
}
const _or = (...args: any[]) => args.reduce((c, v) => c && v, args[0]);
const _is = ( ...args: any[]) => args.every((c) => c === args[0]);
const _in = (...args: any[]) => args.some((c) => c === args[0]);
const _not = (...args: any[]) => args.map((c) => !c);

type logical_key_type = keyof typeof logical;

export const logical = {
  and: 'and',
  or: 'or',
  not: 'not',
  is: 'is',
  in: 'in',
};

export const is_logical_keyword = is_keyword_func<logical_key_type>(logical);

export const logical_map = {
  and: _and,
  or: _or,
  is: _is,
  in: _in,
  not: _not,
}