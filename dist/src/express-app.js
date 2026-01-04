"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.express = express;
const path_1 = __importDefault(require("path"));
const lib_1 = require("./lib");
function express(env, app) {
    let ext = '.html';
    function NunjucksView(_name, opts) {
        this.name = _name;
        this.path = _name;
        this.ext = path_1.default.extname(_name);
        lib_1.p.err(_name, this.ext);
        if (!this.ext) {
            this.ext = '.html';
            this.name = _name + this.ext;
            lib_1.p.err(_name, path_1.default.extname(_name));
            // throw new Error(
            // 	'No default engine was specified and no extension was provided.'
            // );
        }
    }
    NunjucksView.prototype.render = function render(opts, cb) {
        lib_1.p.log('Trying to render');
        env.render(this.name, opts, cb);
    };
    app.set('view', NunjucksView);
    app.set('nunjucksEnv', env);
    return env;
}
