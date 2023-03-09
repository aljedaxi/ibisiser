import N3 from 'n3'
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'
import {group} from './util'
const prefixes = {
	'http://purl.org/ontology/bibo/'             : 'bibo',
	'http://purl.org/dc/terms/'                  : 'dct' ,
	'http://xmlns.com/foaf/0.1/'                 : 'foaf',
	'https://vocab.methodandstructure.com/ibis#' : 'ibis',
	'http://www.w3.org/2002/07/owl#'             : 'owl' ,
	'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf' ,
	'http://www.w3.org/ns/rdfa#'                 : 'rdfa',
	'http://www.w3.org/2000/01/rdf-schema#'      : 'rdfs',
	'http://www.w3.org/2004/02/skos/core#'       : 'skos',
	'http://purl.org/vocab/vann/'                : 'vann',
	'http://www.w3.org/1999/xhtml/vocab#'        : 'xhv' ,
	'http://www.w3.org/2001/XMLSchema#'          : 'xsd' ,
}
const prefixesByPrefix = Object.fromEntries(Object.entries(prefixes).map(([k, v]) => [v, k]))
const prefix = s => Object.entries(prefixes).reduce((s, [k, v]) => s.replace(k, `${v}:`), s)

const parser = new N3.Parser()

const extras = {
	properties: ['rdfs:comment'],
	classes: ['rdfs:Literal'],
}

const parseAsync = s => {
	const data = parser.parse(s)
	const ibisTerms = data.reduce(
		(acc, {_subject, _object, _predicate}) => {
			const {id: subject} = _subject
			const {id: predicate} = _predicate
			const {id: object} = _object
			if (!subject.startsWith(prefixesByPrefix.ibis)) return acc
			const key = subject.replace(prefixesByPrefix.ibis, 'ibis:')
			acc[key] = {...(acc[key] ?? {}), [prefix(predicate)]: object}
			return acc
		},
		{}
	)
	const {
		'owl:Class': classes,
		'owl:ObjectProperty': properties,
		'owl:Ontology': ontologies,
	} = group(([k, v]) => prefix(v['rdf:type']))(Object.entries(ibisTerms))
	return {classes: Object.fromEntries(classes),
		properties: Object.fromEntries(properties),
		ontologies: Object.fromEntries(ontologies),
	}
}

export const useRdfQuery = (stuff, url, ...otherStuff) => useQuery(
	stuff,
	() => fetch(url).then(r => r.text()).then(parseAsync),
	...otherStuff
)

export const useRdfTypes = (stuff, url, ...otherStuff) => {
	const {data = {}, ...rest} = useQuery(
		stuff,
		() => fetch(url).then(r => r.text()).then(parseAsync),
		...otherStuff
	)
	return {...rest, data: Object.fromEntries(
		Object.entries(data).map(([k, v]) => [
			k,
			[...Object.keys(v), ...extras[k] ?? []],
		])
	)}
}
