"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = transform;
const nodes_1 = require("./nodes");
let sym = 0;
const gensym = () => 'hole_' + sym++;
function mapCOW(arr, func) {
    let res = null;
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
function walk(ast, func, depthFirst = false) {
    if (!(ast instanceof nodes_1.Node))
        return ast;
    let node = ast;
    if (!depthFirst) {
        const nodeT = func(node);
        if (nodeT && nodeT !== node) {
            return nodeT;
        }
    }
    if (node instanceof nodes_1.NodeList) {
        const children = mapCOW(node.children, (child) => walk(child, func, depthFirst));
        if (children !== node.children) {
            node = new ((0, nodes_1.NodeCreator)(node?.typename))(node.lineno, node?.colno, children);
        }
    }
    else if (node instanceof nodes_1.CallExtension) {
        const args = walk(node.args, func, depthFirst);
        const contentArgs = mapCOW(node.contentArgs, (node) => walk(node, func, depthFirst));
        if (args !== node.args || contentArgs !== node.contentArgs) {
            node = new ((0, nodes_1.NodeCreator)(node?.typename))(node.lineno, node?.colno, node.extname, node.prop, args, contentArgs);
        }
    }
    else {
        const props = node.fields.map((field) => node[field]);
        const propsT = mapCOW(props, (prop) => walk(prop, func, depthFirst));
        if (propsT !== props) {
            node = new ((0, nodes_1.NodeCreator)(node?.typename))(node.lineno, node?.colno);
            propsT.forEach((prop, i) => {
                node[node.fields[i]] = prop;
            });
        }
    }
    return depthFirst ? func(node) || node : node;
}
function liftFilters(ast, asyncFilters = []) {
    function _liftFilters(node, asyncFilters, key) {
        const children = [];
        const walked = walk(key ? node[key] : node, (descNode) => {
            let symbol;
            if (descNode instanceof nodes_1.Block) {
                return descNode;
            }
            const isAsyncFilter = descNode instanceof nodes_1.Filter &&
                asyncFilters.indexOf(descNode.name.value) !== -1;
            if (isAsyncFilter || descNode instanceof nodes_1.CallExtensionAsync) {
                symbol = new nodes_1.Symbol(descNode.lineno, descNode?.colno, gensym());
                children?.push(new nodes_1.FilterAsync(descNode.lineno, descNode?.colno, descNode.name, descNode.args, symbol));
            }
            return symbol;
        }, true);
        if (key) {
            node[key] = walked;
        }
        else {
            node = walked;
        }
        if (children?.length) {
            children?.push(node);
            return new nodes_1.NodeList(node.lineno, node?.colno, children);
        }
        return node;
    }
    return walk(ast, (node) => {
        if (node instanceof nodes_1.Output) {
            return _liftFilters(node, asyncFilters);
        }
        else if (node instanceof Set) {
            return _liftFilters(node, asyncFilters, 'value');
        }
        else if (node instanceof nodes_1.For) {
            return _liftFilters(node, asyncFilters, 'arr');
        }
        else if (node instanceof nodes_1.If) {
            return _liftFilters(node, asyncFilters, 'cond');
        }
        else if (node instanceof nodes_1.CallExtension) {
            return _liftFilters(node, asyncFilters, 'args');
        }
        return undefined;
    }, true);
}
function liftSuper(ast) {
    return walk(ast, (block) => {
        if (!(block instanceof nodes_1.Block))
            return;
        let hasSuper = false;
        const symbol = gensym();
        block.body = walk(block.body, (node) => {
            if (node instanceof nodes_1.FunCall && node.name?.typename === 'Super') {
                hasSuper = true;
                return new nodes_1.Symbol(node.lineno, node?.colno, symbol);
            }
        });
        if (hasSuper) {
            block.body.children.unshift(new nodes_1.Super(0, 0, block.name, new nodes_1.Symbol(0, 0, symbol)));
        }
    });
    return ast;
}
function convertStatements(ast) {
    return walk(ast, (node) => {
        if (!(node instanceof nodes_1.If) && !(node instanceof nodes_1.For)) {
            return undefined;
        }
        let isAsync = false;
        walk(node, (child) => {
            if (child instanceof nodes_1.FilterAsync ||
                child instanceof nodes_1.IfAsync ||
                child instanceof nodes_1.AsyncEach ||
                child instanceof nodes_1.AsyncAll ||
                child instanceof nodes_1.CallExtensionAsync) {
                isAsync = true;
                // Stop iterating by returning the node
                return child;
            }
            return undefined;
        });
        if (isAsync) {
            if (node instanceof nodes_1.If) {
                return new nodes_1.IfAsync(node.lineno, node?.colno, node.cond, node.body, node.else_);
            }
            else if (node instanceof nodes_1.For && !(node instanceof nodes_1.AsyncAll)) {
                return new nodes_1.AsyncEach(node.lineno, node?.colno, node.arr, node.name, node.body, node.else_);
            }
        }
        return undefined;
    }, true);
}
function transform(ast, asyncFilters = []) {
    return convertStatements(liftSuper(liftFilters(ast, asyncFilters)));
}
