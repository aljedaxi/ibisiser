import {useCallback, createContext, useContext, useState, useRef} from 'react'
import logo from './logo.svg';
import './App.css';
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
import {ibisClassType, FlowChartLol} from './flow'

const getId = () => uuid()
const download = (dataStr, fileName) => {
	const dlAnchorElement = document.createElement('a')
	dlAnchorElement.setAttribute('href', dataStr)
	dlAnchorElement.setAttribute('download', fileName)
	document.body.appendChild(dlAnchorElement)
	dlAnchorElement.click()
	dlAnchorElement.remove()
}
const Flow = props => {
	const {classes, properties, ontologies} = props
	const [nodes, setNodes, onNodesChange] = useNodesState([{
		id: getId(),
		data: {label: 'Your issue', type: 'ibis:Issue'},
		position: {x: 100, y: 100},
		hidden: false,
		type: ibisClassType,
	}])
	const [edges, setEdges, onEdgesChange] = useEdgesState([])
	const handleExportJSON = () => {
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
			nodes,
			edges,
		}, null, 2))
		download(dataStr, 'swag.json')
	}
	const handleExportMADR = () => {
		download('data:text/markdown;charset=utf-8,' + encodeURIComponent(makeMadr({nodes, edges})), 'swag.md')
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
    		<div className="App">
					<Turtler></Turtler>
    		</div>
    	</QueryClientProvider>
    </ReactFlowProvider>
  );
}

export default App;
