// Innotrade Enapso SPARQL Tools
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir

require('@innotrade/enapso-config');

// requires the Enapso GraphDB Client package
const { EnapsoGraphDBClient } = requireEx('@innotrade/enapso-graphdb-client'),
    { EnapsoLogger } = require('@innotrade/enapso-logger'),
    { EnapsoGraphDBAdmin } = requireEx('@innotrade/enapso-graphdb-admin');

global.enlogger = new EnapsoLogger();
const { filter, join } = require('lodash');
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
    ),
    GRAPHDB_USERNAME = encfg.getConfig('enapsoDefaultGraphDB.userName', 'Test'),
    GRAPHDB_PASSWORD = encfg.getConfig('enapsoDefaultGraphDB.password', 'Test');
const NS_AUTH = encfg.getConfig(
        'enapsoDefaultGraphDB.iri',
        'http://ont.enapso.com/repo#'
    ),
    PREFIX_AUTH = encfg.getConfig('enapsoDefaultGraphDB.prefix', 'enrepo');
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
        prefix: 'enauth',
        iri: 'http://ont.enapso.com/auth#'
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
        //  enlogger.log('SPARQL:\n' + generated.sparql);
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
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    getParentClass: async function (cls) {
        let generated = this.enSPARQL.getParentClass(cls);
        //enlogger.log('SPARQL:\n' + generated.sparql);
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
        //  enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql, { iri: generated.iri });
    },

    // updates an individual by its class reference and a data object with the values
    updateIndividualByClass: async function (cls, iri, ind) {
        let generated = this.enSPARQL.updateIndividualByClass(cls, iri, ind);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    // deletes an arbitray resource via its IRI
    deleteIntegrityRelation: async function (args) {
        let joins;
        if (args.relation) {
            joins = await this.traverseJoin(args.iri, args.relation);
            for (const item of joins) {
                if (
                    item.constraint ==
                    'http://ont.enapso.com/foundation#DeleteCascadeConstraint'
                ) {
                    let res = await this.deleteIndividual({
                        joins: [item.joins],
                        iri: args.iri
                    });
                    console.log(res);
                } else if (
                    item.constraint ==
                    'http://ont.enapso.com/foundation#DeleteRestrictConstraint'
                ) {
                    let res = await this.deleteRestrict({
                        joins: [item.joins],
                        iri: args.iri,
                        cache: args.cache
                    });
                    console.log(res);
                } else if (
                    item.constraint ==
                    'http://ont.enapso.com/foundation#DeleteSetNullConstraint'
                ) {
                    await this.deleteParentRelation(args.iri);
                    let res = await this.deleteIndividual({
                        iri: args.iri
                    });
                    console.log(res);
                } else {
                    let res = await this.deleteIndividual({
                        joins: [item.joins],
                        iri: args.iri
                    });
                    console.log(res);
                }
            }
            if (args.relation == 'parent2child') {
                let res = await this.deleteIndividual({
                    iri: args.iri
                });
                console.log(res);
            }
        } else {
            let res = await this.deleteIndividual({
                iri: args.iri
            });
            console.log(res);
        }
    },
    deleteIndividual: async function (args) {
        let generated = this.enSPARQL.deleteResource({
            iri: args.iri,
            joins: args.joins
        });
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteParentRelation: async function (args) {
        let generated = this.enSPARQL.deleteParentRelation(args);
        // enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteRestrict: async function (args) {
        let joins;
        if (args.joins) {
            joins = await this.findClassAndReplaceWithCacheClass(
                args.joins,
                args.cache
            );
            let cache = args.cache;
            let cls = await this.getIRIClassName(args.iri);
            if (cls.records.length) {
                let res2 = await this.showAllIndividuals({
                    cls: cache.getClassByIRI(cls.records[0].type),
                    joins: joins,
                    filter: [
                        {
                            key: '$sparql',
                            value: `regEx(str(?ind),  "${args.iri}", "i")`
                        }
                    ]
                });
                const result = res2.records.filter(
                    (item) => item.iri != args.iri
                );
                if (result.length > 0) {
                    return {
                        success: false,
                        message: 'Child need to be deleted first',
                        statusCode: 400
                    };
                } else {
                    return await this.deleteIndividual({
                        iri: args.iri
                    });
                }
            } else {
                return {
                    success: false,
                    message: 'No class found against that individual',
                    statusCode: 400
                };
            }
        } else {
            return await this.deleteIndividual({
                iri: args.iri
            });
        }
    },
    findClassAndReplaceWithCacheClass: async function (object, classCache) {
        let cache = classCache;
        for (var x in object) {
            if (typeof object[x] == typeof {}) {
                await this.findClassAndReplaceWithCacheClass(object[x], cache);
            }
            if (object['cls']) {
                if (typeof object['cls'] != typeof {}) {
                    object['cls'] = cache.getClassByIRI(object['cls']);
                }
            }
        }
        return object;
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
        //  enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    deleteLabelOfEachClassIndividual(args) {
        let generated = this.enSPARQL.deleteLabelOfEachClassIndividual(args);
        //  enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    createClassAndAddRestriction(args) {
        let generated = this.enSPARQL.createClassAndAddRestriction(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    addRestrictionToClass(args) {
        let generated = this.enSPARQL.createClassAndAddRestriction(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },

    addLabel(args) {
        let generated = this.enSPARQL.addLabel(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    changeLabel(args) {
        let generated = this.enSPARQL.changeLabel(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteLabel(args) {
        let generated = this.enSPARQL.deleteLabel(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteComment(args) {
        let generated = this.enSPARQL.deleteComment(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    addComment(args) {
        let generated = this.enSPARQL.addComment(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    changeComment(args) {
        let generated = this.enSPARQL.changeComment(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassReferenceModel(args) {
        let generated = this.enSPARQL.deleteClassReferenceModel(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassReferenceData(args) {
        let generated = this.enSPARQL.deleteClassReferenceData(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassModel(args) {
        let generated = this.enSPARQL.deleteClassModel(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClass(args) {
        let generated = this.enSPARQL.deleteClass(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassData(args) {
        let generated = this.enSPARQL.deleteClassData(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassModelAndData(args) {
        let generated = this.enSPARQL.deleteClassModelAndData(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassReferenceModelAndData(args) {
        let generated = this.enSPARQL.deleteClassReferenceModelAndData(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    deleteClassSpecificRestriction(args) {
        let generated = this.enSPARQL.deleteClassSpecificRestriction(args);
        enlogger.log('SPARQL:\n' + generated.sparql);
        return this.update(generated.sparql);
    },
    updateClassRestriction(args) {
        let generated = this.enSPARQL.updateClassRestriction(args);
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
    // Get iri class Name
    getIRIClassName: async function (iri) {
        let generated = this.enSPARQL.getIRIClassName(iri);
        // console.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    // Get Single class Object Properties
    getSingleClassObjectProperties: async function (cls) {
        let generated = this.enSPARQL.getSingleClassObjectProperties(cls);
        //console.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    getObjectPropertiesAndClassName: async function (cls, prop) {
        let generated = this.enSPARQL.getObjectPropertiesAndClassName(
            cls,
            prop
        );
        //  console.log('SPARQL:\n' + generated.sparql);
        return this.query(generated.sparql);
    },
    traverseParent2ChildJoin: async function (params, array) {
        let join = array || [];
        for (const key of params) {
            let objProp = await this.getSingleClassObjectProperties(key.range);
            let relation, constraint;
            if (objProp) {
                if (objProp.records.length) {
                    relation = objProp.records.filter(
                        (item) =>
                            item.prop ==
                            'http://ont.enapso.com/foundation#hasRelations'
                    );
                }
                if (relation) {
                    if (relation.length) {
                        constraint = await this.getSingleClassObjectProperties(
                            relation[0].range
                        );
                        constraint = constraint.records.filter(
                            (item) =>
                                item.prop ==
                                'http://ont.enapso.com/foundation#hasConstraints'
                        );
                        if (constraint) {
                            if (constraint.length) {
                                constraint = constraint[0].range;
                            } else {
                                constraint = constraint[0];
                            }
                        }
                    }
                }
            }
            join.push({
                joins: {
                    cls: key.range,
                    parent2ChildRelation: key.prop
                },
                constraint: constraint
            });
        }
        return join;
    },
    traverseChild2ParentJoin: async function (parentClass, array) {
        let join = array || [];
        const parent = parentClass.filter(
            (item) => item.prop == 'http://ont.enapso.com/foundation#hasParent'
        );
        const relation = parentClass.filter(
            (item) =>
                item.prop == 'http://ont.enapso.com/foundation#hasRelations'
        );
        let constraint = await this.getSingleClassObjectProperties(
            relation[0].range
        );
        const constraintFilter = constraint.records.filter(
            (item) =>
                item.prop == 'http://ont.enapso.com/foundation#hasConstraints'
        );
        // }
        for (const key of parent) {
            join.push({
                joins: {
                    cls: key.domain,
                    child2ParentRelation: key.prop
                },
                constraint: constraintFilter[0].range
            });
        }
        return join;
    },
    traverseJoin: async function (iri, relation) {
        let val = await this.getIRIClassName(iri);
        let join = [];
        if (val.records.length) {
            if (relation == 'parent2child') {
                let res = await this.getSingleClassObjectProperties(
                    val.records[0].type
                );
                return this.traverseParent2ChildJoin(res.records, join);
            } else if (relation == 'child2parent') {
                let relationClass, parentClass;
                relationClass = await this.getObjectPropertiesAndClassName(
                    val.records[0].type,
                    'enf:hasParent'
                );
                if (relationClass) {
                    if (relationClass.records.length) {
                        parentClass = await this.getSingleClassObjectProperties(
                            relationClass.records[0].class
                        );
                    }
                }
                if (parentClass) {
                    if (parentClass.records.length) {
                        return this.traverseChild2ParentJoin(
                            parentClass.records,
                            join
                        );
                    }
                }
            }
        } else {
            return join;
        }
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
        this.graphDBEndpoint = new EnapsoGraphDBClient.Endpoint({
            baseURL: GRAPHDB_BASE_URL,
            repository: GRAPHDB_REPOSITORY,
            prefixes: this.enPrefixManager.getPrefixesForConnector()
        });
        this.graphDBEndpoint.login(GRAPHDB_USERNAME, GRAPHDB_PASSWORD);
        this.classCache = await this.buildClassCache();

        let args = {
            cls: 'http://ont.enapso.com/auth#Activities',
            parent: 'http://ont.enapso.com/auth#Activity',
            label: 'Activities CXlas',
            comment: 'Activities Class Comment',
            restriction: [
                {
                    prop: 'http://ont.enapso.com/auth#name',
                    only: 'xsd:string'
                },
                {
                    prop: 'http://ont.enapso.com/auth#email',
                    min: 'xsd:string',
                    cardinality: 1
                },
                {
                    prop: 'http://ont.enapso.com/auth#hasRole',
                    exactly: 'http://ont.enapso.com/auth#Role',
                    cardinality: 1
                }
            ]
        };
        let delArgs = {
            cls: 'http://ont.enapso.com/auth#User',
            restriction: [
                {
                    prop: 'http://ont.enapso.com/auth#name',
                    instanceDeletion: true
                },
                {
                    prop: 'http://ont.enapso.com/auth#email',
                    exactly: 'xsd:string',
                    cardinality: 1
                }
            ]
        };
        let updateArgs = {
            cls: 'http://ont.enapso.com/auth#User',
            restriction: [
                {
                    prop: 'http://ont.enapso.com/auth#name',
                    previousRestriction: {
                        exactly: 'xsd:string',
                        cardinality: 1
                    },
                    updateRestriction: {
                        max: 'xsd:string',
                        cardinality: 2
                    }
                },
                {
                    prop: 'http://ont.enapso.com/auth#email',
                    updateRestriction: {
                        min: 'xsd:string',
                        cardinality: 1
                    }
                }
            ]
        };
        await this.createClassAndAddRestriction(args);
        await this.addRestrictionToClass(Addargs);
        await this.deleteClassSpecificRestriction(delArgs);
        await this.updateClassRestriction(updateArgs);
        await this.deleteLabel({
            cls: 'http://ont.enapso.com/auth#User'
        });
        await this.addLabel({
            cls: 'http://ont.enapso.com/auth#User',
            label: 'Activites'
        });
        await this.changeLabel({
            cls: 'http://ont.enapso.com/auth#User',
            label: 'Change Activites'
        });
        await this.deleteComment({
            cls: 'http://ont.enapso.com/auth#User',
            comment: 'Activites'
        });
        await this.addComment({
            cls: 'http://ont.enapso.com/auth#User',
            comment: 'Activites'
        });
        await this.changeComment({
            cls: 'http://ont.enapso.com/auth#User',
            comment: 'Activites Comment'
        });
        await this.deleteClassModel({
            cls: 'http://ont.enapso.com/auth#User'
        });
        await this.deleteClassData({
            cls: 'http://ont.enapso.com/auth#User'
        });
        await this.deleteClassModelAndData({
            cls: 'http://ont.enapso.com/auth#Role'
        });
        await this.deleteClassReferenceModel({
            cls: 'http://ont.enapso.com/auth#Role'
        });
        await this.deleteClassReferenceData({
            cls: 'http://ont.enapso.com/auth#User'
        });
        await this.deleteClassReferenceModelAndData({
            cls: 'http://ont.enapso.com/auth#Role'
        });
        await this.deleteClass({
            cls: 'http://ont.enapso.com/auth#User'
        });
    }
};

(async () => {
    await AUTH.demo();
})();
