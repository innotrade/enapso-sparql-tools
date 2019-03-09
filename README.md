# enapso-sparql-tools
Generic SPARQL query generator for Node.js

This package is SPARQL 1.1 compliant. It is designed to run on all SPARQL 1.1 compliant databases.
**The following demos use the Enapso GraphDB client. Therefore, these examples require a running GraphDB 8.x instance on localhost at port 7200. The demos as well as the automated tests require a fully working Ontotext GraphDB repository "Test" and a user "Test" with the password "Test" being set up, which has read/write access to the "Test" Repository.**
Get the latest version of GraphDB for free at https://www.ontotext.com/free-graphdb-download-copy/.

**This project is actively developed and maintained.**
To discuss questions and suggestions with the Enapso and GraphDB community, we'll be happy to meet you in our forum at https://www.innotrade.com/forum/.

# Installation 
```
npm i enapso-sparql-tools --save
```
# Setting up the SPARQL endpoint
```javascript
const EnapsoGraphDBClient = require('enapso-graphdb-client')
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
```

# Get Class Schema
```javascript
try {
    // build the "class schema reader" header and triples
    const classSchemaMeta = getClassSchemaMeta(CLASS_IRI, NAMED_GRAPH)

    // build the class schema reader query
    let classSchemaQuery = buildSelectQuery(classSchemaMeta.headers, classSchemaMeta.triples)

    // log the query to the console
    console.log('\nQuery:\n' + classSchemaQuery);

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
```
### Generated Query
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX et: <http://ont.enapso.com/test#>

SELECT ?node ?edge ?filler ?mapping ?min ?max ?some ?exactly
WHERE {
    GRAPH <http://ont.enapso.com/test> {    
        bind( <http://ont.enapso.com/test#Person> as ?node ) .
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
        }
        BIND( IF( ?some != "" , concat("some_", str(?some) ), "") as ?restrictionType ) .
        BIND( IF( ?exactly > 0 , concat("exactly_",str(?exactly)), "") as ?restrictionType ) .
        BIND( IF( ?min > 0 , concat("min_",str(?min)), "") as ?restrictionType ) .
        BIND( IF( ?max > 0 , concat("max_",str(?max)), "") as ?restrictionType ) . 	 
    } 
}
LIMIT 1000 
OFFSET 0
```
