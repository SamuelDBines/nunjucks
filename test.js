function root(env, context, frame, runtime, cb) {
var lineno = 0;
var colno = 0;
var output = "";
try {
var parentTemplate = null;
output += "<!doctype html>\n<title>";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("title"))(env, context, frame, runtime, function(t_2,t_1) {
 
                        if(t_2) { 
                                cb(t_2); 
                        return;
                 }output += t_1;
output += "</title>\n<body>\n  ";
(parentTemplate ? function(e, c, f, r, cb) { cb(""); } : context.getBlock("body"))(env, context, frame, runtime, function(t_4,t_3) {
 
                        if(t_4) { 
                                cb(t_4); 
                        return;
                 }output += t_3;
output += "\n</body>";
if(parentTemplate) {
parentTemplate.rootRenderFunc(env, context, frame, runtime, cb);
} else {
cb(null, output);
}
})});
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}