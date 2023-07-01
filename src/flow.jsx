import {useCallback, useState, createContext, useContext, useRef, Fragment} from 'react'
import ReactFlow, {
	Controls,
	Background,
	Handle,
	NodeToolbar,
	getBezierPath,
	useReactFlow,
	MarkerType,
} from 'reactflow'
import {predicates, classes, optionsByClass} from './rdf'
import ReactMarkdown from 'react-markdown'
import {v1 as uuid} from 'uuid'

const DialogContext = createContext({})
const ChangeContext = createContext({})
const defix = s => s.replace(/^\w+:/, '')

const foreignObjectWidth = 140
const foreignObjectHeight = 40
const IbisSelect = ({children, ...rest}) => (
	<select {...rest}>
		{children.map(value => (
			<option value={value} key={value}>{defix(value)}</option>
		))}
	</select>
)
const IbisPropertyEdge = props => {
	const [edgePath, labelX, labelY] = getBezierPath(props)
	const {id, data} = props
	const options = optionsByClass[data.sourceType]?.[data.targetType] ?? predicates
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
						aria-label='connection-type'
						value={data.type}
						name="class"
						onChange={e => {
							const {value} = e.target
							changeData({type: value})
						}}
					>
						{options ?? []}
					</IbisSelect>
				</div>
			</foreignObject>
		</>
	)
}

const SILVER_RATIO = 2.41421

const EditorDialog = props => {
	const {node, onChange} = props
	const {edges, nodes} = useContext(ChangeContext)
	if (!node) return null
	const {id, data} = node
	const myEdge = edges.find(e => e.target === id)
	const mySource = nodes.find(n => n.id === myEdge?.source)
	const permissableClasses = Object.keys(optionsByClass[mySource?.data.type] ?? {})
	return (
		<form style={{display: 'grid', gridTemplateColumns: `1fr ${SILVER_RATIO}fr`}} onSubmit={e => onChange(new FormData(e.target))} method='dialog'>
			<label htmlFor={`label-${id}`}>
				Label
			</label>
			<textarea id={`label-${id}`} defaultValue={data.label} name='label'/>
			<label htmlFor={`type-${id}`}>
				Type
			</label>
			<IbisSelect id={`type-${id}`} defaultValue={data.type} name="type" >
				{permissableClasses.length ? permissableClasses : classes}
			</IbisSelect>
			<button onClick={e => {
				e.preventDefault()
				onChange(undefined)
			}}>cancel</button>
			<button type='submit'>submit</button>
		</form>
	)
}

const IbisClassNode = ({data, id, ...props}) => {
	const {setNodes, nodes, edges, changeNodeData} = useContext(ChangeContext)
	const {handleOpenDialog} = useContext(DialogContext)
	const myEdge = edges.find(e => e.target === id)
	const mySource = nodes.find(n => n.id === myEdge?.source)
	const permissableClasses = Object.keys(optionsByClass[mySource?.data.type] ?? {})
	const handleDelete = () => setNodes(nodes => nodes.filter(n => n.id !== id))
	const handleSubmit = e => {
		e.preventDefault()
		const newData = Object.fromEntries(new FormData(e.target).entries())
		changeNodeData(id, newData)
	}
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
				<form onSubmit={handleSubmit} style={{display: 'grid', gridTemplateColumns: `1fr ${SILVER_RATIO}fr`}}>
					<label htmlFor={`label-${id}`}>Label</label>
					<input id={`label-${id}`} defaultValue={data.label} name='label'/>
					<label htmlFor={`type-${id}`}>Type</label>
					<IbisSelect id={`type-${id}`} defaultValue={data.type} name='type'>
						{permissableClasses.length ? permissableClasses : classes}
					</IbisSelect>
					<div></div>
					<button type='submit'>save</button>
					<div></div>
					<div style={{display: 'grid', gridTemplateColumns: `1fr ${SILVER_RATIO}fr`}}>
						<button
							disabled={data.type === 'ibis:Issue' && nodes.filter(n => n.data.type === 'ibis:Issue').length < 2}
							style={{color: '#dd0000'}}
							onClick={handleDelete}
						>
							delete
						</button>
						<button onClick={() => handleOpenDialog(id)}>
							open editor dialog
						</button>
					</div>
				</form>
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
export function Edge(fromNode, toNode, {type} = {}) {
	const {edge, direction} = defaultsBySource(fromNode)
	Object.assign(this, {
		id: toNode.id,
		source: fromNode.id,
		target: toNode.id,
		data: {
			type: type ?? edge,
			sourceType: fromNode.data.type,
			targetType: toNode.data.type,
		},
		type: ibisPropertyType,
		...direction,
	})
}
export function Node(fromNode, {position}) {
	const {node} = defaultsBySource(fromNode)
	const id = getId();
	this.node = {
		id,
		type: ibisClassType,
		position: position,
		data: { label: `Node ${id}`, type: node },
	};
	if (!fromNode) return this
	this.edge = new Edge(fromNode, this.node);
}
const DialogProvider = props => {
	const {children, nodes, changeNodeData} = props
	const dialog = useRef()
	const [id, setId] = useState()
	const activeNode = nodes.find(n => n.id === id)
	const {Provider} = DialogContext
	const handleChange = newData => {
		if (newData) changeNodeData(id, Object.fromEntries(newData.entries()))
		setId(undefined)
		dialog.current.close()
	}
	return (
		<Fragment>
			<dialog ref={dialog}>
				<EditorDialog onChange={handleChange} node={activeNode}></EditorDialog>
			</dialog>
			<Provider value={{
				handleOpenDialog: newId => {
					setId(newId)
					dialog.current.showModal()
				},
			}}>
				{children}
			</Provider>
		</Fragment>
	)
}
export const FlowChartLol = props => {
	const {setEdges, setNodes, children, edges, nodes, ...rest} = props
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
				const fromNode = nodes.find(({id}) => id === connectingNodeId.current)
				const {node: newNode, edge: newEdge} = new Node(
					fromNode,
					{position: project({x: event.clientX - left - 75, y: event.clientY - top })}
				)

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat(newEdge));
      }
    },
    [project, nodes, setEdges, setNodes]
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
		[setEdges, nodes]
	)
	const {Provider} = ChangeContext
	const changeNodeData = (id, newData) => {
		setNodes(nodes => nodes.map(
			n => n.id === id ? ({
				...n,
				data: {...n.data, ...newData},
			}) : n
		))
		if (newData.type) {
			setEdges(edges => edges.map(
				e => e.source === id ? {...e, data: {...e.data, sourceType: newData.type}}
				:    e.target === id ? {...e, data: {...e.data, targetType: newData.type}}
				:                      e
			))
		}
	}
	return (
		<Provider value={{edges, nodes, setEdges, setNodes, changeNodeData}}>
			<DialogProvider {...{nodes, changeNodeData}}>
				<div style={{height: '100%', width: '100%'}} ref={reactFlowWrapper}>
					<ReactFlow {...{
						...rest,
						edges,
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
			</DialogProvider>
		</Provider>
	)
}
