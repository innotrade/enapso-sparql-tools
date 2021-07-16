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
    require('../lib/generator'),
    require('../lib/sparqlBeautifier')
);

const GRAPHDB_BASE_URL = encfg.getConfig(
        'enapsoDefaultGraphDB.baseUrl',
        'http://localhost:7200'
    ),
    GRAPHDB_REPOSITORY = encfg.getConfig(
        'enapsoDefaultGraphDB.repository',
        'Test'
    ),
    GRAPHDB_USERNAME = encfg.getConfig('enapsoDefaultGraphDB.userName', 'Test'),
    GRAPHDB_PASSWORD = encfg.getConfig('enapsoDefaultGraphDB.password', 'Test');
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
    },
    {
        prefix: 'enf',
        iri: 'http://ont.enapso.com/foundation#'
    },
    {
        prefix: 'xsd',
        iri: 'http://www.w3.org/2001/XMLSchema#'
    },
    {
        prefix: 'enauth',
        iri: 'http://ont.enapso.com/auth#'
    },
    {
        prefix: 'dnp',
        iri: 'http://ont.enapso.com/dotnetpro#'
    }
];

const AUTH = {
    graphDBEndpoint: null,
    authentication: null,
    defaultBaseIRI: NS_AUTH,
    defaultPrefix: PREFIX_AUTH,
    defaultIRISeparator: '#',
    query: async function (sparql, dropPrefixes) {
        let query = await this.graphDBEndpoint.query(sparql);
        dropPrefixes = dropPrefixes || false;
        let resp;
        if (query.success) {
            resp = await this.graphDBEndpoint.transformBindingsToResultSet(
                query,
                {
                    dropPrefixes: dropPrefixes
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
    getAllClasses: async function () {
        let generated = this.enSPARQL.getAllClasses();
        //	enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // retrieve all properties from a given class
    getClassProperties: async function (cls) {
        let generated = this.enSPARQL.getClassProperties(cls);
        //  enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // create a new instance of a certain class in the graph
    // prefixes:{} in which you can pass the object of prefixes which you want to attach with sparql query.
    // baseiri to specify the base graph iri
    createIndividualByClass: async function (args) {
        let generated = this.enSPARQL.createIndividualByClass(args);
        let query = this.enSPARQLBeautifier.beautify({
            query: generated.sparql
            //allPrefixes: true
            // prefixes: { ensw: 'http://ont.enapso.com/model/software#' },
            // baseIRI: 'http://ont.enapso.com/model#'
        });
        enlogger.log(
            'SPARQL:\n' + generated.sparql + '\n Beautify SPARQL:\n' + query
        );
        //  return this.update(generated.sparql, { iri: generated.iri });
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
                propRec.domain,
                propRec.prop
            );
            // add the property to the class
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
        // allPrefixes:true to show all prefixes which pass in query if its fail then it show only those prefixes which are part of query not all and remove the unnecessary prefixes
        this.enSPARQLBeautifier = new EnapsoSPARQLTools.SparqlBeautifier({
            prefixes: this.enPrefixManager.getPrefixesInSPARQLFormat()
            //    allPrefixes: true
        });

        // instantiate a GraphDB connector and connect to GraphDB
        this.graphDBEndpoint = new EnapsoGraphDBClient.Endpoint({
            baseURL: GRAPHDB_BASE_URL,
            repository: GRAPHDB_REPOSITORY,
            prefixes: this.enPrefixManager.getPrefixesForConnector()
        });
        this.graphDBEndpoint.login(GRAPHDB_USERNAME, GRAPHDB_PASSWORD);
        this.classCache = await this.buildClassCache();
        this.Attribute = this.classCache.getClassByIRI(NS_AUTH + 'Attribute');
        let record = {
            name: 'Color',
            value: 'Red'
        };
        await this.createIndividualByClass({
            cls: this.Attribute,
            ind: record
        });
    }
};

(async () => {
    await AUTH.demo();
})();
