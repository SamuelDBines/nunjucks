import { describe, test, expect, vi } from 'vitest';
import { arithmetic_map } from '../src/arithmetic';

const { add, sub, div, mod, mul  } = arithmetic_map;
describe('arithmetic()', () => {
	describe('is_function/is_arry/is_string/is_object/is_number/is_boolean', () => {
		test('arithmetic_map()', () => {
			expect(arithmetic_map['add']).toEqual(add);
			expect(arithmetic_map['sub']).toEqual(sub);
			expect(arithmetic_map['div']).toEqual(div);
			expect(arithmetic_map['mul']).toEqual(mul);
			expect(arithmetic_map['mod']).toEqual(mod);
			expect((arithmetic_map as any)['any']).toEqual(undefined);
		});
		test('arithmetic_map.add', () => {
			expect(add('')).toBe('')
			expect(add(1,2)).toBe(3)
			expect(add(1,2,4)).toBe(7)
			expect(add(1.5,2)).toBe(3.5)
			expect(add(1.5)).toBe(1.5)
			expect(add([1.5])).toBe(1.5)
			expect(add([{}])).toEqual({})
			expect(add(["{}"])).toBe("{}")
			expect(add("{}")).toBe("{}")
			expect(add("{}",1)).toBe("{}1")
			expect(add([1.5,2])).toBe(3.5)
			expect(add([1.5,2],4)).toBe(7.5)
			// This should never happen but I can catch it later
			expect(add([1.5,2],4, [5])).toBe("7.55")
		});
		test('arithmetic_map.sub', () => {
			expect(sub('')).toBe('')
			expect(sub(1,2)).toBe(-1)
			expect(sub(1,2,4)).toBe(-5)
			expect(sub(1.5,2)).toBe(-.5)
			expect(sub(1.5)).toBe(1.5)
			expect(sub([1.5])).toBe(1.5)
			expect(sub([{}])).toEqual({})
			expect(sub(["{}"])).toBe("{}")
			expect(sub("{}")).toBe("{}")
			expect(sub("{}",1)).toBe(NaN)
			expect(sub([1.5,2])).toBe(-.5)
			expect(sub([1.5,2],4)).toBe(-4.5)
		});
		test('arithmetic_map.mul', () => {
			expect(mul('')).toBe('')
			expect(mul(1,2)).toBe(2)
			expect(mul(1,2,4)).toBe(8)
			expect(mul(1.5,2)).toBe(3)
			expect(mul(1.5)).toBe(1.5)
			expect(mul([1.5])).toBe(1.5)
			expect(mul([{}])).toEqual({})
			expect(mul(["{}"])).toBe("{}")
			expect(mul("{}")).toBe("{}")
			expect(mul("{}",1)).toBe(NaN)
			expect(mul([1.5,2])).toBe(3)
			expect(mul([1.5,2],4)).toBe(12)
		});
		test('arithmetic_map.div', () => {
			expect(div('')).toBe('')
			expect(div(1,2)).toBe(0.5)
			expect(div(1,2,4)).toBe(0.125)
			expect(div(1.5,2)).toBe(0.75)
			expect(div(1.5)).toBe(1.5)
			expect(div([1.5])).toBe(1.5)
			expect(div([{}])).toEqual({})
			expect(div(["{}"])).toBe("{}")
			expect(div("{}")).toBe("{}")
			expect(div("{}",1)).toBe(NaN)
			expect(div([1.5,2])).toBe(0.75)
			expect(div([1.5,2],4)).toBe(0.1875)
		});
		test('arithmetic_map.mod', () => {
			expect(mod('')).toBe('')
			expect(mod(1,2)).toBe(1)
			expect(mod(1,2,4)).toBe(1)
			expect(mod(1.5,2)).toBe(1.5)
			expect(mod(1.5)).toBe(1.5)
			expect(mod([1.5])).toBe(1.5)
			expect(mod([{}])).toEqual({})
			expect(mod(["{}"])).toBe("{}")
			expect(mod("{}")).toBe("{}")
			expect(mod("{}",1)).toBe(NaN)
			expect(mod([1.5,2])).toBe(1.5)
			expect(mod([1.5,2],4)).toBe(1.5)
		});		
	});
});
