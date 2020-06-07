# enapso-sparql-tools

Generic SPARQL query generator for Node.js

This package provides of the following features:

- Class Manager, ontology class cache to use OWL classes as a schema
- Prefix Manager, manages the prefixes for the named prefix notation of ontology IRIs
- Generator, SPARQL generator for class, property and annotation operations as well as CRUD-Operations for individuals

The concept is to:

- specify classes in a W3C-compliant ontology modelling tool
- import the model into a W3C-compliant semantic graph-database (e.g. Ontotext GraphDB)
- read the classes of the model into a Class Cache in a node.js application
- let the node.js application automatically generate the SPARQL queries for CRUD operations for the individuals of the specified classes (done by this library)
- Perform the generated SPARQL queries against the semantic graph-database to manage the individuals (supported by the enapso-graphdb-client package)

This package is SPARQL 1.1 compliant. It is designed to run on all SPARQL 1.1 compliant databases.
**The following demos use the Enapso GraphDB Client. Therefore, these examples require a running GraphDB 8.x/9.x instance on localhost at port 7200. The demos as well as the automated tests require a fully working Ontotext GraphDB repository "Test" and a user "Test" with the password "Test" being set up, which has read/write access to the "Test" Repository.**
Get the latest version of GraphDB for free at https://www.ontotext.com/products/graphdb/.

**This project is actively developed and maintained.**
To discuss questions and suggestions with the Enapso and GraphDB community, we'll be happy to meet you in our forum at https://www.innotrade.com/forum/.

# Installation

```
npm i @innotrade/enapso-sparql-tools --save
```

# GraphDB Configuration and ClassCache Creation

There we do configuration to create an connection with GraphDB using enapso graphdb client which needed for building class cache and running the demo. In following code we have also different method are used for building classcache like for getting all classes we use getAllClasses method, getClassProperties for getting object and data properties of a class.

