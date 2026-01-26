import { describe, test, expect, vi } from 'vitest';
import { logical_map } from '../src/logical';

const { and, is, or, not, in: _in  } = logical_map;
describe('logical()', () => {
	describe('is_function/is_arry/is_string/is_object/is_number/is_boolean', () => {
		test('logical_map()', () => {
			expect(logical_map['and']).toEqual(and);
			expect(logical_map['in']).toEqual(_in);
			expect(logical_map['is']).toEqual(is);
			expect(logical_map['not']).toEqual(not);
			expect(logical_map['or']).toEqual(or);
			expect((logical_map as any)['any']).toEqual(undefined);
		});
		test('logical_map.and', () => {
			expect(and(1,2)).toBe(2)
			expect(and(2,2)).toBe(2)
			// expect(and(1.5,2)).toBe(3.5)
			// expect(and(1.5)).toBe(1.5)
			// expect(and([1.5])).toBe(1.5)
			// expect(and([{}])).toEqual({})
			// expect(and(["{}"])).toBe("{}")
			// expect(and("{}")).toBe("{}")
			// expect(and("{}",1)).toBe("{}1")
			// expect(and([1.5,2])).toBe(3.5)
			// expect(and([1.5,2],4)).toBe(7.5)
			// This should never happen but I can catch it later
			// expect(and([1.5,2],4, [5])).toBe("7.55")
		});
		test('logical_map.is', () => {
			expect(is(1,2)).toBe(false)
			expect(is(2,2)).toBe(true)
			// expect(is(1.5,2)).toBe(-.5)
			// expect(is(1.5)).toBe(1.5)
			// expect(is([1.5])).toBe(1.5)
			// expect(is([{}])).toEqual({})
			// expect(is(["{}"])).toBe("{}")
			// expect(is("{}")).toBe("{}")
			// expect(is("{}",1)).toBe(NaN)
			// expect(is([1.5,2])).toBe(-.5)
			// expect(is([1.5,2],4)).toBe(-4.5)
		});
		test('logical_map.or', () => {
			expect(or(1,2)).toBe(2)
			expect(or(1,2,4)).toBe(4)
			expect(or(1.5,2)).toBe(2)
			expect(or(1.5)).toBe(1.5)
			expect(or(undefined)).toBe(undefined)
			// expect(or([{}])).toEqual({})
			// expect(or(["{}"])).toBe("{}")
			// expect(or("{}")).toBe("{}")
			// expect(or("{}",1)).toBe(NaN)
			// expect(or([1.5,2])).toBe(3)
			// expect(or([1.5,2],4)).toBe(12)
		});
		test('logical_map.in', () => {
			expect(_in(1,2)).toBe(true)
			expect(_in(1,2,4)).toBe(true)
			expect(_in(1.5,2)).toBe(true)
			expect(_in([1.5])).toBe(true)
			expect(_in([{}])).toEqual(true)
			expect(_in(["{}"])).toBe(true)
			expect(_in("{}")).toBe(true)
			expect(_in("{}",1)).toBe(true)
			expect(_in([1.5,2],4)).toBe(true)
		});
		test('logical_map.not', () => {
			expect(not(1,2)).toEqual([false, false])
			expect(not("1","2")).toEqual([false, false])
			expect(not(false, false)).toEqual([true, true])
			expect(not([false, false])).toEqual([false])
			expect(not(![false, false])).toEqual([true])
		});		
	});
});
