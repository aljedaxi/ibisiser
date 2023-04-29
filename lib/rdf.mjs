import {group} from './util.mjs'
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
export const prefix = s => Object.entries(prefixes).reduce((s, [k, v]) => s.replace(k, `${v}:`), s)

const extras = {
	properties: ['rdfs:comment'],
	classes: ['rdfs:Literal', 'owl:Thing'],
}
