// Innotrade Enapso SPARQL Toolbox
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const Joi = require('joi')
const validURL = require('../utils/validate-url')
const regexValidators = require('../utils/regex-validators')

const inputSchema = {
	classIRI: Joi.string().regex(regexValidators.IRI).required(),
	namedGraph: Joi.string().min(1),
	mappingProperty: Joi.string().min(1)
}

/**
 *
 * @param {string} classIRI - target class IRI
 * @param {string} namedGraph - namedGraph where target class is located
 * @param {string} mappingProperty - optional base mapping property
 */
function getClassSchemaMeta(classIRI, namedGraph, mappingProperty) {
	const valid = Joi.validate({ classIRI, namedGraph, mappingProperty }, inputSchema)
	if (valid.error) { throw new Error(valid.error.details[0].message) }

	if (validURL(classIRI)) {
		classIRI = `<${classIRI}>`
	}

	let triples = `   
bind(${classIRI} as ?node ) .

?node  (rdfs:subClassOf|(owl:intersectionOf/rdf:rest*/rdf:first))* ?restriction .
filter (isBlank(?restriction))

?restriction  owl:onProperty ?edge . 
?restriction  (owl:onClass|owl:onDataRange|owl:someValuesFrom) ?filler .

OPTIONAL { ?restriction owl:someValuesFrom ?some } .
OPTIONAL { ?restriction owl:minQualifiedCardinality ?min } .
OPTIONAL { ?restriction owl:qualifiedCardinality ?exactly } .
OPTIONAL { ?restriction owl:maxQualifiedCardinality ?max } . 

OPTIONAL {
	?axiom owl:annotatedSource ?node .
	?axiom a owl:Axiom .
	?axiom owl:annotatedTarget ?restrictionAnnotation .

	?restrictionAnnotation owl:onProperty ?edge . 
	?restrictionAnnotation (owl:onClass|owl:onDataRange|owl:someValuesFrom) ?filler .

	OPTIONAL { ?restrictionAnnotation owl:someValuesFrom ?some } .
	OPTIONAL { ?restrictionAnnotation owl:minQualifiedCardinality ?min } .
	OPTIONAL { ?restrictionAnnotation owl:qualifiedCardinality ?exactly } .
	OPTIONAL { ?restrictionAnnotation owl:maxQualifiedCardinality ?max } .  

	${mappingProperty ? `?axiom ${mappingProperty} ?mapping .` : ``} 
} 

BIND( IF( ?some != "" , concat("some_", str(?some) ), "") as ?restrictionType ) .
BIND( IF( ?exactly > 0 , concat("exactly_",str(?exactly)), "") as ?restrictionType ) .
BIND( IF( ?min > 0 , concat("min_",str(?min)), "") as ?restrictionType ) .
BIND( IF( ?max > 0 , concat("max_",str(?max)), "") as ?restrictionType ) . 
	`
	if (namedGraph !== null && namedGraph !== undefined && namedGraph !== '') {
		triples = `
          GRAPH <${namedGraph}> {
          ` + triples + ` 
        }`
	}

	let headers = `?node ?edge ?filler ?mapping ?min ?max ?some ?exactly`
	// Return query to ask for the given class schema
	return { headers, triples }
}

module.exports = exports = getClassSchemaMeta
