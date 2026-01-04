// test/precompile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { precompile } from '../nunjucks/src/precompile';
/**
 * IMPORTANT:
 * - Adjust import paths (`../src/...`) to match your repo.
 * - These tests mock fs + compiler + lib + env + globals so they run fast + deterministically.
 */

// --------------------
// Mocks
// --------------------
type Stat = { isFile: () => boolean; isDirectory: () => boolean };

type FsTreeNode =
	| { type: 'file'; content: string }
	| { type: 'dir'; children: Record<string, FsTreeNode> };

function makeStat(kind: 'file' | 'dir'): Stat {
	return {
		isFile: () => kind === 'file',
		isDirectory: () => kind === 'dir',
	};
}

// In-memory fs tree for deterministic tests
let TREE: FsTreeNode;

function getNode(p: string): FsTreeNode {
	const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
	let cur: FsTreeNode = TREE;

	for (const part of parts) {
		if (cur.type !== 'dir') throw new Error(`Not a directory: ${p}`);
		const next = cur.children[part];
		if (!next) throw new Error(`ENOENT: ${p}`);
		cur = next;
	}
	return cur;
}

function listDir(p: string): string[] {
	const node = getNode(p);
	if (node.type !== 'dir') throw new Error(`ENOTDIR: ${p}`);
	return Object.keys(node.children);
}

function readFile(p: string): string {
	const node = getNode(p);
	if (node.type !== 'file') throw new Error(`EISDIR: ${p}`);
	return node.content;
}

vi.mock('fs', () => {
	return {
		default: {
			statSync: (p: string) => {
				const n = getNode(p);
				return makeStat(n.type === 'file' ? 'file' : 'dir');
			},
			readdirSync: (p: string) => listDir(p),
			readFileSync: (p: string, _enc: string) => readFile(p),
		},
		statSync: (p: string) => {
			const n = getNode(p);
			return makeStat(n.type === 'file' ? 'file' : 'dir');
		},
		readdirSync: (p: string) => listDir(p),
		readFileSync: (p: string, _enc: string) => readFile(p),
	};
});

const compileMock = vi.fn();
vi.mock('../nunjucks/src/compiler', () => {
	return { compile: (...args: any[]) => compileMock(...args) };
});

const prettifyMock = vi.fn((name: string, _a: any, err: any) => {
	// Keep it simple and easy to assert:
	const e = new Error(`PRETTY:${name}:${String(err?.message || err)}`);
	return e;
});
const templateErrorMock = vi.fn((e: any) => {
	// Make sure errors have `.message`
	return e instanceof Error ? e : new Error(String(e));
});
vi.mock('../nunjucks/src/lib', () => {
	return {
		_prettifyError: (...args: any[]) => prettifyMock(...args),
		TemplateError: (...args: any[]) => templateErrorMock(...args),
	};
});

class FakeEnv {
	asyncFilters: string[] = [];
	extensionsList: any[] = [];
	throwOnUndefined = false;
	constructor(_loaders?: any[]) {}
}
vi.mock('../src/environment', () => {
	return { Environment: FakeEnv, Template: class Template {} };
});

const wrapperMock = vi.fn((templates: any[], opts?: any) => ({
	templates,
	opts,
}));
vi.mock('../nunjucks/src/globals', () => {
	return { precompileGlobal: (...args: any[]) => wrapperMock(...args) };
});

// Module under test (import AFTER mocks)

