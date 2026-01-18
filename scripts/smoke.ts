import path from 'node:path';
import fs from 'node:fs'
import * as Runtime from '../src/runtime';
import { Context, Environment } from '../src/environment';
import { parse } from '../src/parser';
import { transform } from '../src/transformer';
import { renderAST } from '../src/interpreter';
import { p } from '../src/lib';

import * as nunjucks from '../src/index';
import { FileSystemLoader } from '../src/loader';
const VIEWS = path.resolve(process.cwd(), 'scripts/views');


// nunjucks.configure('./views', {
// 	dev: true,
// 	watch: false,
// 	cache: false,
// });

const templates = {
  "base.html": "<title>{% block title %}Base{% endblock %}</title>{% block body %}BaseBody{% endblock %}",
  "index.html": "{% extends 'base.html' %}{% block title %}{{ title }}{% endblock %}{% block body %}Hello {{ name }}{% endblock %}",
};

const envSetup = {
	autoescape: true,
	throwOnUndefined: false,
	path: VIEWS,
}
function makeEnv() {
	const env = new Environment(envSetup);

	// add a couple baseline filters
	env.addFilter?.('upper', (s: any) => String(s).toUpperCase());
	env.addFilter?.('join', (arr: any, sep = ',') => (arr ?? []).join(sep));

	return env;
}

export async function renderView(name: string, ctx: any) {
  const env = makeEnv();
  const tpl = await env.getTemplate(name, undefined, { eagerCompile: true});
  return await new Promise<string>((resolve, reject) => {
    tpl.render(ctx, (err: any, res: string) => (err ? reject(err) : resolve(res)));
  });
}


async function renderFileDirect(name: string, ctx: any, env: Environment) {

  const src = await fs.readFileSync(path.join(VIEWS, name), 'utf8');
  const ast: any = transform(parse(src, [], env));
  return renderAST(env, ast, ctx, Runtime);
}
// async function renderString(src: string, ctx: Context, env = makeEnv()) {
// 	const ast = transform(parse(src, [], env), []); // adjust args to your parse/transform signatures
// 	return renderAST(env, ast, ctx, runtime);
// }

async function main() {
	const env = new Environment(envSetup);
	const src = 'Hello {{ name }}';
	const ast: any = transform(parse(src, [], {}));
	const out = await renderAST(env, ast, { name: 'Sam' }, Runtime);
	p.log(out);
	const viewOut = await renderFileDirect('index.html',{ name: 'Sam', title: 'Hello world' }, env)
	p.log(viewOut);
}
main();
