// Innotrade Enapso SPARQL Toolbox - example to read a class schema
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const EnapsoGraphDBClient = require('enapso-graphdb-client')
const config = require('./examples.config')

const { getClassSchemaMeta, buildSelectQuery } = require('../index')
const CLASS_IRI = 'http://ont.enapso.com/test#Person'
const NAMED_GRAPH = 'http://ont.enapso.com/test'

// the prefixes for all SPARQL queries
const PREFIXES = [
	EnapsoGraphDBClient.PREFIX_OWL,
	EnapsoGraphDBClient.PREFIX_RDF,
	EnapsoGraphDBClient.PREFIX_RDFS,
	EnapsoGraphDBClient.PREFIX_XSD,
	{
		prefix: "et",
		iri: "http://ont.enapso.com/test#"
	}
]

// instantiate the GraphDB endpoint
var graphDBEndpoint = new EnapsoGraphDBClient.Endpoint({
	baseURL: config.GRAPHDB_BASE_URL,
	repository: config.GRAPHDB_REPOSITORY,
	prefixes: PREFIXES
})

async function init() {
	try {
		// build the "class schema reader" header and triples
		const classSchemaMeta = getClassSchemaMeta(CLASS_IRI, NAMED_GRAPH)

		// build the class schema reader query
		let classSchemaQuery = buildSelectQuery(classSchemaMeta.headers, classSchemaMeta.triples)

		// perform the class reader query
		let queryResult = await graphDBEndpoint.query(classSchemaQuery)

		// transform the class reader query results to a convenient result set
		let result = graphDBEndpoint.transformBindingsToResultSet(queryResult, {
			// dropPrefixes: true
			// replacePrefixes: true
		});
		
		// log the result to the console
		console.log('\nClass:\n' + JSON.stringify(result, null, 2));
	} catch (error) {
		console.error('\nClass:\n' + JSON.stringify(error, null, 2));
	}
}

init()
