// Innotrade Enapso SPARQL Tools - Module Demo
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

// requires the Enapso GraphDB Client package
const 
	{ EnapsoGraphDBClient } = require('@innotrade/enapso-graphdb-client'),
	{ EnapsoLogger } = require('@innotrade/enapso-logger');

global.enlogger = new EnapsoLogger();
enlogger.setLevel(EnapsoLogger.ALL);

const uuidv4 = require('uuid/v4');
const fs = require("fs");
const _ = require("lodash");

const EnapsoSPARQLTools = {};
_.merge(EnapsoSPARQLTools, require('../lib/properties'), require('../lib/classes'), require('../lib/classCache'),
	require('../lib/prefixManager'), require('../lib/generator'));

const
	// connection data to the running GraphDB instance
	GRAPHDB_BASE_URL = 'http://localhost:7200',
	// repository to by queried
	GRAPHDB_REPOSITORY = 'EnapsoDotNetProDemo'
	;

const
	// namespace for the Enapso Demo Ontology (EDO)
	NS_EDO = "http://ont.enapso.com/dotnetpro#",
	// prefix for the Enapso Demo Ontology (EDO)
	PREFIX_EDO = "dnp"
	;

// the default prefixes for all SPARQL queries
const EDO_PREFIXES = [
	EnapsoGraphDBClient.PREFIX_OWL,
	EnapsoGraphDBClient.PREFIX_RDF,
	EnapsoGraphDBClient.PREFIX_RDFS,
	EnapsoGraphDBClient.PREFIX_XSD,
	{
		"prefix": PREFIX_EDO,
		"iri": NS_EDO
	}
];

