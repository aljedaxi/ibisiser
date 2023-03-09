import {group, pipe} from './util'

const periodical = s => s.endsWith('.') ? s : s + '.'
const capitalized = s => `${s[0].toUpperCase()}${s.slice(1)}`
const socialized = s => `${s[0].toLowerCase()}${s.slice(1)}`
const itemized = s => `* ${s}`
const getLabel = n => n?.data?.label ?? ''
const stdItem = pipe([getLabel, capitalized, periodical, itemized])
const formatAsProCon = (type, label) => `* ${type === 'ibis:supports' ? 'Good, because' : 'Bad, because'} ${periodical(socialized(label))}`
export const makeMadr = ({nodes, edges}) => {
	const nodesById = new Map(nodes.map(n => [n.id, n]))
	const edgesBySource = group(e => e.source)(edges)
	const edgesByTarget = group(e => e.target)(edges)
	const findConnected = (id, property) => {
		const edges = [...edgesBySource[id] ?? [], ...edgesByTarget[id] ?? []]
			.map(e => {
				const target = [e.source, e.target].find(s => s !== id)
				return [e.data.type, nodesById.get(target)]
			})
		return property
			? edges.filter(([eType, n]) => eType === property || n?.data?.type === property)
			: edges
	}
	const {
		'ibis:Issue': issues = [],
		'ibis:Position': positions = [],
		'ibis:Argument': args = [],
		'rdfs:Literal': literals = [],
		'owl:Thing': things = [],
	} = group(n => n.data.type)(nodes)
	if (issues.length !== 1) throw new Error('too-many-issues')
	const root = issues[0]
	const title = root.data.label
	const decisionDrivers = findConnected(root.id, 'owl:Thing')
		.map(([_, n]) => stdItem(n))
	console.log(decisionDrivers)
	const prosAndCons = positions
		.map(({id, data: {label}}) => {
			const description = findConnected(id, 'rdfs:comment').map(([_, n]) => periodical(capitalized(getLabel(n))))
			const args = findConnected(id, 'ibis:Argument').map(([type, n]) => formatAsProCon(type, n.data.label))
			return [
				`### ${capitalized(label)}`,
				...description,
				...(description.length > 0 && args.length > 0) ? [''] : [],
				...args,
			]
		})
		.filter(xs => xs.length > 1)
		.map(xs => xs.join('\n'))
		.join('\n\n')

	return `# ${title}

## Context and Problem Statement
${findConnected(root.id, 'rdfs:comment')
	.map(([_, n]) => getLabel(n))
	.map(pipe([capitalized, periodical]))
	.join('\n\n')}

${decisionDrivers.length > 0   ? `## Decision Drivers
${decisionDrivers.join('\n')}` : ''}

## Considered Options
${positions.map(stdItem).join('\n')}

## Decision Outcome
<!-- yet to be decided -->

## Pros and Cons of the Options

${prosAndCons}
	`
}
