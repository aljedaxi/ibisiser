import fs from 'node:fs/promises'
import {prefix} from '../lib/rdf.mjs'
import {RdfaParser} from 'rdfa-streaming-parser'
import {group} from '../lib/util.mjs'

const myParser = new RdfaParser({})
const data = []
myParser
	.on('data', datum => data.push(datum))
	.on('error', console.error)

myParser.write(await fs.readFile(process.argv[2], 'utf-8'))
myParser.end()
const dataList = ([k, v]) => (
	`<datalist id="${prefix(k).replace(/:/g, '-')}-options">${
		v.map(s => `<option value="${prefix(s)}"/>`).join('')
	}</datalist>`
)

const getClassPropertyOptions = () => {
	const domain = data.filter(d => /domain/i.test(d.predicate.value))
	const range = data.filter(d => /range/i.test(d.predicate.value))
	const o = Object.fromEntries(domain.map(o => [o.subject.value, o]))
	// range.forEach(({subject, object, predicate}) => {
	// 	o[subject.value].range = new Set([object.value])
	// })
	const fromTo = range
		.reduce((acc, {subject, object, predicate}) => {
			acc[object.value] ??= []
			acc[object.value].push(subject.value)
			return acc
		}, {})
	const domainRangeMeowMeows = range.map(
		({subject, object, predicate}) => {
			const [classFrom, relation, classTo] = [object, subject, o[subject.value].object]
				.map(o => o.value)
				.map(prefix)
			return {classFrom, relation, classTo}
		}
	)
	return Object.entries(
			group(o => o.classFrom)(domainRangeMeowMeows)
		).flatMap(([classFrom, xs]) => 
			Object.entries(group(o => o.classTo, o => o.relation)(xs))
				.map(([classTo, relations]) => [
					`${classFrom}-${classTo}`,
					relations,
				])
				.map(dataList)
		).join('')

	// return Object.fromEntries(
	// 	Object.entries(
	// 		group(o => o.classFrom)(domainRangeMeowMeows)
	// 	).map(([classFrom, xs]) => [
	// 		classFrom,
	// 		xs.reduce((acc, o) => {
	// 			acc[o.classTo] ??= []
	// 			acc[o.classTo].push(o.relation)
	// 			return acc
	// 		}, {})
	// 	])
	// )

	// return Object.entries(fromTo).map(dataList).join('')
}

console.log(getClassPropertyOptions())
