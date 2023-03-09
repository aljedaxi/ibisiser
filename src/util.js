export const group = f => xs => xs.reduce(
	(acc, val) => {
		const key = f(val)
		acc[key] = [...(acc[key] ?? []), val]
		return acc
	},
	{}
)

export const pipe = fs => x => fs.reduce((x, f) => f(x), x)