```javascript
const { EnapsoGraphDBClient } = require('@innotrade/enapso-graphdb-client'),
  { EnapsoLogger } = require('@innotrade/enapso-logger');
global.enlogger = new EnapsoLogger();
const EnapsoSPARQLTools = '@innotrade/enapso-sparql-tools';
const GRAPHDB_BASE_URL = 'http://localhost:7200',
  GRAPHDB_REPOSITORY = 'Test';
const NS_AUTH = 'http://ont.enapso.com/repo#',
  PREFIX_AUTH = 'enrepo';
// the default prefixes for all SPARQL queries
const AUTH_PREFIXES = [
  EnapsoGraphDBClient.PREFIX_OWL,
  EnapsoGraphDBClient.PREFIX_RDF,
  EnapsoGraphDBClient.PREFIX_RDFS,
  EnapsoGraphDBClient.PREFIX_XSD,
  {
    prefix: PREFIX_AUTH,
    iri: NS_AUTH
  }
];

const AUTH = {
  graphDBEndpoint: null,
  authentication: null,
  defaultBaseIRI: NS_AUTH,
  defaultPrefix: PREFIX_AUTH,
  defaultIRISeparator: '#',
  query: async function (sparql) {
    let query = await this.graphDBEndpoint.query(sparql);
    let resp;
    if (query.success) {
      resp = await this.graphDBEndpoint.transformBindingsToResultSet(query, {
        dropPrefixes: true
      });
    } else {
      let lMsg = query.message;
      if (400 === query.statusCode) {
        lMsg += ', check your query for potential errors';
      } else if (403 === query.statusCode) {
        lMsg +=
          ', check if user "' +
          GRAPHDB_USERNAME +
          '" has appropriate access rights to the Repository ' +
          '"' +
          this.graphDBEndpoint.getRepository() +
          '"';
      }
      resp = {
        total: 0,
        success: false,
        message: lMsg
      };
    }
    return resp;
  },
  update: async function (sparql, params) {
    let resp = await this.graphDBEndpoint.update(sparql, params);
    if (!resp.success) {
      let lMsg = resp.message;
      if (400 === resp.statusCode) {
        lMsg += ', check your query for potential errors';
      } else if (403 === resp.statusCode) {
        lMsg +=
          ', check if user "' +
          GRAPHDB_USERNAME +
          '" has appropriate access rights to the Repository ' +
          '"' +
          this.graphDBEndpoint.getRepository() +
          '"';
      }
    }
    return resp;
  },
  // retrieve all classes from the graph
  getAllClasses: async function () {
    let generated = this.enSPARQL.getAllClasses();
    //	enlogger.log('SPARQL:\n' + generated.sparql);
    return this.query(generated.sparql);
  },

  // retrieve all properties from a given class
  getClassProperties: async function (cls) {
    let generated = this.enSPARQL.getClassProperties(cls);
    // enlogger.log('SPARQL:\n' + generated.sparql);
    return this.query(generated.sparql);
  },

  // generates an in-memory class from a SPARQL result set
  generateClassFromClassProperties: function (ns, name, classProps) {
    let cls = new EnapsoSPARQLTools.Class(ns, name);
    for (let propRec of classProps.records) {
      // todo: here we need to add the restrictions, domain, range, min, max, exactly etc.
      let prop = new EnapsoSPARQLTools.Property(
        ns,
        propRec.prop,
        propRec.type,
        propRec.range,
        propRec.domain
      );
      // add the property to the classs
      cls.addProperty(prop);
    }
    return cls;
  },
  // builds the class cache for all or selected classes
  buildClassCache: async function () {
    let classCache = new EnapsoSPARQLTools.ClassCache();

    // get all classes of the database
    let classes = await this.getAllClasses();

    // iterate through all returned classes
    for (let clsRec of classes.records) {
      let className = clsRec.class;
      // get the properties of the given class
      res = await this.getClassProperties(className);

      // generate an in-memory class of the retrieved properties
      let cls = this.generateClassFromClassProperties(NS_AUTH, className, res);

      // add the class to the cache
      classCache.addClass(cls);
    }

    return classCache;
  },
  demo: async function () {
    // instantiate a prefix manager
    enlogger.setLevel(EnapsoLogger.ALL);
    this.enPrefixManager = new EnapsoSPARQLTools.PrefixManager(AUTH_PREFIXES);

    // in case no prefix is given for a certain resource identifier use the EDO: here
    this.enPrefixManager.setDefaultPrefix(PREFIX_AUTH);

    // create a SPARQL generator using the prefix manager
    this.enSPARQL = new EnapsoSPARQLTools.Generator({
      prefixManager: this.enPrefixManager
    });

    // instantiate a GraphDB connector and connect to GraphDB
    this.graphDBEndpoint = new EnapsoGraphDBClient.Endpoint({
      baseURL: GRAPHDB_BASE_URL,
      repository: GRAPHDB_REPOSITORY,
      prefixes: this.enPrefixManager.getPrefixesForConnector()
    });
    classCache = await this.buildClassCache();
  }
};
(async () => {
  await AUTH.demo();
})();
```

## Class Cache

One essential component of the Enapso SPARQL Toolbox is its class cache. If you plan to run CRUD commands for individuals based on the property definitions for OWL classes, the SPARQL query requires to know about the fields of the class. In order to not need to load them with each and every query of the individuals, the Enapso SPARQL toolbox comes with an In-Memory-Class-Cache.

On start of an application all classes on an ontology are loaded into the cache. For the sake of performance, to read one or all individuals of a certain class, the SPARQL generator routines utilize the cache.

## Create An Individual

With the method createIndividualByClass(args)a new individual of a given class is created in the ontology. The following four parameters

