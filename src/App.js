import {useCallback, createContext, useContext, useState, useRef} from 'react'
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'
import {useRdfQuery} from './rdf'
import ReactFlow, {
	ReactFlowProvider,
	Controls,
	useNodesState,
	useEdgesState,
	Background,
	addEdge,
	Handle,
	Position,
	NodeToolbar,
	getBezierPath,
	useReactFlow,
	MarkerType,
	Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {v1 as uuid} from 'uuid'
import ReactMarkdown from 'react-markdown'
import {makeMadr} from './to-madr'
import {ibisClassType, ibisPropertyType, FlowChartLol} from './flow'

const getId = () => uuid()
const download = (dataStr, fileName) => {
	const dlAnchorElement = document.createElement('a')
	dlAnchorElement.setAttribute('href', dataStr)
	dlAnchorElement.setAttribute('download', fileName)
	document.body.appendChild(dlAnchorElement)
	dlAnchorElement.click()
	dlAnchorElement.remove()
}
const makeFileURIComponent = mimeType => string => `data:${mimeType};charset=utf-8,${encodeURIComponent(string)}`
const startingNodes = [
	{
		id: getId(),
		data: {label: 'Your issue', type: 'ibis:Issue'},
		position: {x: 100, y: 100},
		type: ibisClassType,
	},
	{
		id: getId(),
		data: {label: 'A description of your issue', type: 'rdfs:Literal'},
		position: {x: 400, y: 150},
		type: ibisClassType,
	}
]
const startingEdges = [
	{
		id: getId(),
		data: {type: 'rdfs:comment'},
		source: startingNodes.find(n => n.data.type === 'ibis:Issue').id,
		target: startingNodes.find(n => n.data.type === 'rdfs:Literal').id,
		type: ibisPropertyType,
	}
]
const Flow = props => {
	const {classes, properties, ontologies} = props
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
	const handleImportJSON = e => {
		Promise.all([...e.target.files].map(f => f.text()))
			.then(([s, ...rest]) => {
				if (rest.length) {
					console.error('ignoring:', rest)
				}
				const {edges, nodes} = JSON.parse(s)
				setEdges(edges)
				setNodes(nodes)
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
				<input onChange={handleImportJSON} type="file"/>
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
