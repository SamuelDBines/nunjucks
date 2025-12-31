let start;

const mark = () => {
	start = process.hrtime.bigint(); // high precision
};

const elapsed_time = function (note) {
	const end = process.hrtime.bigint();
	const ms = Number(end - start) / 1e6;
	console.log(`${ms.toFixed(3)} ms - ${note}`);
};

const hasOwnProp = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const keys_ = (obj) => {
	const arr = [];
	for (let k in obj) {
		// if (hasOwnProp(obj, k)) {
		arr.push(k);
		// }
	}
	return arr;
};

mark();
const testObject = Object.fromEntries(
	Array.from({ length: 1000 }, (_, i) => [String(i + 1), ''])
);
elapsed_time('created object');

mark();
const ks = keys_(testObject);
elapsed_time('keys_()');
// console.log('keys:', ks);
// console.log('keys length:', ks.length);
// console.log('first/last:', ks[0], ks[ks.length - 1]);

mark();
const obkes = Object.keys(testObject);
elapsed_time('Object_keys_()');
// console.log('keys:', obkes);
// console.log('keys length:', obkes.length);

function parentWrap(parent, prop) {
	if (typeof parent !== 'function' || typeof prop !== 'function') return prop;
	console.log('Here');
	return function () {
		const tmp = this.parent;
		console.log('tmp:', tmp);

		// Set parent to the previous method, call, and restore
		this.parent = parent;
		const res = prop.apply(this, arguments);
		this.parent = tmp;
		console.log(res);
		return res;
	};
}

parentWrap(
	() => {
		console.log('heelo');
	},
	() => {
		console.log('prop');
	}
)();
