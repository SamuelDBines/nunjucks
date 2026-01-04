import * as Runtime from '../nunjucks-ts/src/runtime';
import { Environment } from '../nunjucks-ts/src/environment';
import { parse } from '../nunjucks-ts/src/parser';
import { transform } from '../nunjucks-ts/src/transformer';
import { renderAST } from '../nunjucks-ts/src/interpreter';
import { p } from '../nunjucks-ts/src/lib';

async function main() {
	const env = new Environment({ autoescape: false });
	const src = 'Hello {{ name }}';
	const ast: any = transform(parse(src, [], {}), []);
	const out = await renderAST(env, ast, { name: 'Sam' }, Runtime);
	p.log(out);
}
main();
