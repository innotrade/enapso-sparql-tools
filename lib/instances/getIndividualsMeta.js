// Innotrade Enapso SPARQL Toolbox - example to read a instances
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const Joi = require('joi')
const regexValidators = require('../utils/regex-validators')

const inputSchema = {
	classObject: Joi.object().required(),
	filterEdges: Joi.array(),
	IRI: Joi.string().regex(regexValidators.IRI),
	IRI_SEPARATOR: Joi.string().length(1)
}

/**
 *
 * @param {array} classObject - target class as enapso EnapsoObject Array
 * @param {array} filterEdges - array of properties to be included on the response per each individual
 * @param {string} IRI - return only the individual that match this IRI
 */
function getIndividualsMeta(classObject, filterEdges, IRI, IRI_SEPARATOR = '#') {
	const valid = Joi.validate({ classObject, filterEdges, IRI }, inputSchema)
	if (valid.error) {
		throw new Error(valid.error.details[0].message)
	}

	let result = {}

	// is there any result row? i.e. are there any fields defined for the class?
	if (classObject.records[0]) {
		// get IRI from first row of class schema query result
		result.headers = `(?node as ?IRI)`
		result.triples = `?node a <${classObject.records[0].node}> .`

		// if only one individual per IRI is requested set a corresponding filter
		if (IRI) {
			result.triples = `
${result.triples}
filter(?node = URI("${IRI}")) .
			`
		}
		// iterate through all fields of the class
		for (let item of classObject.records) {
			let mapping = item.mapping
			if (mapping === null || mapping === undefined) {
				mapping = item.edge.substr(item.edge.indexOf(IRI_SEPARATOR) + 1)
			}
			if (filterEdges && filterEdges.indexOf(mapping) === -1) {
				continue
			}
			result.triples = `
${result.triples}
OPTIONAL {?node <${item.edge}> ?${mapping} .}
			`
			result.headers = `${result.headers} ?${mapping}`
		}
	}
	return result
}

module.exports = exports = getIndividualsMeta