const EnapsoSparqlToolsDemo = {

	graphDBEndpoint: null,
	authentication: null,

	defaultBaseIRI: NS_EDO,
	defaultPrefix: PREFIX_EDO,
	defaultIRISeparator: '#',


	// perform a query operation against GrapDB, which returns a result set.
	query: async function (sparql) {
		let query = await this.graphDBEndpoint.query(sparql);
		let resp;
		if (query.success) {
			resp = await this.graphDBEndpoint.transformBindingsToResultSet(query, {
				"dropPrefixes": true
			});
		} else {
			let lMsg = query.message;
			if (400 === query.statusCode) {
				lMsg += ', check your query for potential errors';
			} else if (403 === query.statusCode) {
				lMsg += ', check if user "' + GRAPHDB_USERNAME +
					'" has appropriate access rights to the Repository ' +
					'"' + this.graphDBEndpoint.getRepository() + '"';
			}
			resp = {
				"total": 0,
				"success": false,
				"message": lMsg
			};
		}
		return resp;
	},


	// perform an update operation against GrapDB, which does not return a result set.
	update: async function (sparql, params) {
		let resp = await this.graphDBEndpoint.update(sparql, params);
		if (!resp.success) {
			let lMsg = resp.message;
			if (400 === resp.statusCode) {
				lMsg += ', check your query for potential errors';
			} else if (403 === resp.statusCode) {
				lMsg += ', check if user "' + GRAPHDB_USERNAME +
					'" has appropriate access rights to the Repository ' +
					'"' + this.graphDBEndpoint.getRepository() + '"';
			}
		}
		return resp;
	},


	// retrieve all classes from the graph
	getAllClasses: async function () {
		let generated = this.enSPARQL.getAllClasses();
		enlogger.debug('SPARQL:\n' + generated.sparql);
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
		// enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.query(generated.sparql);
	},

	// generates an in-memory class from a SPARQL result set
	generateClassFromClassProperties: function (ns, name, classProps) {
		let cls = new EnapsoSPARQLTools.Class(ns, name);
		for (let propRec of classProps.records) {
			// todo: here we need to add the restrictions, domain, range, min, max, exactly etc.
			let prop = new EnapsoSPARQLTools.Property(ns, propRec.prop, propRec.type, propRec.range, propRec.domain);
			// add the property to the class
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
			let cls = this.generateClassFromClassProperties(NS_EDO, className, res);

			// add the class to the cache
			classCache.addClass(cls);
		}

		return classCache;
	},


	// get all instances of a certain class from the graph
	getIndividualsByClass: async function (args) {
		let generated = this.enSPARQL.getIndividualsByClass(args);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.query(generated.sparql);
	},

	// get all related individuals from a certain individual via a certain property
	getRelatedIndividuals: async function (args) {
		let generated = this.enSPARQL.getRelatedIndividuals(args);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.query(generated.sparql);
	},

	// create a new instance of a certain class in the graph
	createIndividualByClass: async function (cls, ind, options) {
		let generated = this.enSPARQL.createIndividualByClass(cls, ind, options);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql, { iri: generated.iri });
	},


	// updates an individual by its class reference and a data object with the values
	updateIndividualByClass: async function (cls, iri, ind) {
		let generated = this.enSPARQL.updateIndividualByClass(cls, iri, ind);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	},


	// deletes an arbitray resource via its IRI
	deleteResource: async function (iri) {
		let generated = this.enSPARQL.deleteResource(iri);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	},


	// deleting an individual via its IRI is the same like deleting any entity
	// todo: later we we can add a check here if it is really an individual!
	deleteIndividual: async function (iri) {
		return this.deleteResource(iri);
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
`);
	},


	// add a relation between two individuals 
	createRelation: async function (master, property, child) {
		let generated = this.enSPARQL.createRelation(master, property, child);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	},


	// delete a relation between two individuals 
	deleteRelation: async function (master, property, child) {
		let generated = this.enSPARQL.deleteRelation(master, property, child);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql);
	},


	// -------------------------------------------------
	// some high level test functions
	// -------------------------------------------------

	// show all individuals of a certain class in the console
	showAllIndividuals: async function (cls) {
		// and retrieve all instances by the given in-memory class
		res = await this.getIndividualsByClass({
			cls
			, prefixClass: true
			, prefixPredicates: true
			, prefixFilter: true
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Getting all individuals by class:' + out);
	},

	// show all individuals of a certain class in the console
	showIndividual: async function (cls, iri) {
		// and retrieve all instances by the given in-memory class
		res = await this.getIndividualsByClass({
			cls
			, prefixClass: true
			, prefixPredicates: true
			, prefixFilter: true
			, iris: [iri]
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Get single individual by class and IRI:' + out);
	},


	// -------------------------------------------------
	// some analytics block
	// -------------------------------------------------	

	// sum all product sales in bills in a from to time range for a certain product
	// just comment out the product filter for all products
	getSales: async function (code) {
		return this.query(`
select (sum(?totalPrice) as ?sum)
where {
	?bill a EDO:Bill ;
		EDO:has_Bill_Date ?date ;
		EDO:billHasOrder ?order .
	?order EDO:orderHasOrderline ?orderline .
	?orderline EDO:orderlineHasProduct ?product .
	?product EDO:has_Product_Quantity ?quantity ;
		EDO:has_Product_Code ?code ;
		EDO:has_Product_Price ?singlePrice .
	bind(?quantity * ?singlePrice as ?totalPrice) .
	filter(?date >= "2010-08-10T00:00:00Z"^^xsd:dateTime && ?date <= "2010-10-10T00:00:00Z"^^xsd:dateTime) .
	filter(?code = "${code}") .
}
		`);
	},

	// get email, name and password of a staff member in the graph
	getStaffInfo: async function (email, name) {
		return this.query(`
select ?email ?name ?password ?pw_sha256_hash
where { 
	?staff a EDO:Staff ;
		EDO:has_Staff_Email ?email ;
			EDO:has_Staff_Name ?name ;
		EDO:has_Staff_Password ?password .
	bind( sha256(?password) as ?pw_sha256_hash ) .
	filter( ?email = "${email}" && ?name = "${name}")
}
		`);
	},

	/*
	select ?name ?password
	where { 
	  ?company a EDO:Company ;
				EDO:has_Company_Name ?name ;
				EDO:has_Company_Password ?password .
		filter( regEx(?name, "munna", "i") )
	}
	*/

	// -------------------------------------------------
	// some examples block
	// -------------------------------------------------	

	// returns the IRI for the newly created individual (as clone of an exsiting individual)
	cloneIndividual(productClass, productIRI) {
		let generated = this.enSPARQL.cloneIndividual(productClass, productIRI);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql, { iri: generated.iri });
	},


	// returns 
	mapIndividual(origCls, origIri, newCls, newIri, mapping) {
		let generated = this.enSPARQL.mapIndividual(origCls, origIri, newCls, newIri, mapping);
		enlogger.debug('SPARQL:\n' + generated.sparql);
		return this.update(generated.sparql, { iri: generated.iri });
	},


	// returns the IRI for the newly created orderline
	async addOrderlineForCompany(companyIRI) {
		let orderlineClass = this.classCache.getClassByIRI(NS_EDO + "Orderline");
		res = await this.createIndividualByClass(orderlineClass, {
			// orderline does not need any fields when created
		});
		// save the iri for this individual
		let orderlineIRI = res.params.iri;
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Creating orderline by class: ' + out);

		res = await this.createRelation(companyIRI, 'EDO:companyHasOrderline', orderlineIRI);
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Adding orderline to company: ' + out);
	},


	// adds a (cloned) product to an existing orderline
	async addProductToOrderline(orderlineIRI, productIRI, productCount, productPrice) {

		let productClass = this.classCache.getClassByIRI(NS_EDO + "Product");
		/*
				// retrieve with the given IRI
				res = await this.getIndividualsByClass({
					cls: productClass, iris: [productIRI]
				});
				out = JSON.stringify(res, null, 2);
				enlogger.debug('Get existing product by IRI:' + out);
		
				let origProduct;
				if (res.success && res.records && res.records.length > 0) {
					origProduct = res.records[0];
				} else {
					enlogger.debug('Product with IRI ' + productIRI + ' not found');
					return;
				}
		*/
		res = await this.cloneIndividual(productClass, productIRI);
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Cloning Product: ' + out);

		res = await this.updateIndividualByClass(companyClass, iri, {
			"has_Company_Name": "Mustermann, Max",
			"has_Company_Password": "G3h31m",
			"has_Company_Phone_No": "+49 2407 502313-0",
			// it's possible to also update a relation while updating the individual
			"hasOrderline": existingOrderline2IRI
		});

		/*
				res = await this.createIndividualByClass(orderlineClass, {
					// orderline does not need any fields when created
				});
				// save the iri for this individual
				let orderlineIRI = res.params.iri;
				out = JSON.stringify(res, null, 2);
				enlogger.debug('Creating orderline by class: ' + out);
			    
				res = await this.createRelation(companyIRI, 'EDO:companyHasOrderline', orderlineIRI);
				out = JSON.stringify(res, null, 2);
				enlogger.debug('Adding orderline to company: ' + out);
		*/
	},


	// -------------------------------------------------
	// the demo block
	// -------------------------------------------------	

	demoGetAllClasses: async function () {
		// get all classes
		let res = await this.getAllClasses();
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Getting all classes:' + out);
	},

	// read multiple demo
	demoShowAllIndividualsOfAClass: async function () {
		await this.showAllIndividuals(this.companyClass);
		/*
		await this.showAllIndividuals(orderlineClass);
		await this.showAllIndividuals(productClass);
		*/
	},

	// create demo
	demoCreateIndividualByClass: async function () {
		// insert a new individual based on the in-memory class
		let res = await this.createIndividualByClass(this.companyClass, {
			// optionally use a predefined IRI here
			// if omitted then an UUID will be generated
			"iri": this.testCompanyIRI,
			"companyName": "My Company Ltd."
			// "has_Company_Password": "S3cr3t2",
			// "has_Company_Phone_No": "+49 160 909158432",
			// it's possible to directly add relations to an individual while creating the individual
			// "hasOrderline": existingOrderline1IRI
		}, {
			prefixClass: true,
			prefixProperties: true,
			prefixIndividual: true
		});
		// save the iri for this individual
		iri = res.params.iri;
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Creating individual by class:' + out);
	},

	// read single demo
	async demoReadIndividualByClass() {
		// check if new company is really created
		await this.showIndividual(
			this.companyClass,
			this.testCompanyIRI
		);
	},

	async demoUpdateIndividualByClass() {
		// update an existing individual based on the in-memory class and its iri
		res = await this.updateIndividualByClass(this.companyClass, this.testCompanyIRI, {
			"companyName": "MyUpdatedCompany Ltd.",
			// "has_Company_Password": "G3h31m",
			// "has_Company_Phone_No": "+49 2407 502313-0",
			// it's possible to also update a relation while updating the individual
			// "hasOrderline": existingOrderline2IRI
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Updating individual by class:' + out);

		// check if new company is really created
		await this.showIndividual(this.companyClass, this.testCompanyIRI);
	},

	async demoDeleteIndividualByClass() {
		// delete individual by using the previously saved iri
		res = await this.deleteIndividual(this.testCompanyIRI);
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Deleting individual by iri:' + out);

		// and retrieve all instances by the given in-memory class
		res = await this.getIndividualsByClass({
			cls: this.companyClass,
			iris: [this.testCompanyIRI]
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Getting individuals by class:' + out);

		// and retrieve all instances by the given in-memory class
		res = await this.getIndividualsByClass({
			cls: this.companyClass
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Getting individuals by class:' + out);
	},

	demo: async function () {

		// instantiate a prefix manager
		this.enPrefixManager = new EnapsoSPARQLTools.PrefixManager(EDO_PREFIXES);

		// in case no prefix is given for a certain resource identifier use the EDO: here
		this.enPrefixManager.setDefaultPrefix(PREFIX_EDO);

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

		// import all classes into memory
		this.classCache = await this.buildClassCache();

		// load some classes from the class cache for later convience
		this.companyClass = this.classCache.getClassByIRI(NS_EDO + "Company");
		// let orderlineClass = this.classCache.getClassByIRI(NS_EDO + "Orderline");
		// let productClass = this.classCache.getClassByIRI(NS_EDO + "Product");
		// let orderlineProductClass = this.classCache.getClassByIRI(NS_EDO + "OrderlineProduct");


		// set some variables to be used in the demos methods:
		this.testCompanyIRI = NS_EDO + 'Company_Demo';

		// now the various demos:

		await this.demoGetAllClasses();
		await this.demoShowAllIndividualsOfAClass();

		await this.demoCreateIndividualByClass();
		await this.demoReadIndividualByClass();
		await this.demoUpdateIndividualByClass();
		await this.demoDeleteIndividualByClass();

		return;


		let res, iri, out;

		// define some IRIs to test the above functions
		// let existingCompanyIRI = NS_EDO + 'SABS_CUSTOMER_01';
		// let existingProductIRI = NS_EDO + 'SABS_PRODUCT_01';
		// let newProductIRI = NS_EDO + 'SABS_PRODUCT_03';

		// let existingOrderline1IRI = NS_EDO + 'SABS_ORDERLINE_01';
		// let existingOrderline2IRI = NS_EDO + 'SABS_ORDERLINE_02';
		// let testOrderlineIRI = NS_EDO + 'Orderline_Test';

		// let companyHasOrderlineIRI = NS_EDO + 'hasOrderline';

		return;


		// get all classes
		res = await this.mapIndividual(
			productClass, existingProductIRI,
			orderlineProductClass, newProductIRI, [
			{
				"from": "EDO:has_Product_Name",
				"to": "EDO:has_OrderlineProduct_Name"
			},
			{
				"from": "EDO:has_Product_Price",
				"to": "EDO:has_OrderlineProduct_Price"
			},
			{
				"from": "EDO:has_Product_Quantity",
				"to": "EDO:has_OrderlineProduct_Quantity"
			},
			{
				"from": "EDO:has_Product_Code",
				"to": "EDO:has_OrderlineProduct_Code"
			},
			{
				"from": "EDO:has_Product_Category",
				"to": "EDO:has_OrderlineProduct_Category"
			}
		]);
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Getting all classes:' + out);
		return;

		/*
		// search all individuals of a certain class in the console
		let name = 'max';
		res = await this.getIndividualsByClass({
			cls: companyClass
			, filter: [
			
				// {
				// 	has_Company_Name: {
				// 		$regExp: {
				// 			"match": "max",
				// 			"options": "i"
				// 		}
				// 	}
				// },
				
				{
					$sparql: `regEx(?has_Company_Name, "${name}", "i")`
				}
			]
			//, prefixClass: false
			//, prefixPredicates: false
			//, prefixFilter: false
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Getting all individuals by class:' + out);
		return;
		*/

		/*
		// clone a product
		res = await this.cloneIndividual(productClass, "SABS_PRODUCT_01");
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Cloning Product: ' + out);
		return;
		*/

		/*
		// get sales of a certain product
		res = await this.getSales("654RED");
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Calculating Sales: ' + out);
		return;
		*/

		/*
		// read all child individuals of a given master individual based on the master IRI, object property and child class
		res = await this.getStaffInfo("YASIR762923@GMAIL.COM", "ASHESH");
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Get Staff Info: ' + out);
		return;
		*/

		/*
		// create a new (empty) orderline for a company
		res = await this.addOrderlineForCompany(existingCompanyIRI);
		return;
		*/

		// add a product with count to an existing orderline
		res = await this.addProductToOrderline(existingOrderline1IRI, existingProductIRI, 4);
		return;

		// read all child individuals of a given master individual based on the master IRI, 
		// object property and child class
		res = await this.getRelatedIndividuals({
			masterCls: orderlineClass,
			masterIri: NS_EDO + "SABS_ORDERLINE_01",
			propertyIri: NS_EDO + "orderlineHasProduct",
			childCls: productClass
		});
		out = JSON.stringify(res, null, 2);
		enlogger.debug('Reading related individual by master IRI, property and child class:' + out);


		// UPDATE!

		// remove the relation between the newly created company and an orderline
		res = await this.deleteRelation(iri, companyHasOrderlineIRI, existingOrderline2IRI);

		// check if new company really has no relation anymore
		await this.showIndividual(companyClass, testCompanyIRI);

		// add the relation between the newly created company and an orderline
		res = await this.createRelation(iri, companyHasOrderlineIRI, existingOrderline1IRI);
		res = await this.createRelation(iri, companyHasOrderlineIRI, existingOrderline2IRI);

		// check if new company is really created
		await this.showIndividual(companyClass, testCompanyIRI);

		// DELETE!




		/*
		out = JSON.stringify(await this.getProperties(), null, 2);
		enlogger.debug('Getting data and object properties: ' + out);
		return;
		*/

		/*
		out = JSON.stringify(await this.getDataProperties(), null, 2);
		enlogger.debug('Getting data properties: ' + out);
		return;
		*/

		/*
		out = JSON.stringify(await this.getObjectProperties(), null, 2);
		enlogger.debug('Getting object properties: ' + out);
		return;
		*/


	}

}

enlogger.debug("Enapso SPARQL Tools Demo\n(C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany\n");

(async () => {
	await EnapsoSparqlToolsDemo.demo();
})();
