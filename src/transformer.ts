// DONE: Sun 4th Jan 2026
import {
	Node,
	If,
	For,
	NodeList,
	Filter,
	Block,
	FunCall,
	Output,
	CallExtension,
	Super,
	Symbol,
	NodeCreator,
} from './nodes';

type Walker = (node: Node) => Node | void | null | undefined;

let sym = 0;
const gensym = () => 'hole_' + sym++;

function mapCOW<T>(arr: readonly T[], func: (item: T) => T): readonly T[] {
	let res: T[] | null = null;
	for (let i = 0; i < arr?.length; i++) {
		const item = func(arr[i]);

		if (item !== arr[i]) {
			if (!res) {
				res = arr.slice();
			}

			res[i] = item;
		}
	}

	return res || arr;
}

function walk(ast: Node, func: Walker, depthFirst: boolean = false): Node {
	if (!(ast instanceof Node)) return ast;

	let node = ast as unknown as Node;

	if (!depthFirst) {
		const nodeT = func(node);
		if (nodeT && nodeT !== node) {
			return nodeT as unknown as Node;
		}
	}

	if (node instanceof NodeList) {
		const children = mapCOW(
			node.children,
			(child) => walk(child, func, depthFirst) as unknown as Node
		);

		if (children !== node.children) {
			node = new (NodeCreator(node?.typename))(
				node.lineno,
				node?.colno,
				children
			);
		}
	} else if (node instanceof CallExtension) {
		const args = walk(node.args, func, depthFirst);
		const contentArgs = mapCOW(node.contentArgs, (node) =>
			walk(node, func, depthFirst)
		);

		if (args !== node.args || contentArgs !== node.contentArgs) {
			node = new (NodeCreator(node?.typename))(
				node.lineno,
				node?.colno,
				node.extname,
				node.prop,
				args,
				contentArgs
			);
		}
	} else {
		const props = node.fields.map((field) => node[field]);
		const propsT = mapCOW(props, (prop) => walk(prop, func, depthFirst));

		if (propsT !== props) {
			node = new (NodeCreator(node?.typename))(node.lineno, node?.colno);
			propsT.forEach((prop, i) => {
				node[node.fields[i]] = prop;
			});
		}
	}

	return depthFirst ? (func(node) as Node) || node : node;
}

export function collectBlocks(root: Node): Block[] {
  const blocks: Block[] = [];
  walk(root, (n) => {
    if (n instanceof Block) blocks.push(n);
  });
  return blocks;
}

function liftFilters(ast: Node, filters: readonly string[] = []) {
	console.log('liftFilters')
	function _liftFilters(
		node: Node,
		key?: string
	): Node {
		const children: Node[] = [];
		
		const walked = walk(
			key ? node[key] : node,
			(descNode) => {
				let symbol: Symbol;

				if (descNode instanceof Block) {
					return descNode;
				}

				// const isAsyncFilter =
				// 	descNode instanceof Filter &&
				// 	asyncFilters.indexOf(descNode.name.value as string) !== -1;

				// if (isAsyncFilter || descNode instanceof CallExtensionAsync) {
				// 	symbol = new Symbol(descNode.lineno, descNode?.colno, gensym());

				// 	children?.push(
				// 		new FilterAsync(
				// 			descNode.lineno,
				// 			descNode?.colno,
				// 			descNode.name,
				// 			descNode.args,
				// 			symbol
				// 		)
				// 	);
				// }

				return symbol;
			},
			true
		) as unknown as Node;
		if (key) {
			node[key] = walked;
		} else {
			node = walked;
		}

		if (children?.length) {
			children?.push(node);
			return new NodeList(node.lineno, node?.colno, children);
		}

		return node;
	}
	return walk(
		ast,
		(node) => {
			if (node instanceof Output) {
				return _liftFilters(node);
			} else if (node instanceof Set) {
				return _liftFilters(node, 'value');
			} else if (node instanceof For) {
				return _liftFilters(node, 'arr');
			} else if (node instanceof If) {
				return _liftFilters(node, 'cond');
			} else if (node instanceof CallExtension) {
				return _liftFilters(node, 'args');
			}
			return undefined;
		},
		true
	);
}

function liftSuper(ast: Node): Node {
	return walk(ast, (block) => {
		if (!(block instanceof Block)) return;

		let hasSuper = false;
		const symbol = gensym();

		block.body = walk(block.body, (node) => {
			if (node instanceof FunCall && node.name?.typename === 'Super') {
				hasSuper = true;
				return new Symbol(node.lineno, node?.colno, symbol);
			}
		});

		if (hasSuper) {
			block.body.children.unshift(
				new Super(0, 0, block.name, new Symbol(0, 0, symbol))
			);
		}
	});
	return ast;
}

function convertStatements(ast: Node): Node {
	return walk(
		ast,
		(node) => {
			if (!(node instanceof If) && !(node instanceof For)) {
				return undefined;
			}
			walk(node, (child) => {
				if (
					child instanceof For ||
					child instanceof If ||
					child instanceof CallExtension
				) {
					// Stop iterating by returning the node
					return child;
				}
				return undefined;
			});

			// if (node instanceof If) {
			// 	return new If(
			// 		node.lineno,
			// 		node?.colno,
			// 		node.cond,
			// 		node.body,
			// 		node.else_
			// 	);
			// } else if (node instanceof For) {
			// 	return new For(
			// 		node.lineno,
			// 		node?.colno,
			// 		node.arr,
			// 		node.name,
			// 		node.body,
			// 		node.else_
			// 	);
			// }
			
			// return undefined;
		},
		true
	);
}

export function transform(
	ast: Node,
): Node {
	return convertStatements(liftSuper(liftFilters(ast)));
}
