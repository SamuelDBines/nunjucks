import { Node, If, For, NodeList, AsyncEach, AsyncAll, IfAsync, Filter, FilterAsync, Block, FunCall, Output, CallExtension, CallExtensionAsync, Super, Symbol, NodeCreator, } from './nodes';
import { indexOf } from './lib';
let sym = 0;
const gensym = () => 'hole_' + sym++;
function mapCOW(arr, func) {
    let res = null;
    for (let i = 0; i < arr.length; i++) {
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
function walk(ast, func, depthFirst) {
    if (!(ast instanceof Node))
        return ast;
    let node = ast;
    if (!depthFirst) {
        const nodeT = func(node);
        if (nodeT && nodeT !== node) {
            return nodeT;
        }
    }
    if (node instanceof NodeList) {
        const children = mapCOW(node.children, (child) => walk(child, func, depthFirst));
        if (children !== node.children) {
            const __NODE = NodeCreator(node.__typename);
            node = new __NODE(node.lineno, node.colno, children);
        }
    }
    else if (node instanceof CallExtension) {
        const args = walk(node.args, func, depthFirst);
        const contentArgs = mapCOW(node.contentArgs, (node) => walk(node, func, depthFirst));
        if (args !== node.args || contentArgs !== node.contentArgs) {
            const __NODE = NodeCreator(node.__typename);
            node = __NODE(node.extName, node.prop, args, contentArgs);
        }
    }
    else {
        const props = node.fields.map((field) => node[field]);
        const propsT = mapCOW(props, (prop) => walk(prop, func, depthFirst));
        if (propsT !== props) {
            const __NODE = NodeCreator(node.typename);
            node = new __NODE(node.lineno, node.colno);
            propsT.forEach((prop, i) => {
                node[node.fields[i]] = prop;
            });
        }
    }
    return (depthFirst ? func(node) || node : node);
}
function depthWalk(ast, func) {
    return walk(ast, func, true);
}
function _liftFilters(node, asyncFilters, prop) {
    const children = [];
    const walked = depthWalk(prop ? node[prop] : node, (descNode) => {
        let symbol;
        if (descNode instanceof Block) {
            return descNode;
        }
        const isAsyncFilter = descNode instanceof Filter &&
            indexOf(asyncFilters, descNode.name.value) !== -1;
        if (isAsyncFilter || descNode instanceof CallExtensionAsync) {
            symbol = new Symbol(descNode.lineno, descNode.colno, gensym());
            children.push(new FilterAsync(descNode.lineno, descNode.colno, descNode.name, descNode.args, symbol));
        }
        return symbol;
    });
    if (prop) {
        node[prop] = walked;
    }
    else {
        node = walked;
    }
    if (children.length) {
        children.push(node);
        return new NodeList(node.lineno, node.colno, children);
    }
    return node;
}
function liftFilters(ast, asyncFilters = []) {
    return depthWalk(ast, (node) => {
        if (node instanceof Output) {
            return _liftFilters(node, asyncFilters);
        }
        else if (node instanceof Set) {
            return _liftFilters(node, asyncFilters, 'value');
        }
        else if (node instanceof For) {
            return _liftFilters(node, asyncFilters, 'arr');
        }
        else if (node instanceof If) {
            return _liftFilters(node, asyncFilters, 'cond');
        }
        else if (node instanceof CallExtension) {
            return _liftFilters(node, asyncFilters, 'args');
        }
        return undefined;
    });
}
function liftSuper(ast) {
    return walk(ast, (blockNode) => {
        if (!(blockNode instanceof Block))
            return;
        let hasSuper = false;
        const symbol = gensym();
        blockNode.body = walk(blockNode.body, (node) => {
            // eslint-disable-line consistent-return
            if (node instanceof FunCall && node.name.value === 'super') {
                hasSuper = true;
                return new Symbol(node.lineno, node.colno, symbol);
            }
        });
        if (hasSuper) {
            blockNode.body.children.unshift(new Super(0, 0, blockNode.name, new Symbol(0, 0, symbol)));
        }
    });
    return ast;
}
function convertStatements(ast) {
    return depthWalk(ast, (node) => {
        if (!(node instanceof If) && !(node instanceof For)) {
            return undefined;
        }
        let isAsync = false;
        walk(node, (child) => {
            if (child instanceof FilterAsync ||
                child instanceof IfAsync ||
                child instanceof AsyncEach ||
                child instanceof AsyncAll ||
                child instanceof CallExtensionAsync) {
                isAsync = true;
                // Stop iterating by returning the node
                return child;
            }
            return undefined;
        });
        if (isAsync) {
            if (node instanceof If) {
                return new IfAsync(node.lineno, node.colno, node.cond, node.body, node.else_);
            }
            else if (node instanceof For && !(node instanceof AsyncAll)) {
                return new AsyncEach(node.lineno, node.colno, node.arr, node.name, node.body, node.else_);
            }
        }
        return undefined;
    });
}
export function transform(ast, asyncFilters = []) {
    return convertStatements(liftSuper(liftFilters(ast, asyncFilters)));
}
