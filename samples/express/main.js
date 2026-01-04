const path = require('path');
const nunjucks = require('../../dist/index');
const express = require('express');

const PORT = 13300;

const app = express();

const viewsDir = path.join(__dirname, 'views');
app.set('view engine', 'njk');
app.set('views', viewsDir);
console.warn(viewsDir);
nunjucks.configure(viewsDir, {
	autoescape: true,
	express: app,
});

// app

app.use(express.static(__dirname));

app.use(function (req, res, next) {
	res.locals.user = 'hello';
	next();
});

app.get('/', function (req, res) {
	res.render('index', {
		username: 'James Long <strong>copyright</strong>',
	});
});

app.get('/about', function (req, res) {
	res.render('about.html');
});

app.listen(PORT, function () {
	console.log('Express server running on http://localhost:' + PORT);
});
