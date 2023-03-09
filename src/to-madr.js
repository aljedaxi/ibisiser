import {group} from './util'

const formatAsProCon = (type, label) => `* ${type === 'ibis:supports' ? 'Good, because' : 'Bad, because'} ${label}`
export const makeMadr = ({nodes, edges}) => {
	const nodesById = new Map(nodes.map(n => [n.id, n]))
	const edgesBySource = group(e => e.source)(edges)
	const edgesByTarget = group(e => e.target)(edges)
	const {
		'ibis:Issue': issues,  
		'ibis:Position': positions,
		'ibis:Argument': args,
	} = group(n => n.data.type)(nodes)
	if (issues.length !== 1) throw new Error('too-many-issues')
	const title = issues[0].data.label
	//TODO decision driver
	//TODO context and problem statement
	const prosAndCons = positions
		.map(({id, data: {label}}) => [
			`### ${label}`,
			...[...edgesBySource[id], ...edgesByTarget[id]]
				.map(e => {
					const target = [e.source, e.target].find(s => s !== id)
					return [e.data.type, nodesById.get(target)]
				})
				.filter(([_, n]) => n?.data?.type === 'ibis:Argument')
				.map(([type, n]) => formatAsProCon(type, n.data.label))
		])
		.filter(xs => xs.length > 1)
		.map(xs => xs.join('\n'))
		.join('\n\n')

	return `# ${title}

## Context and Problem Statement
// TODO!!!

## Considered Options
${positions.map(p => `* ${p.data.label}`).join('\n')}

## Decision Outcome
<!-- yet to be decided -->

## Pros and Cons of the Options

${prosAndCons}
	`
}
