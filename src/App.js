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

const ChangeContext = createContext({})
const {Provider} = ChangeContext

const foreignObjectWidth = 140
const foreignObjectHeight = 40
const IbisPropertyEdge = props => {
	const [edgePath, labelX, labelY] = getBezierPath(props)
	const {data: {properties} = {}} = useRdfQuery('ibis', '/ibis.ttl')
	const {source, target, id, data} = props
	const {setEdges} = useContext(ChangeContext)
	const changeData = newData => {
		setEdges(edges => edges.map(
			n => n.id === id ? ({
				...n,
				data: {...n.data, ...newData},
			}) : n
		))
	}
	return (
		<>
			<path id={props.id} style={props.style} className='react-flow__edge-path' d={edgePath} markerEnd={props.markerEnd}/>
			<foreignObject
				width={foreignObjectWidth}
				height={foreignObjectHeight}
				x={labelX - foreignObjectWidth / 2}
				y={labelY - foreignObjectHeight / 2}
				className='edgebutton-foreignObject'
				requiredExtensions="http://www.w3.org/1999/xhtml"
			>
				<div>
					<select
						style={{width: foreignObjectWidth}}
						aria-label='connection-type' value={data.type} name="class" onChange={e => {
						const {value} = e.target
						changeData({type: value})
					}}>
						{Object.keys(properties ?? {}).map(value => (
							<option value={value} key={value}>{value}</option>
						))}
					</select>
				</div>
			</foreignObject>
		</>
	)
}

const SILVER_RATIO = 2.41421

const IbisClassNode = ({data, id, ...props}) => {
	const {data: {classes} = {}} = useRdfQuery('ibis', '/ibis.ttl')
	const {setNodes} = useContext(ChangeContext)
	const changeData = newData => {
		setNodes(nodes => nodes.map(
			n => n.id === id ? ({
				...n,
				data: {...n.data, ...newData},
			}) : n
		))
	}
	return (
		<>
			<Handle type='target' position='left'></Handle>
			<Handle type='source' position='right'></Handle>
			<div style={{width: '15ex', minHeight: '1em'}}>{data.label}</div>
			<NodeToolbar>
				<div style={{display: 'grid', gridTemplateColumns: `1fr ${SILVER_RATIO}fr`}}>
					<label htmlFor={`title-${id}`}>
						Title
					</label>
					<input id={`title-${id}`} value={data.label} onChange={e => {
						const {value} = e.target
						changeData({label: value})
					}}/>
					<label htmlFor={`type-${id}`}>
						Type
					</label>
					<select id={`type-${id}`} value={data.type} name="class" onChange={e => {
						const {value} = e.target
						changeData({type: value})
					}}>
						{Object.keys(classes ?? {}).map(value => (
							<option value={value} key={value}>{value}</option>
						))}
					</select>
				</div>
			</NodeToolbar>
		</>
	)
}

const ibisClassType = 'ibisClass'
const nodeTypes = {[ibisClassType]: IbisClassNode}
const ibisPropertyType = 'ibisProperty'
const edgeTypes = {[ibisPropertyType]: IbisPropertyEdge}

let id = 1
const getId = () => uuid()
const atStart = {
	markerStart: {
		type: MarkerType.ArrowClosed,
		orient: 'auto-start-reverse',
		width: 20,
		height: 20,
	},
}
//TODO this isn't working for some reason
const defaultsBySource = ({data = {}} = {}) => ({
	'ibis:Issue': {direction: atStart, edge: 'ibis:responds-to', node: 'ibis:Position'},
	'ibis:Position': {direction: atStart, edge: 'ibis:supports', node: 'ibis:Argument'},
}[data.type] ?? {edge: 'ibis:suggests', node: 'ibis:Argument', direction: {}})
const Flow = props => {
	const {classes, properties, ontologies} = props
	const reactFlowWrapper = useRef(null)
	const connectingNodeId = useRef(null)
	const [nodes, setNodes, onNodesChange] = useNodesState([{
		id: getId(),
		data: {label: 'Your issue', type: 'ibis:Issue'},
		position: {x: 100, y: 100},
		hidden: false,
		type: ibisClassType,
	}])
	const [edges, setEdges, onEdgesChange] = useEdgesState([])
	const onConnect = useCallback(
		({source, target}) => {
			const sourceNode = nodes.find(({id}) => id === source)
			const {edge: type, direction} = defaultsBySource(sourceNode)
			setEdges(eds => [
				...eds,
				{
					...direction,
					source, target, data: {type}, type: ibisPropertyType, id: getId()
				},
			])
		},
		[setEdges]
	)
	console.log(edges)
	const { project } = useReactFlow()
	const onConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);
	const onConnectEnd = useCallback(
    event => {
      const targetIsPane = event.target.classList.contains('react-flow__pane');

      if (targetIsPane) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
        const id = getId();
				console.log(nodes)
				console.log(connectingNodeId.current)
				const {node, edge, direction} = defaultsBySource(nodes.find(({id}) => id === connectingNodeId.current))
				console.log(direction)
        const newNode = {
          id,
					type: ibisClassType,
          position: project({ x: event.clientX - left - 75, y: event.clientY - top }),
          data: { label: `Node ${id}`, type: node },
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat({
					id,
					source: connectingNodeId.current,
					target: id,
					data: {type: edge},
					type: ibisPropertyType,
					...direction,
				}));
      }
    },
    [project]
  );
	const handleExport = () => {
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
			nodes,
			edges,
		}, null, 2))
		const dlAnchorElement = document.createElement('a')
		dlAnchorElement.setAttribute('href', dataStr)
		dlAnchorElement.setAttribute('download', 'swag.json')
		document.body.appendChild(dlAnchorElement)
		dlAnchorElement.click()
		dlAnchorElement.remove()
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
		<Provider value={{setEdges, setNodes}}>
			<div style={{height: '100%', width: '100%'}} ref={reactFlowWrapper}>
				<ReactFlow {...{
					nodes,
					edges,
					onNodesChange,
					onEdgesChange,
					onConnect,
					nodeTypes,
					edgeTypes,
					onConnectStart,
					onConnectEnd,
				}}>
					<Panel position='top-center'>
						<button onClick={handleExport}>export</button>
						<input onChange={handleImportJSON} type="file"/>
					</Panel>
					<Background variant='lines'></Background>
					<Controls></Controls>
				</ReactFlow>
			</div>
		</Provider>
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
