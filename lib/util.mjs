export const group = (f1, f2 = x => x) => xs => xs.reduce(
	(acc, val) => {
		const key = f1(val)
		acc[key] ??= []
		acc[key].push(f2(val))
		return acc
	},
	{}
)

export const pipe = fs => x => fs.reduce((x, f) => f(x), x)
