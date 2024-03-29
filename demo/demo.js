// Innotrade Enapso SPARQL Tools
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir

require('@innotrade/enapso-config');

// requires the Enapso GraphDB Client package
const { EnapsoGraphDBClient } = requireEx('@innotrade/enapso-graphdb-client'),
    { EnapsoLogger } = requireEx('@innotrade/enapso-logger'),
    { EnapsoGraphDBAdmin } = requireEx('@innotrade/enapso-graphdb-admin');

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

const GRAPHDB_BASE_URL = encfg.getConfig(
        'enapsoDefaultGraphDB.baseUrl',
        'http://localhost:7200'
    ),
    GRAPHDB_REPOSITORY = encfg.getConfig(
        'enapsoDefaultGraphDB.repository',
        'SE-DOE-QA'
    ),
    GRAPHDB_USERNAME = encfg.getConfig('enapsoDefaultGraphDB.userName', 'Test'),
    GRAPHDB_PASSWORD = encfg.getConfig('enapsoDefaultGraphDB.password', 'Test');
const NS_AUTH = encfg.getConfig(
        'enapsoDefaultGraphDB.iri',
        'http://ont.enapso.com/foundation#'
    ),
    PREFIX_AUTH = encfg.getConfig('enapsoDefaultGraphDB.prefix', 'enf');
// the default prefixes for all SPARQL queries
const AUTH_PREFIXES = [
    EnapsoGraphDBClient.PREFIX_OWL,
    EnapsoGraphDBClient.PREFIX_RDF,
    EnapsoGraphDBClient.PREFIX_RDFS,
    EnapsoGraphDBClient.PREFIX_XSD,
    {
        prefix: PREFIX_AUTH,
        iri: NS_AUTH
    },
    {
        prefix: 'ensr',
        iri: 'http://ont.enapso.com/rdfstar#'
    },
    {
        prefix: 'enturk',
        iri: 'http://ont.enapso.com/truck#'
    },
    {
        prefix: 'productprocessconceptmodel',
        iri: 'http://semantic.bosch.com/ProductProcessConceptModel/'
    },
    {
        prefix: 'sh',
        iri: 'http://www.w3.org/ns/shacl#'
    }
];

