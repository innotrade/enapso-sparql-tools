// Innotrade Enapso SPARQL Tools - Module Demo
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

// requires the Enapso GraphDB Client package
const { EnapsoGraphDBClient } = require("@innotrade/enapso-graphdb-client"),
	{ EnapsoLogger } = require("@innotrade/enapso-logger");
global.enlogger = new EnapsoLogger();
const _ = require("lodash");

const EnapsoSPARQLTools = {};
_.merge(
	EnapsoSPARQLTools,
	require("../lib/properties"),
	require("../lib/classes"),
	require("../lib/classCache"),
	require("../lib/prefixManager"),
	require("../lib/generator")
);

const GRAPHDB_BASE_URL = "http://localhost:7200",
	GRAPHDB_REPOSITORY = "Test";
const NS_AUTH = "http://ont.enapso.com/repo#",
	PREFIX_AUTH = "enrepo";
// the default prefixes for all SPARQL queries
const AUTH_PREFIXES = [
	EnapsoGraphDBClient.PREFIX_OWL,
	EnapsoGraphDBClient.PREFIX_RDF,
	EnapsoGraphDBClient.PREFIX_RDFS,
	EnapsoGraphDBClient.PREFIX_XSD,
	{
		prefix: PREFIX_AUTH,
		iri: NS_AUTH,
	},
];

const AUTH = {
	graphDBEndpoint: null,
	authentication: null,
	defaultBaseIRI: NS_AUTH,
	defaultPrefix: PREFIX_AUTH,
	defaultIRISeparator: "#",
	query: async function (sparql) {
		let query = await this.graphDBEndpoint.query(sparql);
		let resp;
		if (query.success) {
			resp = await this.graphDBEndpoint.transformBindingsToResultSet(query, {
				dropPrefixes: true,
			});
		} else {
			let lMsg = query.message;
			if (400 === query.statusCode) {
				lMsg += ", check your query for potential errors";
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
				message: lMsg,
			};
		}
		return resp;
	},
	update: async function (sparql, params) {
		let resp = await this.graphDBEndpoint.update(sparql, params);
		if (!resp.success) {
			let lMsg = resp.message;
			if (400 === resp.statusCode) {
				lMsg += ", check your query for potential errors";
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
			let cls = this.generateClassFromClassProperties(NS_AUTH, className, res);

			// add the class to the cache
			classCache.addClass(cls);
		}

		return classCache;
	},

	// get all instances of a certain class from the graph
	getIndividualsByClass: async function (args) {
		let generated = this.enSPARQL.getIndividualsByClass(args);
		enlogger.log("SPARQL:\n" + generated.sparql);
		return this.query(generated.sparql);
	},

	// show all individuals of a certain class in the enlogger
	showAllIndividuals: async function (args) {
		// and retrieve all instances by the given in-memory class
		res = await this.getIndividualsByClass(args);
		return res;
	},

	// show all individuals of a certain class in the enlogger
	showIndividual: async function (cls, iri) {
		// and retrieve all instances by the given in-memory class
		res = await this.getIndividualsByClass({
			cls,
			prefixClass: true,
			prefixPredicates: true,
			prefixFilter: true,
			iris: [iri],
		});
		out = JSON.stringify(res, null, 2);
		enlogger.log("Getting all individuals by class:" + out);
	},
	// create a new instance of a certain class in the graph
	createIndividualByClass: async function (cls, ind, options) {
		let generated = this.enSPARQL.createIndividualByClass(cls, ind, options);
		//enlogger.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql, { iri: generated.iri });
	},

	// updates an individual by its class reference and a data object with the values
	updateIndividualByClass: async function (cls, iri, ind) {
		let generated = this.enSPARQL.updateIndividualByClass(cls, iri, ind);
		//enlogger.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	},
	// deletes an arbitray resource via its IRI
	deleteResource: async function (iri) {
		let generated = this.enSPARQL.deleteResource(iri);
		//enlogger.log('SPARQL:\n' + generated.sparql);
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

	// deleting an individual via its IRI is the same like deleting any entity
	// todo: later we we can add a check here if it is really an individual!
	deleteIndividual: async function (iri) {
		return this.deleteResource(iri);
	},
	cloneIndividual(productClass, productIRI) {
		let generated = this.enSPARQL.cloneIndividual(productClass, productIRI);
		//enlogger.log('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql, { iri: generated.iri });
	},
	demo: async function () {
		// instantiate a prefix manager
		enlogger.setLevel(EnapsoLogger.ALL);
		this.enPrefixManager = new EnapsoSPARQLTools.PrefixManager(AUTH_PREFIXES);

		// in case no prefix is given for a certain resource identifier use the EDO: here
		this.enPrefixManager.setDefaultPrefix(PREFIX_AUTH);

		// create a SPARQL generator using the prefix manager
		this.enSPARQL = new EnapsoSPARQLTools.Generator({
			prefixManager: this.enPrefixManager,
		});

		// instantiate a GraphDB connector and connect to GraphDB
		this.graphDBEndpoint = new EnapsoGraphDBClient.Endpoint({
			baseURL: GRAPHDB_BASE_URL,
			repository: GRAPHDB_REPOSITORY,
			prefixes: this.enPrefixManager.getPrefixesForConnector(),
		});

		// import all classes into memory
		this.classCache = await this.buildClassCache();
		// load some classes from the class cache for later convience
		this.Tenant = this.classCache.getClassByIRI(NS_AUTH + "Tenant");
		this.Environment = this.classCache.getClassByIRI(NS_AUTH + "Environment");
		this.Host = this.classCache.getClassByIRI(NS_AUTH + "Host");
		this.DatabaseInstance = this.classCache.getClassByIRI(NS_AUTH + "DatabaseInstance");
		this.Repository = this.classCache.getClassByIRI(NS_AUTH + "Repository");
		this.Graph = this.classCache.getClassByIRI(NS_AUTH + "Graph");
		let joins = [
			// first join (for tenants) on level 1
			{
				cls: this.Environment,
				child2MasterRelation: "hasTenant",
				joins: [
					{
						cls: this.Host,
						child2MasterRelation: "hasEnvironment",
						joins: [
							{
								cls: this.DatabaseInstance,
								child2MasterRelation: "hasHost",
								joins: [
									{
										cls: this.Repository,
										child2MasterRelation: "hasDatabaseInstance",
										joins: [
											{
												cls: this.Graph,
												child2MasterRelation: "hasRepository",
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];
		let res = await this.showAllIndividuals({
			cls: this.Tenant,
			joins: joins,
			filter: [
				{
					key: "$sparql",
					value: 'regEx(?name, "Innotrade GmbH", "i")',
				},
			]
		});
	},
};
enlogger.log("AUTH/Enapso SPARQL Client Demo");

(async () => {
	await AUTH.demo();
})();
