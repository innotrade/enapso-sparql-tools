# enapso-sparql-tools
Generic SPARQL query generator for Node.js

This package provides of the following features:
* Class Manager, ontology class cache to use OWL classes as a schema
* Prefix Manager, manages the prefixes for the named prefix notation of ontology IRIs
* Generator, SPARQL generator for class, property and annotation operations as well as CRUD-Operations for individuals

The concept is to:
* specify classes in a W3C-compliant ontology modelling tool
* import the model into a W3C-compliant semantic graph-database (e.g. Ontotext GraphDB)
* read the classes of the model into a Class Cache in a node.js application
* let the node.js application automatically generate the SPARQL queries for CRUD operations for the individuals of the specified classes (done by this library)
* Perform the generated SPARQL queries against the semantic graph-database to manage the individuals (supported by the enapso-graphdb-client package)

This package is SPARQL 1.1 compliant. It is designed to run on all SPARQL 1.1 compliant databases.
**The following demos use the Enapso GraphDB Client. Therefore, these examples require a running GraphDB 8.x/9.x instance on localhost at port 7200. The demos as well as the automated tests require a fully working Ontotext GraphDB repository "Test" and a user "Test" with the password "Test" being set up, which has read/write access to the "Test" Repository.**
Get the latest version of GraphDB for free at https://www.ontotext.com/products/graphdb/.

**This project is actively developed and maintained.**
To discuss questions and suggestions with the Enapso and GraphDB community, we'll be happy to meet you in our forum at https://www.innotrade.com/forum/.

# Installation 
```
npm i @innotrade/enapso-sparql-tools --save
```

