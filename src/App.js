import {QueryClient, QueryClientProvider} from 'react-query'
import {useRdfQuery} from './rdf'
import {
	ReactFlowProvider,
	useNodesState,
	useEdgesState,
	Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {v1 as uuid} from 'uuid'
import {makeMadr} from './to-madr'
import {Node, Edge, FlowChartLol} from './flow'
import {parseString} from './from-madr'
import dagre from 'dagre'

export const getId = () => uuid()
const download = (dataStr, fileName) => {
	const dlAnchorElement = document.createElement('a')
	dlAnchorElement.setAttribute('href', dataStr)
	dlAnchorElement.setAttribute('download', fileName)
	document.body.appendChild(dlAnchorElement)
	dlAnchorElement.click()
	dlAnchorElement.remove()
}
const makeFileURIComponent = mimeType => string => `data:${mimeType};charset=utf-8,${encodeURIComponent(string)}`
const issue = {
	...(new Node(undefined, {position: {x: 100, y: 100}}).node),
	data: {label: 'Your issue', type: 'ibis:Issue'},
}
const description = {
	...(new Node(undefined, {position: {x: 400, y: 150}}).node),
	data: {label: 'A description of your issue', type: 'rdfs:Literal'},
}
const startingNodes = [issue, description]
const startingEdges = [{...new Edge(issue, description), data: {type: 'rdfs:comment'}}]
const Flow = props => {
	const [nodes, setNodes, onNodesChange] = useNodesState(startingNodes)
	const [edges, setEdges, onEdgesChange] = useEdgesState(startingEdges)
	const root = nodes.find(n => n.data.type === 'ibis:Issue')
	const defaultFileName = root?.data?.label?.replace(/\s/g, '-').toLowerCase()
	const handleExportJSON = () => {
		download(
			makeFileURIComponent('text/json')(JSON.stringify({nodes, edges,}, null, 2)),
			`${defaultFileName}.json`
		)
	}
	const handleExportMADR = () => {
		download(
			makeFileURIComponent('text/markdown')(makeMadr({nodes, edges})),
			`${defaultFileName}.md`
		)
	}
	const handleImport = e => {
		Promise.all([...e.target.files].map(async f => ({text: await f.text(), name: f.name})))
			.then(([{text: s, name}, ...rest]) => {
				if (rest.length) {
					console.error('ignoring:', rest)
				}
				if (name.endsWith('json')) {
					const {edges, nodes} = JSON.parse(s)
					setEdges(edges)
					setNodes(nodes)
				}
				if (name.endsWith('.md')) {
					const {edges, nodes} = parseString(s)
					const dagreGraph = new dagre.graphlib.Graph()
					dagreGraph.setDefaultEdgeLabel(() => ({}))
					const nodeWidth = 172
					const nodeHeight = 172
					const width = nodeWidth
					const height = nodeHeight

					dagreGraph.setGraph({rankdir: 'LR'})
					nodes.forEach(n => dagreGraph.setNode(n.id, {width, height}))
					edges.forEach(e => dagreGraph.setEdge(e.source, e.target))
					dagre.layout(dagreGraph)

					setNodes(nodes.map(n => {
						const dNode = dagreGraph.node(n.id)
						return {
							...n,
							position: {
								x: dNode.x - nodeWidth / 2,
								y: dNode.y - nodeHeight / 2,
							}
						}
					}))
					setEdges(edges)
				}
			})
	}
	return (
		<FlowChartLol {...{
			setEdges,
			setNodes,
			nodes,
			edges,
			onNodesChange,
			onEdgesChange,
		}}>
			<Panel position='top-center'>
				<button onClick={handleExportJSON}>export JSON</button>
				<button onClick={handleExportMADR}>export MADR</button>
				<input onChange={handleImport} type="file"/>
			</Panel>
		</FlowChartLol>
	)
}

const queryClient = new QueryClient()

const Turtler = () => {
	const {data = {}} = useRdfQuery('ibis', '/ibis.ttl')
	const {classes, properties, ontologies} = data
	return (
		<Flow {...{classes, properties, ontologies}}>
		</Flow>
	)
}

function App() {
  return (
    <ReactFlowProvider>
    	<QueryClientProvider client={queryClient}>
				<Turtler></Turtler>
    	</QueryClientProvider>
    </ReactFlowProvider>
  );
}

export default App;
