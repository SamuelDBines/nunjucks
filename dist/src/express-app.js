import path from 'path';
export function express(env, app) {
    let name = '', _path = '', ext = '', defaultEngine = 'express';
    function NunjucksView(_name, opts) {
        name = _name;
        _path = _name;
        ext = path.extname(name);
        if (!ext && !defaultEngine) {
            throw new Error('No default engine was specified and no extension was provided.');
        }
        if (!ext) {
            name += ext = (defaultEngine[0] !== '.' ? '.' : '') + defaultEngine;
        }
    }
    NunjucksView.prototype.render = function render(opts, cb) {
        env.render(this.name, opts, cb);
    };
    app.set('view', NunjucksView);
    app.set('nunjucksEnv', env);
    return env;
}
export default express;
