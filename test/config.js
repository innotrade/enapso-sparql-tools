// Innotrade Enapso SPARQL Tools
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir

// requires the Enapso GraphDB Client package
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
        'Test'
    );
const NS_AUTH = encfg.getConfig(
        'enapsoDefaultGraphDB.testIri',
        'http://ont.enapso.com/repo#'
    ),
    PREFIX_AUTH = encfg.getConfig('enapsoDefaultGraphDB.testPrefix', 'enrepo');
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
        prefix: 'enf',
        iri: 'http://ont.enapso.com/foundation#'
    },
    {
        prefix: 'enrepo',
        iri: 'http://ont.enapso.com/repo#'
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
                    dropPrefixes: false
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
    getClasses: async function (args) {
        let generated = this.enSPARQL.getClasses(args);
        //	enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    getAllSubClasses: async function (args) {
        let generated = this.enSPARQL.getAllSubClasses(args);
        //	enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    changeClassIRI: async function (args) {
        let generated = this.enSPARQL.changeClassIRI(args);
        //	enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
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
    getClassPropertiesByDomain: async function (cls) {
        let generated = this.enSPARQL.getClassPropertiesByDomain(cls);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // generates an in-memory class from a SPARQL result set
    generateClassFromClassProperties: function (ns, name, classProps) {
        let cls = new EnapsoSPARQLTools.Class(ns, name);
        for (let propRec of classProps.records) {
            let propParts = this.splitIRI(propRec.prop);
            // todo: here we need to add the restrictions, domain, range, min, max, exactly etc.
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
    getAllClasses: async function () {
        let generated = this.enSPARQL.getAllClasses();
        //	enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    splitIRI(iri, options) {
        let separator = '#';
        let parts = iri.split(separator);
        return {
            namespace: parts[0] + separator,
            name: parts[1]
        };
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
        // enlogger.log('SPARQL:\n' + generated.sparql);
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
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql, { iri: generated.iri });
    },

    // updates an individual by its class reference and a data object with the values
    updateIndividualByClass: async function (args) {
        let generated = this.enSPARQL.updateIndividualByClass(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    // deletes an arbitray resource via its IRI
    deleteIndividual: async function (args) {
        let generated = this.enSPARQL.deleteResource(args);
        // enlogger.log('SPARQL:\n' + generated.sparql);
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
        console.log(productClass);
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
        //enlogger.log('SPARQL:\n' + generated.sparql);
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
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    // add a relation between two individuals
    createRelation: async function (master, property, child) {
        let generated = this.enSPARQL.createRelation(master, property, child);
        console.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    // delete a relation between two individuals
    deleteRelation: async function (master, property, child) {
        let generated = this.enSPARQL.deleteRelation(master, property, child);
        //console.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    deleteRelation: async function (master, property, child) {
        let generated = this.enSPARQL.deleteRelation(master, property, child);
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
    createClassAndAddRestriction(args) {
        let generated = this.enSPARQL.createClassAndAddRestriction(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    addRestrictionToClass(args) {
        let generated = this.enSPARQL.createClassAndAddRestriction(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    addLabel(args) {
        let generated = this.enSPARQL.addLabel(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    changeLabel(args) {
        let generated = this.enSPARQL.changeLabel(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteLabel(args) {
        let generated = this.enSPARQL.deleteLabel(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteComment(args) {
        let generated = this.enSPARQL.deleteComment(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    addComment(args) {
        let generated = this.enSPARQL.addComment(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    changeComment(args) {
        let generated = this.enSPARQL.changeComment(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassReferenceModel(args) {
        let generated = this.enSPARQL.deleteClassReferenceModel(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassReferenceData(args) {
        let generated = this.enSPARQL.deleteClassReferenceData(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassModel(args) {
        let generated = this.enSPARQL.deleteClassModel(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClass(args) {
        let generated = this.enSPARQL.deleteClass(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassData(args) {
        let generated = this.enSPARQL.deleteClassData(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassModelAndData(args) {
        let generated = this.enSPARQL.deleteClassModelAndData(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassReferenceModelAndData(args) {
        let generated = this.enSPARQL.deleteClassReferenceModelAndData(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassSpecificRestriction(args) {
        let generated = this.enSPARQL.deleteClassSpecificRestriction(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    updateClassRestriction(args) {
        let generated = this.enSPARQL.updateClassRestriction(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    createProperty(args) {
        let generated = this.enSPARQL.createProperty(args);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteProperty(args) {
        let generated = this.enSPARQL.deleteProperty(args);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deletePropertyFromIndividuals(args) {
        let generated = this.enSPARQL.deletePropertyFromIndividuals(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deletePropertyFromClassRestrictions(args) {
        let generated = this.enSPARQL.deletePropertyFromClassRestrictions(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    getObjectProperties(args) {
        let generated = this.enSPARQL.getObjectProperties(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    changePropertyIRI(args) {
        let generated = this.enSPARQL.changePropertyIRI(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    getDataProperties(args) {
        let generated = this.enSPARQL.getDataProperties(args);
        //enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
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

        this.graphDBEndpoint.login('Test', 'Test');
        classCache = await this.buildClassCache();
    }
};

(async () => {
    await AUTH.demo();
})();

module.exports = {
    AUTH
};
