import {group, pipe} from './util'

const periodical = s => s.endsWith('.') ? s : s + '.'
const capitalized = s => `${s[0].toUpperCase()}${s.slice(1)}`
const socialized = s => `${s[0].toLowerCase()}${s.slice(1)}`
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
	} = group(n => n.data.type)(nodes)
	if (issues.length !== 1) throw new Error('too-many-issues')
	const root = issues[0]
	const title = root.data.label
	//TODO decision driver
	const prosAndCons = positions
		.map(({id, data: {label}}) => [
			`### ${label}`,
			...findConnected(id, 'ibis:Argument')
				.map(([type, n]) => formatAsProCon(type, n.data.label))
		])
		.filter(xs => xs.length > 1)
		.map(xs => xs.join('\n'))
		.join('\n\n')

	return `# ${title}

## Context and Problem Statement
${findConnected(root.id, 'rdfs:comment')
	.map(([_, n]) => n.data?.label ?? '')
	.map(pipe([capitalized, periodical]))
	.join('\n\n')}

## Considered Options
${positions.map(p => `* ${periodical(capitalized(p.data.label))}`).join('\n')}

## Decision Outcome
<!-- yet to be decided -->

## Pros and Cons of the Options

${prosAndCons}
	`
}
