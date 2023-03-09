import {useCallback, createContext, useContext, useState, useRef} from 'react'
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
import {useRdfQuery} from './rdf'
import ReactMarkdown from 'react-markdown'
import {v1 as uuid} from 'uuid'

const ChangeContext = createContext({})

const foreignObjectWidth = 140
const foreignObjectHeight = 40
const IbisSelect = ({children, ...rest}) => (
	<select {...rest}>
		{children.map(value => (
			<option value={value} key={value}>{value.replace('ibis:', '')}</option>
		))}
	</select>
)
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
					<IbisSelect
						style={{width: foreignObjectWidth}}
						aria-label='connection-type' value={data.type} name="class" onChange={e => {
						const {value} = e.target
						changeData({type: value})
					}}>
						{Object.keys(properties ?? {})}
					</IbisSelect>
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
	const handleDelete = () => setNodes(nodes => nodes.filter(n => n.id !== id))
	return (
		<>
			<Handle type='target' position='left'></Handle>
			<Handle type='source' position='right'></Handle>
			<div style={{width: '15ex', minHeight: '1em'}}>
				<ReactMarkdown>
					{data.label}
				</ReactMarkdown>
			</div>
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
					<IbisSelect
						id={`type-${id}`} value={data.type} name="class" onChange={e => {
						const {value} = e.target
						changeData({type: value})
					}}>
						{Object.keys(classes ?? {})}
					</IbisSelect>
					<div></div>
					<button style={{color: '#dd0000'}} onClick={handleDelete}>delete</button>
				</div>
			</NodeToolbar>
		</>
	)
}

export const ibisClassType = 'ibisClass'
const nodeTypes = {[ibisClassType]: IbisClassNode}
export const ibisPropertyType = 'ibisProperty'
const edgeTypes = {[ibisPropertyType]: IbisPropertyEdge}


const atStart = {
	markerStart: {
		type: MarkerType.ArrowClosed,
		orient: 'auto-start-reverse',
		width: 20,
		height: 20,
	},
}
//TODO this isn't working sometimes for some reason
const defaultsBySource = ({data = {}} = {}) => ({
	'ibis:Issue': {direction: atStart, edge: 'ibis:responds-to', node: 'ibis:Position'},
	'ibis:Position': {direction: atStart, edge: 'ibis:supports', node: 'ibis:Argument'},
}[data.type] ?? {edge: 'ibis:suggests', node: 'ibis:Argument', direction: {}})

const getId = () => uuid()
const {Provider} = ChangeContext
export const FlowChartLol = props => {
	const {setEdges, setNodes, children, nodes, ...rest} = props
	const reactFlowWrapper = useRef(null)
	const connectingNodeId = useRef(null)
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
				const {node, edge, direction} = defaultsBySource(nodes.find(({id}) => id === connectingNodeId.current))
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
	return (
		<Provider value={{setEdges, setNodes}}>
			<div style={{height: '100%', width: '100%'}} ref={reactFlowWrapper}>
				<ReactFlow {...{
					...rest,
					nodes,
					onConnectStart,
					onConnectEnd,
					onConnect,
					nodeTypes,
					edgeTypes,
				}}>
					{children}
					<Background variant='lines'></Background>
					<Controls></Controls>
				</ReactFlow>
			</div>
		</Provider>
	)
}
