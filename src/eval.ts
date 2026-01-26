import { arithmetic, arithmetic_map } from './arithmetic'
import { logical, logical_map } from './logical'
import { pipe, combiner, StepWithArgs, PipelineStep } from './pipe';
import {
	p,
	is_keyword_func,
	unquote,
	is_quoted,
	is_callable,
	is_array,
	_upper,
	_lower,
	_none,
	_defined,
	_undefined,
  parse_var,
} from './lib';
import { GlobalOpts, pipe_fn, param_action } from './types';

export const variables = {
	set: 'set',
	var: 'var',
	const: 'const',
	let: 'let',
	empty: '',
};
type variable_key_type = keyof typeof variables;

export const is_variable_keyword =
	is_keyword_func<variable_key_type>(variables);

const _set = (_opts?: GlobalOpts) => (str, ...args) => {
  console.log(str, ' sept ', args[0])
	const _varsArr: string[] = args[0].split(',');
  console.log(_varsArr)
	for (var i in _varsArr) {
		const _key_value = _varsArr[i].split('=');
		if (_key_value.length > 2) p.err('Something is wrong');
		const _key = _key_value[0].trim();
		const _value = _key_value[1].trim();
		if (_opts.vars[_key]) {
			p.err('Redeclared varibale');
		} else {
			_opts.vars[_key] = _value;
		}
	}
};

const variable_map = {
	set: 'set',
	var: 'var',
	const: 'const',
	let: 'let',
	empty: '',
};

export const extension = {
	extends: 'extends',
	includes: 'includes',
	from: 'from',
	import: 'import',
};

type extensions_type = keyof typeof extension;

export const is_extension_keyword = is_keyword_func<extensions_type>(extension);

const _extend = (_opts?: GlobalOpts) => (inner: any, ...args) => {
  const first = args[0]//Why args and inner empty?
  console.log(first)
	const _key: string = unquote(first.replace(extension.extends, '').trim());
	if (_opts.files[_key]) {
		p.debug('File already set: ', _key);
		return;
	}
	const { err, res } = _opts.loader.read(_key);
	_opts.files[_key] = err || res;
	return;
};
// export function eval_extension(keyword: extensions_type): statement_handler_type {
//   if (keyword === extension.extends) return _extend
//   // if (keyword === extension.includes) return () => node.left - node.right;
//   // p.err('Unknown extension: ', node)
// }

export const filters = {
	lower: 'lower',
	upper: 'upper',
};

type filter_type = keyof typeof filters;
export const is_filter_keyword = is_keyword_func<filter_type>(filters);

const filter_map = {
	lower: _lower,
	upper: _upper
};

export const keywords = {
	...arithmetic,
	...variables,
	...logical,
	...extension,
} as const;

type keyword_type = keyof typeof keywords;

export const is_keyword = is_keyword_func<keyword_type>(keywords);

export const fns = (_opts: GlobalOpts) => ({
  ...arithmetic_map,
  ...logical_map,
  ...filter_map,
	extends: _extend(_opts),
	set: _set(_opts),
	anything(inner, actions, _opts) {
		p.warn('do nothing in anything');
	},
	super(inner, actions, _opts) {
		p.warn('do nothing in super');
	},
	call(inner, actions, _opts) {
		p.warn('do nothing in call');
	},
	// include(inner, actions, _opts) {
	// 	// {% include "partial.html" %}
	// 	const fileTok = actions.find((a) => a.name === 'data')?.value;
	// 	const file = eval_token(fileTok ?? '', _opts);
	// 	_opts.files[String(file)] = _opts.loader.read(String(file)).res;
	// },
})

const get_fn = (name: string, _opts: GlobalOpts) => {
	const fn = _opts.fns?.[name]; // or global registry
	// if (!fn) throw new Error(`Unknown function/filter: ${name}`);
	return fn;
};

export const _eval_fn = (src: string, _opts: GlobalOpts): { step?: StepWithArgs, value?: any } => {
  const callable = is_callable(src)
  if(callable) {
    const fn = get_fn(callable.name, _opts)
    return { step: [fn, ...callable.args] }
  } 
  const args = src.split(' ')
  const fn = get_fn(args[0], _opts)
  // p.log('It must ', args)
  if(fn) {
    const _src = src.replace(args[0], '')
    return { step: [fn, _src] }
  } 
  if(args.length === 1) p.log('It must ', args)
  return { value: parse_var(src) }
}

export const _eval = (expr: string, _opts: GlobalOpts) => {
	const s = expr.trim();
	const actions = s.split('|').map((i) => i.trim());
  let valid = true
  let init_value = ''
  const steps: PipelineStep[] = []
  for(let i = 0; i < actions.length; i ++) {
    const v = actions[i]
    const { step, value } = _eval_fn(v, _opts)
    if(i === 0 && value) init_value = value
    else if(i > 0 && value) valid = false
    else if(step) steps.push(step)
    else p.warn('Nothing was found: ', v)
  }
  console.log(steps, init_value)
  const res = combiner(steps)(init_value)
  return res.value
};

// statments are
// keyword <expression>,<expression2>...n
// keyword <expression>
// keyword(<express>)
// keyword empty

// JOINs are
// statement <JOINER> statement
// statement <JOINER> statement... n

// VALUES are
// {{ VALUE }}

// Conditionals
// if statement else statement
// statement ? true : false

// const rules = {
// 	block: {
// 		arg_len: '1',
// 		end: 'endblock',
// 		allow_quotes: false,
// 		pipeable: false,
// 	},
// 	if: {
// 		arg_len: 'n', //many conditions if | if(
// 		end: 'endif',
// 		callable: false,
// 		pipable: false,
// 	},
// 	and: {
// 		arg_len: '0',
// 		end: 'inline',
// 		pipable: true,
// 		callable: true,
// 	},
// 	add: {
// 		arg_len: 'n',
// 		end: 'inline',
// 		pipable: true,
// 		callable: true,
// 	},
// };