const AUTH = {
    graphDBEndpoint: null,
    authentication: null,
    defaultBaseIRI: NS_AUTH,
    defaultPrefix: PREFIX_AUTH,
    defaultIRISeparator: '#',
    query: async function (sparql, options) {
        options = options || {};
        options.dropPrefixes = options.dropPrefixes || false;
        let query = await this.graphDBEndpoint.query(sparql);
        let resp;
        if (query.success) {
            resp = await this.graphDBEndpoint.transformBindingsToResultSet(
                query,
                {
                    dropPrefixes: options.dropPrefixes
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
    getAllClasses: async function (graph) {
        let generated = this.enSPARQL.getAllClasses(graph);
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
    getClassProperties: async function (cls, graph) {
        let generated = this.enSPARQL.getClassProperties(cls, graph);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // retrieve all properties from a given class
    getSingleClassProperties: async function (cls, graph) {
        let generated = this.enSPARQL.getSingleClassProperties(cls, graph);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // retrieve all properties from a given class
    getClassPropertiesByDomain: async function (cls, graph) {
        let generated = this.enSPARQL.getClassPropertiesByDomain(cls, graph);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    getClassPropertiesByDomainAndRestrictions: async function (cls, graph) {
        let generated = this.enSPARQL.getClassPropertiesByDomainAndRestrictions(
            cls,
            graph
        );
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // generates an in-memory class from a SPARQL result set
    generateClassFromClassProperties: function (ns, name, classProps) {
        let cls = new EnapsoSPARQLTools.Class(ns, name);
        for (let propRec of classProps.records) {
            // todo: here we need to add the restrictions, domain, range, min, max, exactly etc.
            let propParts = this.splitIRI(propRec.prop);
            let prop = new EnapsoSPARQLTools.Property(
                propParts.namespace,
                propParts.name,
                propRec.type,
                propRec.range,
                propRec.domain
            );
            // add the property to the classs
            cls.addProperty(prop);
        }
        return cls;
    },
    splitIRI(iri, options) {
        let separator = '#';
        let parts = iri.split(separator);
        return {
            namespace: parts[0] + separator,
            name: parts[1]
        };
    },
    updateMultipleRelation: async function (iri, prop, newValues) {
        let generated = this.enSPARQL.updateMultipleRelation(
            iri,
            prop,
            newValues
        );
        enlogger.log('SPARQL:\n' + generated.sparql);
        // return this.query(generated.sparql);
    },

    // builds the class cache for all or selected classes
    buildClassCache: async function () {
        let classCache = new EnapsoSPARQLTools.ClassCache();
        // get all classes of the database
        let generated = this.enSPARQL.getAllClasses();
        // enLogger.log('SPARQL:\n' + generated.sparql);
        let classes = await this.query(generated.sparql);

        // iterate through all returned classes
        for (let clsRec of classes.records) {
            let className = clsRec.class;
            // get the properties of the given class
            // get the properties of the given class
            let generated = this.enSPARQL.getClassProperties(className);
            // enLogger.log('SPARQL:\n' + generated.sparql);
            let res = await this.query(generated.sparql, {
                dropPrefixes: false // here we need the full data types and IRIs
            });
            let classId = this.splitIRI(className);

            // generate an in-memory class of the retrieved properties
            let cls = this.generateClassFromClassProperties(
                classId.namespace,
                classId.name,
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
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    deleteLabelOfEachClassIndividual(args) {
        let generated = this.enSPARQL.deleteLabelOfEachClassIndividual(args);
        //  enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    copyLabelToDataPropertyOfEachIndividual(args) {
        let generated =
            this.enSPARQL.copyLabelToDataPropertyOfEachIndividual(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    copyDataPropertyToLabelOfEachIndividual(args) {
        let generated =
            this.enSPARQL.copyDataPropertyToLabelOfEachIndividual(args);
        //  enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    // add a relation between two individuals
    createRelation: async function (master, property, child, graph) {
        let generated = this.enSPARQL.createRelation(
            master,
            property,
            child,
            graph
        );
        //console.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    // delete a relation between two individuals
    deleteRelation: async function (master, property, child, graph) {
        let generated = this.enSPARQL.deleteRelation(
            master,
            property,
            child,
            graph
        );
        //console.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    async demoUploadFromFile(arg) {
        // upload a file
        let resp = await this.graphDBEndpoint.uploadFromFile(arg);
        //  console.log('\nUploadFromFile:\n' + JSON.stringify(resp., null, 2));
        return resp;
    },
    async login(user, pass) {
        // upload a file
        let resp = await this.graphDBEndpoint.login(user, pass);
        //  console.log('Login :\n' + JSON.stringify(resp, null, 2));
        return resp;
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
        // this.graphDBEndpoint = new EnapsoGraphDBClient.Endpoint({
        //     baseURL: GRAPHDB_BASE_URL,
        //     repository: GRAPHDB_REPOSITORY,
        //     prefixes: this.enPrefixManager.getPrefixesForConnector()
        // });
        // this.graphDBEndpoint.login(GRAPHDB_USERNAME, GRAPHDB_PASSWORD);
        // let resp = await this.graphDBEndpoint.uploadFromFile({
        //     filename: 'EnapsoFoundation.owl',
        //     format: 'application/rdf+xml',
        //     baseIRI: 'http://ont.enapso.com/foundation#',
        //     context: 'http://ont.enapso.com/enf'
        // });
        // console.log('UploadFromFile:' + JSON.stringify(resp.success, null, 2));

        // this.classCache = await this.buildClassCache();
        // this.Resource = this.classCache.getClassByIRI(
        //     'http://ont.enapso.com/truck#Truck'
        // );
        // let ind1 = {
        //     iri: NS_AUTH + '00a5e37f_3452_4b48121212346871245',
        //     licenceNumber: 'Tested'
        // };
        // let ind = {
        //     //    iri: NS_AUTH + '00a5e37f_3452_4b4812121234687124545',
        //     licenceNumber: 'Helllo Tested'
        // };
        // // //  this.Resource = this.classCache.getClassByIRI(NS_AUTH + 'Truck');
        // let res = await this.createIndividualByClass({
        //     graph: 'http://ont.enapso.com/truck',
        //     cls: this.Resource,
        //     ind: ind1
        // });
        // console.log('create a individual', res);

        // let iri = NS_AUTH + '00a5e37f_3452_4b48';
        // let ind = {
        //     name: 'Updated Test Company',
        //     hash: 'Tqwerhvh',
        //     rights: 'rwx',
        //     code: 'function(option){console.log(option)}',
        //     user: 'jnhgtresss',
        //     hasCapabilities:
        //         'enf:Capability_00a5e37f_3452_4b48_8a0a_3089dc41ef47',
        //     hasAttributes:
        //         'http://ont.enapso.com/foundation#Attribute_5ed0a3d9_a801_4c4b_a072_578090f60353',
        //     hasBehavior:
        //         'http://ont.enapso.com/foundation#Behavior_03e35a1d_5dd2_44fd_a596_908a1474dec8'
        // };
        // let res1 = await this.updateIndividualByClass({
        //     //   graph: 'http://ont.enapso.com/truck',
        //     cls: this.Resource,
        //     iri: NS_AUTH + '00a5e37f_3452_4b48121212346871245',
        //     ind: ind
        // });
        // console.log('update created individual', res1);
        // let joins = [
        //     {
        //         cls: this.classCache.getClassByIRI(
        //             'http://ont.enapso.com/foundation#Capability'
        //         ),
        //         parent2ChildRelation:
        //             'http://ont.enapso.com/foundation#hasCapabilities',
        //         joins: [
        //             {
        //                 cls: this.classCache.getClassByIRI(
        //                     'http://ont.enapso.com/foundation#Argument'
        //                 ),
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasArgument'
        //             }
        //         ]
        //     },
        //     {
        //         cls: this.classCache.getClassByIRI(
        //             'http://ont.enapso.com/foundation#Attribute'
        //         ),
        //         parent2ChildRelation:
        //             'http://ont.enapso.com/foundation#hasAttributes',
        //         joins: [
        //             {
        //                 cls: this.classCache.getClassByIRI(
        //                     'http://ont.enapso.com/foundation#Argument'
        //                 ),
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasArgument'
        //             }
        //         ]
        //     },
        //     {
        //         cls: this.classCache.getClassByIRI(
        //             'http://ont.enapso.com/foundation#Behavior'
        //         ),
        //         parent2ChildRelation:
        //             'http://ont.enapso.com/foundation#hasBehavior',
        //         joins: [
        //             {
        //                 cls: this.classCache.getClassByIRI(
        //                     'http://ont.enapso.com/foundation#EventEmitter'
        //                 ),
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasEventEmitter',
        //                 joins: [
        //                     {
        //                         cls: this.classCache.getClassByIRI(
        //                             'http://ont.enapso.com/foundation#Event'
        //                         ),
        //                         parent2ChildRelation:
        //                             'http://ont.enapso.com/foundation#hasEvent'
        //                     }
        //                 ]
        //             },
        //             {
        //                 cls: this.classCache.getClassByIRI(
        //                     'http://ont.enapso.com/foundation#EventListener'
        //                 ),
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasEventListener',
        //                 joins: [
        //                     {
        //                         cls: this.classCache.getClassByIRI(
        //                             'http://ont.enapso.com/foundation#Event'
        //                         ),
        //                         parent2ChildRelation:
        //                             'http://ont.enapso.com/foundation#hasEvent'
        //                     },
        //                     {
        //                         cls: this.classCache.getClassByIRI(
        //                             'http://ont.enapso.com/foundation#Argument'
        //                         ),
        //                         parent2ChildRelation:
        //                             'http://ont.enapso.com/foundation#hasArgument'
        //                     }
        //                 ]
        //             }
        //         ]
        //     }
        // ];
        // let filter = [
        //     {
        //         key: '$sparql',
        //         value: 'regEx(str(?ind), "http://ont.enapso.com/foundation#00a5e37f_3452_4b48", "i")'
        //     }
        // ];
        // let cls = 'http://ont.enapso.com/truck#Truck';
        // cls = this.classCache.getClassByIRI(cls);
        // let res2 = await this.showAllIndividuals({
        //     graph: 'http://ont.enapso.com/truck',
        //     cls: cls
        //      joins: joins
        //        filter: filter
        // });
        // console.log('read individual of a class', res2);
        // iri = 'http://ont.enapso.com/foundation#00a5e37f_3452_4b48';
        // let join = [
        //     {
        //         cls: 'http://ont.enapso.com/foundation#Capability',
        //         parent2ChildRelation:
        //             'http://ont.enapso.com/foundation#hasCapabilities',
        //         joins: [
        //             {
        //                 cls: 'http://ont.enapso.com/foundation#Argument',
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasArgument'
        //             }
        //         ]
        //     },
        //     {
        //         cls: 'http://ont.enapso.com/foundation#Attribute',
        //         parent2ChildRelation:
        //             'http://ont.enapso.com/foundation#hasAttributes',
        //         joins: [
        //             {
        //                 cls: 'http://ont.enapso.com/foundation#Argument',
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasArgument'
        //             }
        //         ]
        //     },
        //     {
        //         cls: 'http://ont.enapso.com/foundation#Behavior',
        //         parent2ChildRelation:
        //             'http://ont.enapso.com/foundation#hasBehavior',
        //         joins: [
        //             {
        //                 cls: 'http://ont.enapso.com/foundation#EventEmitter',
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasEventEmitter',
        //                 joins: [
        //                     {
        //                         cls: 'http://ont.enapso.com/foundation#Event',
        //                         parent2ChildRelation:
        //                             'http://ont.enapso.com/foundation#hasEvent'
        //                     }
        //                 ]
        //             },
        //             {
        //                 cls: 'http://ont.enapso.com/foundation#EventListener',
        //                 parent2ChildRelation:
        //                     'http://ont.enapso.com/foundation#hasEventListener',
        //                 joins: [
        //                     {
        //                         cls: 'http://ont.enapso.com/foundation#Event',
        //                         parent2ChildRelation:
        //                             'http://ont.enapso.com/foundation#hasEvent'
        //                     },
        //                     {
        //                         cls: 'http://ont.enapso.com/foundation#Argument',
        //                         parent2ChildRelation:
        //                             'http://ont.enapso.com/foundation#hasArgument'
        //                     }
        //                 ]
        //             }
        //         ]
        //     }
        // ];
        // let res3 = await this.deleteIndividual({
        //     graph: 'http://ont.enapso.com/truck',
        //     iri: NS_AUTH + '00a5e37f_3452_4b48121212346871245'
        // });
        // console.log('delete individual of the class', res3);
        // let res4 = await this.getClassPropertiesByDomain(
        //     'http://ont.enapso.com/rdfstar#DomainClass'
        // );
        // let res4 = await this.getClassProperties(
        //     'http://ont.enapso.com/truck#Truck',
        //     'http://ont.enapso.com/truck12'
        // );
        // console.log('Class Properties by Domain', res4);
        // let res4 = await this.getSingleClassProperties(
        //     'http://ont.enapso.com/truck#Truck'
        //     //'http://ont.enapso.com/truck'
        // );
        // console.log('getSingleClassProperties', res4);
        // let res5 = await this.getAllClasses('http://ont.enapso.com/truck');
        // console.log('getAllClasses', res5);
        // let res4 = await this.getClassPropertiesByDomainAndRestrictions(
        //     'http://semantic.bosch.com/ProductProcessConceptModel/CLASSProductProcessConceptProduct'
        // );
        // console.log('Class Properties by Domain', res4);
        await this.updateMultipleRelation(
            'http://ont.telekom.de/cia/recommendation/data#CriteriaSpecification_593d011e_ce03_4463_9069_61ae9745e953',
            'http://ont.enapso.com/recommendation#hasContext',
            [
                'http://ont.telekom.de/cia/recommendation/data#Tariff_a5a2139e_1450_47ab_b600_f1990d36f80d',
                'http://ont.telekom.de/cia/recommendation/data#Context_68efc906_e7ef_45ad_a1bd_47b283ca9099'
            ]
        );
    }
};

(async () => {
    await AUTH.demo();
})();
module.exports = {
    AUTH
};