`cls`: class definition from the In-Memory Class-Cache as a reference for the individual to be created.
`ind`: an object providing the values for the individual of the selected class (example see below).
`baseiri(optional)`: an variable in which we define the baseiri which use along the name of individual if baseiri pass else it will check
If ind contains an field iri, this IRI will be used as explicit IRI for the new individual. If ind does not contain an iri field, the IRI will be auto generated as UUID V4 by the method.
options:
`prefixSubjects`: true|false, whether to use prefixed names (default) or full IRI for subjects (here the individual to be updated).
`prefixPredicates`: true|false, whether to use prefixed names (default) for predicates or full IRI for the predicates (here the properties).
`prefixObjects`: true|false, whether to use prefixed names (default) for objects or full IRI for the related individuals (here the object properties).

```javascript
createIndividualByClass: async function (args) {
		let generated = this.enSPARQL.createIndividualByClass(args);
		//enlogger.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql, { iri: generated.iri });
	}
```

Initializing variables using that variable call the `createIndividualByClass` method

```javascript
let Tenant = classCache.getClassByIRI(NS_AUTH + 'Tenant');
// insert a new individual based on the in-memory class
res = await this.createIndividualByClass(
  cls: Tenant,
  baseiri: baseiri,
  ind: {
    name: 'Test Company'
  }
);
// save the iri for this individual
iri = res.params.iri;
out = JSON.stringify(res, null, 2);
console.log('Creating individual by class:' + out);
```

## Update An Individual of a Class

The method updateIndividualByClass(cls, iri, ind) updates an individual in the ontology based on its class and iri. The method requires the following inbound parameters:

`cls`: class definition from the In-Memory Class-Cache as a reference for the individual to be created.
`iri`: the IRI of the individual to be updated.
`ind`: an object providing the values for the individual of the selected class (example see below).

```javascript
	updateIndividualByClass: async function (cls, iri, ind) {
		let generated = this.enSPARQL.updateIndividualByClass(cls, iri, ind);
		//enlogger.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	}
```

Initializing variables using that variable call the `updateIndividualByClass` method

```javascript
let Tenant = classCache.getClassByIRI(NS_AUTH + 'Tenant');
let iri =
  'http://ont.enapso.com/repo#Tenant_e7e124a2_3a7b_4333_8f51_5f70d48f0bfe';
// Update an exisitng individual based on the in-memory class
res = await this.updateIndividualByClass(Tenant, baseiri, {
  name: 'Test'
});
out = JSON.stringify(res, null, 2);
console.log('Update an individual by class:' + out);
```

## Read one or more Individuals of a Class

The method getIndividualsByClass(args) returns all instances of a certain class. In order to run this method, the class cache needs to be properly initialized, since the properties of the class are loaded from that cache. The following arguments are supported:
`cls`:class definition from the In-Memory Class-Cache as a reference for the individual to be created.
`join`:An object in which we pass nested objects to get the whole tree structure of the class using there relation and classes name there we have two types of relation childtoMasterRelation and mastertochildRelation it is optional
`filter`: filter used to get a specific individual of a class

```javascript
getIndividualsByClass: async function (args) {
		let generated = this.enSPARQL.getIndividualsByClass(args);
		enlogger.log("SPARQL:\n" + generated.sparql);
		return this.query(generated.sparql);
	}
```

Initializing variables using that variable call the `getIndividualsByClass` method