// --------------------
// Tests
// --------------------
describe('precompile.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// default compile behavior
		compileMock.mockImplementation(
			(_src: string, _async: any, _ext: any, name: string) => {
				return `CODE:${name}`;
			}
		);

		// default fs tree
		TREE = {
			type: 'dir',
			children: {
				templates: {
					type: 'dir',
					children: {
						'a.njk': { type: 'file', content: 'A' },
						'b.txt': { type: 'file', content: 'B' },
						sub: {
							type: 'dir',
							children: {
								'c.njk': { type: 'file', content: 'C' },
								'ignore.njk': { type: 'file', content: 'NO' },
							},
						},
						skipdir: {
							type: 'dir',
							children: {
								'd.njk': { type: 'file', content: 'D' },
							},
						},
					},
				},
				'single.njk': { type: 'file', content: 'SINGLE' },
			},
		};
	});

	describe('default export precompile()', () => {
		it('precompiles a single file path', () => {
			const env = new FakeEnv([]);
			const out = precompile('single.njk', {
				isString: false,
				env,
				name: 'myname.njk',
				wrapper: wrapperMock,
			});

			// wrapper called with a single precompiled template
			expect(wrapperMock).toHaveBeenCalledTimes(1);
			expect(out.templates).toHaveLength(1);
			expect(out.templates[0]).toEqual({
				name: 'myname.njk',
				template: 'CODE:myname.njk',
			});
		});

		it('precompiles a directory: includes files matching include patterns and traverses subdirs not excluded', () => {
			const env = new FakeEnv([]);

			const out = precompile('templates', {
				isString: false,
				env,
				include: [/\.njk$/], // only *.njk
				exclude: [/skipdir\//, /sub\/ignore\.njk$/], // skip skipdir folder + one file in sub
				wrapper: wrapperMock,
			});

			// Expect only: a.njk and sub/c.njk (ignore skipdir/d.njk and sub/ignore.njk)
			const names = out.templates.map((t: any) => t.name).sort();
			expect(names).toEqual(['a.njk', 'sub/c.njk']);

			// compile called for each included template with its relative name
			const compiledNames = compileMock.mock.calls.map((c) => c[3]).sort();
			expect(compiledNames).toEqual(['a.njk', 'sub/c.njk']);
		});

		it('when force=false (default), a compile error in a directory aborts', () => {
			compileMock.mockImplementation(
				(_src: string, _a: any, _e: any, name: string) => {
					if (name === 'sub/c.njk') throw new Error('bad');
					return `CODE:${name}`;
				}
			);

			expect(() =>
				precompile('templates', {
					isString: false,
					include: [/\.njk$/],
					exclude: [/skipdir\//],
					wrapper: wrapperMock,
				})
			).toThrowError(/PRETTY:sub\/c\.njk/);

			// wrapper should not be called because it aborted
			expect(wrapperMock).not.toHaveBeenCalled();
		});

		it('when force=true, a compile error in a directory is logged and compilation continues', () => {
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			compileMock.mockImplementation(
				(_src: string, _a: any, _e: any, name: string) => {
					if (name === 'sub/c.njk') throw new Error('bad');
					return `CODE:${name}`;
				}
			);

			const out = precompile('templates', {
				isString: false,
				include: [/\.njk$/],
				exclude: [/skipdir\//],
				force: true,
				wrapper: wrapperMock,
			});

			// a.njk compiled, sub/c.njk failed and is skipped
			const names = out.templates.map((t: any) => t.name).sort();
			expect(names).toEqual(['a.njk', 'sub/ignore.njk']); // NOTE: include matches *.njk, and we didn't exclude ignore.njk here

			expect(errSpy).toHaveBeenCalled(); // logged error

			errSpy.mockRestore();
		});
	});

	describe('precompileString', () => {
		it('throws if called with isString=true and no name (current bug path)', () => {
			// Your code intends to throw when opts.name missing, but currently checks `_precompile.name`
			// which is truthy, so it will fall through and then crash later.
			expect(() =>
				precompile('Hello', {
					isString: true,
					// name intentionally missing
					wrapper: wrapperMock,
				})
			).toThrow();
		});

		it('compiles a string when name is provided', () => {
			const out = precompile('Hello', {
				isString: true,
				name: 'inline.njk',
				env: new FakeEnv([]),
				wrapper: wrapperMock,
			});

			expect(wrapperMock).toHaveBeenCalledTimes(1);
			expect(out.templates).toHaveLength(1);
			expect(out.templates[0].name).toBe('inline.njk');
			expect(out.templates[0].template).toBe('CODE:inline.njk');
		});
	});
});
