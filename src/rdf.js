export const extras = {
	properties: ['rdfs:comment'],
	classes: ['rdfs:Literal', 'owl:Thing'],
}

const classesSet = new Set(extras.classes)
const predicatesSet = new Set(extras.properties)
export const optionsByClass = 
	[...document.querySelectorAll('datalist')].reduce((acc, e) => {
		const xs = e.id.replace(/-options$/, '').split('-')
		const classFrom = xs.slice(0, 2).join(':')
		const classTo = xs.slice(2).join(':')
		classesSet.add(classFrom)
		classesSet.add(classTo)
		for (const option of e.options) predicatesSet.add(option.value)
		acc[classFrom] ??= {}
		acc[classFrom][classTo] ??= []
		acc[classFrom][classTo].push(...[...e.options].map(e => e.value))
		return acc
	}, {})

export const predicates = [...predicatesSet].sort()
export const classes = [...classesSet].sort()
