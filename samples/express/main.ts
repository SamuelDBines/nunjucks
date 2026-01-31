import path from 'path';
import * as nunjucks from '../../src';
import express, { request, response, NextFunction } from 'express';

const PORT = 13300;

const app = express();

const viewsDir = path.join(__dirname, 'views');

const nunev = nunjucks.configure({
	path: viewsDir,
	dev: true,
	watch: true,
	devRefresh: true,
	detectExtensions: true,
});

nunev.express(app)


// app

app.use(express.static(__dirname));

app.use(function (req, res, next) {
	res.locals.user = 'hello';
	next();
});

app.get('/', function (req, res) {
	// res.setHeader('Content')
	res.render('index', {
		username: 'James Long <strong>copyright</strong>',
	});
});
app.get('/index.json', function (req, res) {
	// res.setHeader('Content')
	res.render('index.json', {
		user: 'Sam',
	});
});
app.get('/index.yaml', function (req, res) {
	// res.setHeader('Content')
	res.render('index.yaml', {
		user: 'Sam',
	});
});

app.get('/about', function (req, res) {
	res.render('about.html', { items: [1,2,4], user: { name: 'tony' } });
});

app.get('/test-one', function (req, res) {
	res.render('test', { items: [1,2,4] });
});

app.get('/test', function (req, res) {
	res.render('test', { items: [1,2,4] });
});

app.get('/{*splat}', function (req, res) {
	// res.setHeader('Content')
	console.log(req.params.splat)
	const file = req.params.splat
	res.render(file, {
		user: 'Sam',
	});
});

app.listen(PORT, function () {
	console.log('Express server running on http://localhost:' + PORT);
});
