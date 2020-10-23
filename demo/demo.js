// Innotrade Enapso SPARQL Tools
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir

// requires the Enapso GraphDB Client package
const { EnapsoGraphDBClient } = require('@innotrade/enapso-graphdb-client'),
    { EnapsoLogger } = require('@innotrade/enapso-logger');
global.enlogger = new EnapsoLogger();
const _ = require('lodash');

const EnapsoSPARQLTools = {};
_.merge(
    EnapsoSPARQLTools,
    require('../lib/properties'),
    require('../lib/classes'),
    require('../lib/classCache'),
    require('../lib/prefixManager'),
    require('../lib/generator')
);

const GRAPHDB_BASE_URL = 'http://localhost:7200',
    GRAPHDB_REPOSITORY = 'Test';
const NS_AUTH = 'http://ont.enapso.com/foundation#',
    PREFIX_AUTH = 'enf';
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
            resp = await this.graphDBEndpoint.transformBindingsToResultSet(
                query,
                {
                    dropPrefixes: true
                }
            );
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

    // retrieve all data and object properties from the graph
    getProperties: async function () {
        return this.query(`
select *
where {
	?prop a rdf:Property ; rdf:type ?type .
	optional { ?prop rdfs:domain ?domain } .
	optional { ?prop rdfs:range ?range } .
	filter( ?type = owl:DatatypeProperty || ?type = owl:ObjectProperty )
}`);
    },

    // retrieve all data properties from the graph
    getDataProperties: async function () {
        return this.query(`
select *
where {
	?prop a owl:DatatypeProperty .
	optional { ?prop rdfs:domain ?domain } .
	optional { ?prop rdfs:range ?range } .
}`);
    },

    // retrieve all object properties from the graph
    getObjectProperties: async function () {
        return this.query(`
select *
where {
	?prop a owl:ObjectProperty .
	optional { ?prop rdfs:domain ?domain } .
	optional { ?prop rdfs:range ?range } .
}`);
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
            let cls = this.generateClassFromClassProperties(
                NS_AUTH,
                className,
                res
            );

            // add the class to the cache
            classCache.addClass(cls);
        }

        return classCache;
    },

    // get all instances of a certain class from the graph
    getIndividualsByClass: async function (args) {
        let generated = this.enSPARQL.getIndividualsByClass(args);
      enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },

    // show all individuals of a certain class in the enlogger
    showAllIndividuals: async function (args) {
        // and retrieve all instances by the given in-memory class
        res = await this.getIndividualsByClass(args);
        return res;
    },
    // create a new instance of a certain class in the graph
    createIndividualByClass: async function (args) {
        let generated = this.enSPARQL.createIndividualByClass(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql, { iri: generated.iri });
    },

    // updates an individual by its class reference and a data object with the values
    updateIndividualByClass: async function (cls, iri, ind) {
        let generated = this.enSPARQL.updateIndividualByClass(cls, iri, ind);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    // deletes an arbitray resource via its IRI
    deleteIndividual: async function (args) {
        let generated = this.enSPARQL.deleteResource(args);
       enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    // this deletes ALL individuals of a certain class, BE CAREFUL!
    deleteAllIndividualsByClass: async function (cls) {
        // todo: check this method! it looks like this deletes also all specs for a class, not only the individuals!
        return this.update(
            `delete {
?s ?p ?o
} where {
?s ?p ?o.
filter(?s = <${cls.getIRI()}>) .
}
`
        );
    },
    cloneIndividual(productClass, productIRI) {
        let generated = this.enSPARQL.cloneIndividual(productClass, productIRI);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql, { iri: generated.iri });
    },
    deletePropertyOfClass(args) {
        let generated = this.enSPARQL.deleteGivenPropertyOfClass(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteLabelOfEachClassIndividual(args) {
        let generated = this.enSPARQL.deleteLabelOfEachClassIndividual(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    copyLabelToDataPropertyOfEachIndividual(args) {
        let generated = this.enSPARQL.copyLabelToDataPropertyOfEachIndividual(
            args
        );
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    copyDataPropertyToLabelOfEachIndividual(args) {
        let generated = this.enSPARQL.copyDataPropertyToLabelOfEachIndividual(
            args
        );
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    // add a relation between two individuals
    createRelation: async function (master, property, child) {
        let generated = this.enSPARQL.createRelation(master, property, child);
        //console.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    // delete a relation between two individuals
    deleteRelation: async function (master, property, child) {
        let generated = this.enSPARQL.deleteRelation(master, property, child);
        //console.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    demo: async function () {
        // instantiate a prefix manager
        enlogger.setLevel(EnapsoLogger.ALL);
        this.enPrefixManager = new EnapsoSPARQLTools.PrefixManager(
            AUTH_PREFIXES
        );

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
        this.classCache = await this.buildClassCache();


        this.Resource = this.classCache.getClassByIRI(NS_AUTH + 'Resource');
        let iri = 'http://ont.enapso.com/foundation#00a5e37f_3452_4b48';
        let ind1 = {
            iri:iri,
            name: 'Test Company',
            uuid:'12345tyuiigfds',
            dataId:'hgfdsdddddd',
            hash:'Tqwerhvh',
            rights:'rwx',
            code:'function(option){console.log(option)}',
            user:'jnhgtresss',
            hasCapabilities: 'enf:Capability_00a5e37f_3452_4b48_8a0a_3089dc41ef47',
            hasAttributes:'http://ont.enapso.com/foundation#Attribute_5ed0a3d9_a801_4c4b_a072_578090f60353',
            hasBehavior:'http://ont.enapso.com/foundation#Behavior_03e35a1d_5dd2_44fd_a596_908a1474dec8',
        };
let res=await this.createIndividualByClass({
    cls: this.Resource,
    ind: ind1
})
console.log(res);


  this.Resource = this.classCache.getClassByIRI(NS_AUTH + 'Resource');
         iri = "http://ont.enapso.com/foundation#00a5e37f_3452_4b48";
        let ind = {
            name: 'Updated Test Company',
            uuid:'12345tyuiigfds',
            dataId:'hgfdsdddddd',
            hash:'Tqwerhvh',
            rights:'rwx',
            code:'function(option){console.log(option)}',
            user:'jnhgtresss',
            hasCapabilities: 'enf:Capability_00a5e37f_3452_4b48_8a0a_3089dc41ef47',
            hasAttributes:'http://ont.enapso.com/foundation#Attribute_5ed0a3d9_a801_4c4b_a072_578090f60353',
            hasBehavior:'http://ont.enapso.com/foundation#Behavior_03e35a1d_5dd2_44fd_a596_908a1474dec8',
        };
let res1=await this.updateIndividualByClass({
    cls: this.Resource,
    iri: iri,
    ind: ind
})
console.log(res1);

        let cls = 'http://ont.enapso.com/foundation#Resource';
        cls = this.classCache.getClassByIRI(cls);
        let joins = [
           {
                cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Capability'),
                master2childRelation: 'hasCapabilities',
                joins :
                [
                    {
                        cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Argument'),
                        master2childRelation: 'hasArgument',
                    }
                ]
            },
            {
                cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Attribute'),
                master2childRelation: 'hasAttributes',
                joins :
                [
                    {
                        cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Argument'),
                        master2childRelation: 'hasArgument'
                    }
                ]
            },
            {
                cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Behavior'),
                master2childRelation: 'hasBehavior',
                joins :
                [
                    {
                        cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#EventEmitter'),
                        master2childRelation: 'hasEventEmitter',
                        joins :
                        [
                            {
                                cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Event'),
                                master2childRelation: 'hasEvent'
                            }
                        ]
                    },
                    {
                        cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#EventListener'),
                        master2childRelation: 'hasEventListener',
                        joins :
                        [
                            {
                                cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Event'),
                                master2childRelation: 'hasEvent'
                            },
                            {
                                cls: this.classCache.getClassByIRI('http://ont.enapso.com/foundation#Argument'),
                                master2childRelation: 'hasArgument'
                            }
                        ]
                    }
                ]
            },
        ];
        let filter= [{
            "key": "$sparql",
            "value": "regEx(str(?ind), \"http://ont.enapso.com/foundation#00a5e37f_3452_4b48\", \"i\")"
        }]
        let res2 = await this.showAllIndividuals({cls:cls,joins:joins,filter:filter});
    console.log(res2);
     iri="http://ont.enapso.com/foundation#00a5e37f_3452_4b48";
    let join = [
        {
             cls: 'Capability',
             master2childRelation: 'hasCapabilities',
             joins :
             [
                 {
                     cls: 'Argument',
                     master2childRelation: 'hasArgument',
                 }
             ]
         },
         {
             cls: 'Attribute',
             master2childRelation: 'hasAttributes',
             joins :
             [
                 {
                     cls: 'Argument',
                     master2childRelation: 'hasArgument'
                 }
             ]
         },
         {
             cls: 'Behavior',
             master2childRelation: 'hasBehavior',
             joins :
             [
                 {
                     cls: 'EventEmitter',
                     master2childRelation: 'hasEventEmitter',
                     joins :
                     [
                         {
                             cls: 'Event',
                             master2childRelation: 'hasEvent'
                         }
                     ]
                 },
                 {
                     cls: 'EventListener',
                     master2childRelation: 'hasEventListener',
                     joins :
                     [
                         {
                             cls: 'Event',
                             master2childRelation: 'hasEvent'
                         },
                         {
                             cls: 'Argument',
                             master2childRelation: 'hasArgument'
                         }
                     ]
                 }
             ]
         },
     ];
  let res3=await this.deleteIndividual({ iri: iri, joins: join })
  console.log(res3);
    }
};
(async () => {
    await AUTH.demo();
})();
module.exports = {
    AUTH
};
