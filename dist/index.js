"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderString = exports.render = exports.compile = exports.reset = exports.transformer = exports.compiler = exports.nodes = exports.parser = exports.lexer = exports.lib = void 0;
exports.configure = configure;
const lib_1 = require("./src/lib");
const environment_1 = require("./src/environment");
const loader_1 = require("./src/loader");
__exportStar(require("./src/runtime"), exports);
exports.lib = __importStar(require("./src/lib"));
exports.lexer = __importStar(require("./src/lexer"));
exports.parser = __importStar(require("./src/parser"));
exports.nodes = __importStar(require("./src/nodes"));
exports.compiler = __importStar(require("./src/compiler"));
// Maybe should be private?
exports.transformer = __importStar(require("./src/transformer"));
let e = new environment_1.Environment();
function configure(templatesPath = '.', opts = {}) {
    let tmp = opts;
    if ((0, lib_1.isObject)(templatesPath)) {
        tmp = templatesPath;
    }
    const TemplateLoader = new loader_1.FileSystemLoader([templatesPath], {
        watch: opts.watch,
        noCache: opts.noCache,
    });
    // if (FileSystemLoader) {
    // 	TemplateLoader = new FileSystemLoader([templatesPath], {
    // 		watch: opts.watch,
    // 		noCache: opts.noCache,
    // 	});
    // }
    // else if (WebLoader) {
    // 	TemplateLoader = new WebLoader(templatesPath, {
    // 		useCache: opts.web && opts.web.useCache,
    // 		async: opts.web && opts.web.async,
    // 	});
    // }
    if (!TemplateLoader) {
        throw 'NO LOADER FOUND';
        return;
    }
    opts.loaders = [TemplateLoader];
    e = new environment_1.Environment(opts);
    if (opts && opts.express) {
        e.express(opts.express);
    }
    return e;
}
const reset = () => {
    e = new environment_1.Environment();
};
exports.reset = reset;
const compile = (src, env, path, eagerCompile) => {
    if (!e) {
        configure();
    }
    return new environment_1.Template(src, env, path, eagerCompile);
};
exports.compile = compile;
const render = (src, ctx, cb) => {
    if (!e) {
        configure();
    }
    return e.render(src, ctx, cb);
};
exports.render = render;
const renderString = (src, ctx, cb) => {
    if (!e) {
        configure();
    }
    return e.renderString(src, ctx, cb);
};
exports.renderString = renderString;