```javascript
this.Tenant = this.classCache.getClassByIRI(NS_AUTH + 'Tenant');
this.Environment = this.classCache.getClassByIRI(NS_AUTH + 'Environment');
this.Host = this.classCache.getClassByIRI(NS_AUTH + 'Host');
this.DatabaseInstance = this.classCache.getClassByIRI(
  NS_AUTH + 'DatabaseInstance'
);
this.Repository = this.classCache.getClassByIRI(NS_AUTH + 'Repository');
this.Graph = this.classCache.getClassByIRI(NS_AUTH + 'Graph');
let joins = [
  // first join (for tenants) on level 1
  {
    cls: this.Environment,
    child2MasterRelation: 'hasTenant',
    joins: [
      {
        cls: this.Host,
        child2MasterRelation: 'hasEnvironment',
        joins: [
          {
            cls: this.DatabaseInstance,
            child2MasterRelation: 'hasHost',
            joins: [
              {
                cls: this.Repository,
                child2MasterRelation: 'hasDatabaseInstance',
                joins: [
                  {
                    cls: this.Graph,
                    child2MasterRelation: 'hasRepository'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
let filter = [
  {
    key: '$sparql',
    value: 'regEx(?name, "Ebner", "i")'
  }
];
// Read individual based on the in-memory class
res = await this.getIndividualsByClass({
  cls: this.Tenant,
  joins: joins,
  filter: filter
});
out = JSON.stringify(res, null, 2);
console.log('Read individuals by class:' + out);
```

## Delete an Individual

The deleteIndividual(args) deletes an arbitrary individual in the given addressed by its IRI and also its entire subtree structure but that option is optional.The following arguments are supported:
`iri`:IRI of an individual of a class
`join`:An object in which we pass nested objects to delete the whole tree structure of the class using there relation and classes name there we have two types of relation childtoMasterRelation and mastertochildRelation it is optional.

```javascript
deleteIndividual: async function (args) {
		let generated = this.enSPARQL.deleteResource(args);
		enlogger.log("SPARQL:\n" + generated.sparql);
		return this.update(generated.sparql);
	}
```

Initializing variables using that variable call the `deleteIndividual` method

```javascript
let iri = 'enrepo:Tenant_0143e7ee_fbdd_45b3_879f_fedc78e42ab4';
let joins = [
  // first join (for tenants) on level 1
  {
    cls: 'Environment',
    child2MasterRelation: 'hasTenant',
    joins: [
      {
        cls: 'Host',
        child2MasterRelation: 'hasEnvironment',
        joins: [
          {
            cls: 'DatabaseInstance',
            child2MasterRelation: 'hasHost',
            joins: [
              {
                cls: 'Repository',
                child2MasterRelation: 'hasDatabaseInstance',
                joins: [
                  {
                    cls: 'Graph',
                    child2MasterRelation: 'hasRepository'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
res = await this.deleteIndividual({
  iri: iri,
  joins: joins
});
out = JSON.stringify(res, null, 2);
console.log('Delete individuals by iri:' + out);
```

## Create Relation between two Individuals

Create Relation method create the relation between two indivdual of different classes we pass following parameter.
`master`: the iri of master class individual
`Relation`: the object property which relation want to create
`child`: the iri of child class individual

```javascript
createRelation: async function (master, property, child) {
		let generated = this.enSPARQL.createRelation(master, property, child);
		//console.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	}
```

Initializing variables using that variable call the `createRelation` method

```javascript
let master =
  'http://ont.enapso.com/repo#Tenant_e7e124a2_3a7b_4333_8f51_5f70d48f0bfe';
let relation = 'hasTenant';
let child =
  'http://ont.enapso.com/repo#Environment_833a44cc_ec58_4202_b44d_27460ae94e2d';
res = await this.createRelation(master, relation, child);
out = JSON.stringify(res, null, 2);
console.log('Create Relation between two individuals:' + out);
```

## Delete Relation between two Individuals

Delete Relation method to delete the relation between two indivdual of different classes we pass following parameter.
`master`: the iri of master class individual
`Relation`: the object property which relation want to create
`child`: the iri of child class individual

```javascript
deleteRelation: async function (master, property, child) {
		let generated = this.enSPARQL.deleteRelation(master, property, child);
		//console.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	}
```

Initializing variables using that variable call the `createRelation` method

