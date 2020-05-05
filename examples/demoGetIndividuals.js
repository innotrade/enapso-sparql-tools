// Innotrade Enapso SPARQL Toolbox - Individual Reader
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const EnapsoGraphDBClient = require('@innotrade/enapso-graphdb-client')
const config = require('./examples.config')

const { getClassSchemaMeta, getIndividualsMeta, buildSelectQuery } = require('../index')
const CLASS_IRI = 'http://ont.enapso.com/test#Person'
const NAMED_GRAPH = 'http://ont.enapso.com/test'

// the prefixes for all SPARQL queries
const PREFIXES = [
    EnapsoGraphDBClient.PREFIX_OWL,
    EnapsoGraphDBClient.PREFIX_RDF,
    EnapsoGraphDBClient.PREFIX_RDFS,
	EnapsoGraphDBClient.PREFIX_XSD,
    {
        "prefix": "et",
        "iri": "http://ont.enapso.com/test#"
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
        let classResult = await graphDBEndpoint.query(classSchemaQuery)

        // log the "class schema" to the console
        classResult = EnapsoGraphDBClient.transformBindingsToResultSet(classResult, {
            // dropPrefixes: true
        });
        console.log('\nClass:\n' + JSON.stringify(classResult, null, 2));

        // build the "read individuals" header and triples
        let individualsMeta = await getIndividualsMeta(classResult
            // optionally limit the fields to he desired ones
            // , ['firstName', 'lastName']
        )

        // build the "read individuals" reader query
        let individualsQuery = await buildSelectQuery(individualsMeta.headers, individualsMeta.triples)

        // perform the "read individuals" query
        let individualsResult = await graphDBEndpoint.query(individualsQuery)

        individualsResult = graphDBEndpoint.transformBindingsToResultSet(individualsResult, {
			// dropPrefixes: true
			replacePrefixes: true
		});

        console.log('\nIndividuals:\n' + JSON.stringify(individualsResult, null, 2));
    } catch (error) {
        console.dir(error)
    }
}

init();
