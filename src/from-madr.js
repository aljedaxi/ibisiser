import {getId} from './App'
import {ibisClassType, ibisPropertyType} from './flow'

const deItemize = s => s.replace(/^\* /, '')
const deval = s => deItemize(s).replace(/^\w+, because /, '')
const dePeriodicize = s => s.replace(/\.$/, '')
const parser = iterableByLines => {
	let issueName;
	let section;
	let subsection;
	const root = {
		comments: []
	}
	let things = []
	let positions = []
	for (const l of iterableByLines) {
		if (l === '') continue
		if (l.startsWith('#')) {
			const name = l.replace(/\#+\s*/, '').toLowerCase()
			if (l.startsWith('###')) {
				subsection = name
				continue
			}
			if (l.startsWith('##')) {
				section = name
				continue
			}
			root.label = name
			continue
		}
		if (section === 'context and problem statement') {
			root.comments.push({label: l})
		}
		if (section === 'decision drivers') {
			things.push({label: deItemize(l)})
		}
		if (section === 'considered options') {
			positions.push({
				label: deItemize(l),
				comments: [],
				supports: [],
				opposes: [],
			})
		}
		if (section === 'pros and cons of the options') {
			if (l.startsWith('*')) {
				const valence = /Good, because/i.test(l) ? 'supports'
				: /Bad, because/i.test(l)                ? 'opposes'
				:                                          new Error('what')
				positions = positions.map(
					p => dePeriodicize(p.label.toLowerCase()) === subsection
						? {...p, [valence]: [...p[valence], {label: deval(l)}]}
						: p
				)
			} else {
				positions = positions.map(
					p => dePeriodicize(p.label.toLowerCase()) === subsection
						? {...p, comments: [...p.comments, {label: l}]}
						: p
				)
			}
		}
	}
	return {root, things, positions}
}

//TODO autolayout
let x = 1
let y = 1
const baseNode = type => ({label}) => ({
	id: getId(),
	data: {label, type},
	position: {x: (x++) * 100, y: (y++) * 100},
	type: ibisClassType,
})
const baseEdge = type => source => ({id: target}) => ({
	id: getId(),
	data: {type},
	source,
	target,
	type: ibisPropertyType,
})
const flowify = ({root, things, positions}) => {
	const rootNode = baseNode('ibis:Issue')(root)
	console.log(rootNode)
	const rootId = rootNode.id
	const {comments} = root
	const commentNodes = comments.map(baseNode('rdfs:Literal'))
	const commentEdges = commentNodes.map(baseEdge('rdfs:comment')(rootId))
	console.log(commentEdges)
	const thingNodes = things.map(baseNode('owl:Thing'))
	const thingEdges = thingNodes.map(baseEdge('ibis:concerns')(rootId))
	const positionNodes = positions.map(baseNode('ibis:Position'))
	const positionEdges = positionNodes.map(baseEdge('ibis:responds-to')(rootId))
	const {nodes, edges} = positions.reduce((acc, {comments, supports, opposes, label}) => {
		const rootId = positionNodes.find(p => p.data.label === label).id
		const commentNodes = comments.map(baseNode('rdfs:Literal'))
		const commentEdges = commentNodes.map(baseEdge('rdfs:comment')(rootId))
		const supportsNodes = supports.map(baseNode('ibis:Argument'))
		const supportsEdges = supportsNodes.map(baseEdge('ibis:supports')(rootId))
		const opposesNodes = opposes.map(baseNode('ibis:Argument'))
		const opposesEdges = opposesNodes.map(baseEdge('ibis:opposes')(rootId))
		return {
			nodes: [...acc.nodes, ...commentNodes, ...supportsNodes, ...opposesNodes],
			edges: [...acc.edges, ...commentEdges, ...supportsEdges, ...opposesEdges],
		}
	}, {nodes: [], edges: []})
	return {
		nodes: [...nodes, ...thingNodes, ...positionNodes, ...commentNodes, rootNode],
		edges: [...edges, ...thingEdges, ...positionEdges, ...commentEdges],
	}
}
export const parseString = s => flowify(parser(s.split('\n')))
