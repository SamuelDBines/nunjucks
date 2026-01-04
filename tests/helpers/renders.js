import { vitest } from 'vitest';
import { expect, test} from vitest

expect(await render(`Hello {{ name }}`, { name: "Sam" })).toBe("Hello Sam");
