function root(env, context, frame, runtime, cb) {
	var lineno = 0;
	var colno = 0;
	var output = '';
	try {
		var parentTemplate = null;
		env.getTemplate('base.html', function (t_3, t_2) {
			if (t_3) {
				cb(t_3);
				return;
			}
			parentTemplate = t_2;
			for (var t_1 in parentTemplate.blocks) {
				context.addBlock(t_1, parentTemplate.blocks[t_1]);
			}
			output += ' Hello world\n<div id="dynamic">Inside div</div>\n\n';
			output += '\n';
			if (parentTemplate) {
				parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
			} else {
				cb(null, output);
			}
		});
	} catch (e) {
		cb(runtime.handleError(e, lineno, colno));
	}
}