```javascript
let master =
  'http://ont.enapso.com/repo#Tenant_e7e124a2_3a7b_4333_8f51_5f70d48f0bfe';
let relation = 'hasTenant';
let child =
  'http://ont.enapso.com/repo#Environment_833a44cc_ec58_4202_b44d_27460ae94e2d';
res = await this.deleteRelation(master, relation, child);
out = JSON.stringify(res, null, 2);
console.log('Delete Relation between two individuals:' + out);
```

## Delete Property of an Class

This method delete the given property of given class. We pass following parameter.
`cls`: name of the class whoose property you wanna delete
`property`: name of the property which you wanna delete.

```javascript
deletePropertyOfClass(args) {
    let generated = this.enSPARQL.deleteGivenPropertyOfClass(args);
    //enlogger.log('SPARQL:\n' + generated.sparql);
    return this.update(generated.sparql);
  }
```

Initializing variables using that variable call the `deletePropertyOfClass` method

```javascript
let cls = 'Environment';
let property = 'name';
res = await this.deletePropertyOfClass({ cls: cls, dataProperty: property });
out = JSON.stringify(res, null, 2);
console.log('Delete Property of the class :' + out);
```

## Delete label of each Class individuals

This method to delete the labels of all individuals of given class of an specific language label. We pass following parameter.
`cls`: name of the class whoose property you wanna delete
`language`: name of language whoose label match with this language will be deleted.

```javascript
deleteLabelOfEachClassIndividual(args) {
    let generated = this.enSPARQL.deleteLabelOfEachClassIndividual(args);
    //enlogger.log('SPARQL:\n' + generated.sparql);
    return this.update(generated.sparql);
  }
```

Initializing variables using that variable call the `deleteLabelOfEachClassIndividual` method

```javascript
let cls = 'Environment';
let language = 'en';
res = await this.deleteLabelOfEachClassIndividual({
  cls: cls,
  labelLanguage: language
});
out = JSON.stringify(res, null, 2);
console.log('Delete label of each individual of a class :' + out);
```

## Copy label of each Class individuals to property

This method to copy the label of specific language of each individual of a class and insert the label value as an given property of each individual of the given class We pass following parameter.
`cls`: name of the class whoose label you want to copy and insert into given data property
`language`: name of language whoose label match with this language will be copies.
`property`: name of the property where you want to paste the label value.

```javascript
copyLabelToDataPropertyOfEachIndividual(args) {
    let generated = this.enSPARQL.copyLabelToDataPropertyOfEachIndividual(args);
    //enlogger.log('SPARQL:\n' + generated.sparql);
    return this.update(generated.sparql);
  }
```

Initializing variables using that variable call the `copyLabelToDataPropertyOfEachIndividual` method

```javascript
let cls = 'Environment';
let property = 'name';
let language = 'en';
res = await this.copyLabelToDataPropertyOfEachIndividual({
  cls: cls,
  labelLanguage: language,
  dataProperty: property
});
out = JSON.stringify(res, null, 2);
console.log('Copy label of each individual of a class into Property :' + out);
```

## Copy Property of each Class individuals into label

This method to copy the property each individual of a class and insert the property value as an label of each individual of a class and assign a specific langauges.We pass following parameter.
`cls`: name of the class whose property value you want to copy and insert into given label
`language`: name of language which you want to assign while creating label.
`property`: name of the property where you want to copy the property value.

```javascript
 copyDataPropertyToLabelOfEachIndividual(args) {
    let generated = this.enSPARQL.copyDataPropertyToLabelOfEachIndividual(args);
    //enlogger.log('SPARQL:\n' + generated.sparql);
    return this.update(generated.sparql);
  }
```

Initializing variables using that variable call the `copyDataPropertyToLabelOfEachIndividual` method

```javascript
let cls = 'Environment';
let property = 'name';
let language = 'en';
res = await this.copyDataPropertyToLabelOfEachIndividual({
  cls: cls,
  labelLanguage: language,
  dataProperty: property
});
out = JSON.stringify(res, null, 2);
console.log('Delete label of each individual of a class :' + out);
```
