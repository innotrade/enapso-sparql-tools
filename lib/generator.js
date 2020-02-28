// Enapso SPARQL Tools - Module SPARQL generator
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

const uuidv4 = require('uuid/v4');

// SPARQL query and update command generator
class Generator {

	constructor(args) {
		args = args || {};
		this.prefixManager = args.prefixManager;
	}

	setPrefixManager(prefixManager) {
		this.prefixManager = prefixManager;
	}


	// retrieve all classes from the graph database
	getAllClasses() {
		let sparql =
			`select ?class ?superClass
where {
	?class a owl:Class .
	filter( !isBlank(?class) )
	optional {
		?class rdfs:subClassOf ?superClass .
		?superClass a ?sctype .
		filter(?sctype = owl:Class && !isBlank(?superClass))
	}
} 
order by ?class
`;
		return { sparql };
	}


	// retrieve all properties from a given class
	getClassProperties(cls) {
		let iri = this.prefixManager.getSparqlIRI(cls);
		let sparql = `select distinct
	?prop ?type ?range ?domain
	?only ?some ?min ?max ?exactly
where {
	bind( ${iri} as ?class ) .
	?class rdfs:subClassOf ?restr .
	?restr owl:onProperty ?prop .
	?prop a ?type .
	filter( ?type = owl:DatatypeProperty
		|| ?type = owl:ObjectProperty ) .

	?restr ( owl:onClass | owl:onDataRange
		| owl:someValuesFrom | owl:allValuesFrom ) ?range .
	bind( ?class as ?domain ) .

	optional { ?restr owl:allValuesFrom ?only } .
	optional { ?restr owl:someValuesFrom ?some } .
	optional { ?restr owl:minQualifiedCardinality ?min } .
	optional { ?restr owl:qualifiedCardinality ?exactly } .
	optional { ?restr owl:maxQualifiedCardinality ?max } .
}`;
		/*	
				let sparql =
					`select ?property ?type ?range ?domain ?some ?min ?max ?exactly
		where {
			bind( ${iri} as ?class )
			{
				?property rdfs:domain ?class ; rdf:type ?type .
				filter( ?type = owl:DatatypeProperty || ?type = owl:ObjectProperty ) .
				optional { ?property rdfs:range ?rangeRaw } .
				optional { ?property rdfs:domain ?domain } .
		
				bind(?rangeRaw as ?rangeVar)
				optional { ?rangeVar owl:allValuesFrom ?rangeRestriction } .
		
				bind( if( isBlank(?rangeVar), ?rangeRestriction, ?rangeRaw ) as ?range )
			  
			} union { 
			    
				?class rdfs:subClassOf ?restriction . 
				filter (isBlank(?restriction)) .
				bind( owl:ObjectProperty as ?type )
				bind( ?class as ?domain )
				?restriction owl:onProperty ?property .
				?restriction ( owl:onClass|owl:onDataRange|owl:someValuesFrom|owl:allValuesFrom ) ?range .
		
				optional { ?restriction owl:someValuesFrom ?some } .
				optional { ?restriction owl:minQualifiedCardinality ?min } .
				optional { ?restriction owl:qualifiedCardinality ?exactly } .
				optional { ?restriction owl:maxQualifiedCardinality ?max } .
			}
		}`;
		*/
		return { sparql };
	}


    /*
    SPARQL example:
    select ?iri ?has_Customer_ID ?has_Customer_Name ?has_Customer_Password ?has_Customer_Phone_No ?has_Customer_Email ?hasOrderline
    where {
        ?ind a <http://ont.comsats.edu/fyp#Customer> .
        bind(str(?ind) as ?iri) . 
        filter(?iri in ("http://ont.comsats.edu/fyp#Customer_SchulzeAlexander")) .
        optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_ID> ?has_Customer_ID } .
        optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Name> ?has_Customer_Name } .
        optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Password> ?has_Customer_Password } .
        optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Phone_No> ?has_Customer_Phone_No } .
        optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Email> ?has_Customer_Email } .
        optional { ?ind <http://ont.comsats.edu/fyp#hasOrderline> ?hasOrderline } .
    }
    */
	// get all instances of a certain class from the graph
	// cls: the in-memory class
	// prefixProps: true = uses prefixed property identifiers
	getIndividualsByClass(args) {
		args = args || {};
		if (!args.cls) {
			throw "No class passed";
		}
		args.prefixPredicates = (args.prefixPredicates === undefined ? true : args.prefixPredicates);
		args.prefixFilter = (args.prefixFilter === undefined ? true : args.prefixFilter);
		args.prefixClass = (args.prefixClass === undefined ? true : args.prefixClass);

		let cls = args.cls;

		let offset = args.offset === undefined ? 0 : args.offset;
		let limit = args.limit === undefined ? 0 : args.limit;

		// first generate list of fields to be queried
		let fields = '?iri';
		for (let prop of cls.getProperties()) {
			fields += ' ?' + prop.getName();
		}

		// check if iri filter needs to be applied
		let iris = args.iris;
		let filters = args.filter;
		let iriFilterStr = '';
		if (iris) {
			let filterArgs = [];
			for (let arg of iris) {
				let iri = (args.prefixFilter
					? this.prefixManager.fullToPrefixedIRI(arg)
					: this.prefixManager.getSparqlIRI(arg)
				);
				filterArgs.push(iri);
			}
			iriFilterStr = `
	filter(?ind in (${filterArgs.join(', ')})) .`;
		}

		let fieldFilterStr = '';
		if (filters) {
			for (let filter of filters) {
				let filterKey = filter.property || filter.key;
				let filterValue = filter.value;
				// the SPARQL filter is deprecated and will be dropped due to security reasons!
				if (filterKey === '$sparql') {
					fieldFilterStr = `filter(${filterValue})`;
				} else if (filterKey === '$json') {
					if (filterValue) {
						// here we need to extend the fiters according to the mongodb spec at:
						// https://docs.mongodb.com/manual/reference/operator/query/
						for (let fieldName in filterValue) {
							let filterArgs = filterValue[fieldName];
							if (filterArgs.$regex) {
								fieldFilterStr = `filter(regEx(?${fieldName}, "${filterArgs.$regex}", "${filterArgs.$options}"))`;
							}
						}
					}
				}
			}
		}

		// now generate the where clause for the select statement
		// first add the individual
		// then add the iri filter, if such is requested
		let clsStr = (args.prefixPredicates
			? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
			: this.prefixManager.getSparqlIRI(cls.getIRI())
		);
		let where =
			`?ind a ${clsStr} .\t${iriFilterStr}
	bind(str(?ind) as ?iri) .`;
		// now add all properties
		for (let prop of cls.getProperties()) {
			let propStr = (args.prefixPredicates
				? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
				: this.prefixManager.getSparqlIRI(prop.getIRI())
			);
			where =
				`${where}
	optional { ?ind ${propStr} ?${prop.getName()} } .`;
		}

		if (fieldFilterStr.length > 0) {
			where = `${where}
	${fieldFilterStr}`;
		}
		// and compose the query
		let sparql =
			`select ${fields}
where {
	${where}
}`;
		if (offset) {
			sparql = `${sparql}\noffset ${offset}`
		}
		if (limit) {
			sparql = `${sparql}\nlimit ${limit}`
		}
		// return the generated SPARQL
		return { sparql };
	}

    /*
    SPARQL example:
	select ?master ?child ?has_Product_Name ?has_Product_Code ?has_Product_Price
	where {
		filter(?master in (fyp:SABS_ORDERLINE_01)) .
		optional { 
			?master fyp:hasProduct ?child .
			optional { ?child fyp:has_Product_Name ?has_Product_Name } .
			optional { ?child fyp:has_Product_Code ?has_Product_Code } .
			optional { ?child fyp:has_Product_Price ?has_Product_Price } .
		}
	}
    */
	// get all related instances of a certain class from the graph
	// cls: the in-memory class
	// prefixProps: true = uses prefixed property identifiers
	getRelatedIndividuals(args) {
		args = args || {};
		if (!args.childCls) {
			throw "No child class passed";
		}
		args.prefixPredicates = (args.prefixPredicates === undefined ? true : args.prefixPredicates);
		args.prefixFilter = (args.prefixFilter === undefined ? true : args.prefixFilter);
		args.prefixClass = (args.prefixClass === undefined ? true : args.prefixClass);

		let childCls = args.childCls;
		// first generate list of fields to be queried
		let fields = '?master ?child';
		for (let prop of childCls.getProperties()) {
			fields += ' ?' + prop.getName();
		}

		// check if iri filter needs to be applied
		let masterIris = [args.masterIri];
		let filter = '';
		if (masterIris) {
			let filterArgs = [];
			for (let arg of masterIris) {
				let masterIri = (args.prefixFilter
					? this.prefixManager.fullToPrefixedIRI(arg)
					: this.prefixManager.getSparqlIRI(arg)
				);
				filterArgs.push(masterIri);
			}
			filter = `filter(?master in (${filterArgs.join(', ')})) .`;
		}

		// now generate the where clause for the select statement
		// add the iri filter, if such is requested
		let propStr = (args.prefixFilter
			? this.prefixManager.fullToPrefixedIRI(args.propertyIri)
			: this.prefixManager.getSparqlIRI(args.propertyIri)
		);
		let where =
			`${filter}
	optional {
		?master ${propStr} ?child`;

		// now add all properties
		for (let prop of childCls.getProperties()) {
			let propStr = (args.prefixPredicates
				? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
				: this.prefixManager.getSparqlIRI(prop.getIRI())
			);
			where =
				`${where}
		optional { ?child ${propStr} ?${prop.getName()} } .`;
		}
		where = `${where}
	}`;

		// and compose the query
		let sparql =
			`select ${fields}
where {
	${where}
}`;
		// return the generated SPARQL
		return { sparql };
	}


	// create a new instance of a certain (in-memory-)class in the graph
	createIndividualByClass(cls, ind, options) {
		options = options || {};
		ind = ind || {};

		// if an IRI is provided use that one, if not generate an UUID
		let iri = ind.iri || this.prefixManager.getDefaultNamespace() + cls.getName() + '_' + uuidv4();
		let genIri = iri;
		// todo: add options argument prefixIndividual
		iri = (options.prefixIndividual
			? this.prefixManager.fullToPrefixedIRI(iri)
			: this.prefixManager.getSparqlIRI(iri)
		);

		// todo: add options argument prefixClass
		let classIRI = (options.prefixClass
			? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
			: this.prefixManager.getSparqlIRI(cls.getIRI())
		);
		// let fields = `?iri rdf:type owl:NamedIndividual .`;
		let fields = `?iri rdf:type ${classIRI} .`;
		for (let prop of cls.getProperties()) {
			// get the name of the property
			let name = prop.getName();
			// find the value in the passed individual
			let val = ind[name];
			// if a value is set
			if (undefined != val) {
				// todo: replace this by global method to convert value
				let object;

				if (prop.getType() === "http://www.w3.org/2002/07/owl#DatatypeProperty") {
					object = '"' + val + '"';
					let range = prop.getRange();
					if (range) {
						// todo: we need a global replace ns by prefix and replace prefix by ns function
						range = range.replace('http://www.w3.org/2001/XMLSchema#', 'xsd:');
						object += '^^' + range;
					}
				} else {
					object = '<' + val + '>';
				}
				// todo: add options argument prefixProperties
				let propIRI = (options.prefixProperties
					? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
					: this.prefixManager.getSparqlIRI(prop.getIRI())
				);
				fields = `${fields}
	?iri ${propIRI} ${object} .`; // <${prop.getIRI()}>
			}
		}
		// accomplish the sparql insert command
		let sparql =
			`insert {
	${fields}
} where {
	bind( ${iri} as ?iri )
}`;
		return { sparql, iri: genIri };
	}


	// updates an individual by its class reference and a data object with the values
	updateIndividualByClass(cls, iri, ind) {
		let fields = '';
		let values = '';

		let prefixSubjects = true;
		let prefixPredicates = true;
		let prefixObjects = true;

		let iriStr = (prefixSubjects
			? this.prefixManager.fullToPrefixedIRI(iri)
			: this.prefixManager.getSparqlIRI(iri)
		);

		for (let prop of cls.getProperties()) {
			// get the name of the property
			let name = prop.getName();
			// find the value in the passed individual
			let val = ind[name];
			// if a value is set
			if (undefined != val) {
				// todo: replace this by global method to convert value
				let object;
				if (prop.getType() === "http://www.w3.org/2002/07/owl#DatatypeProperty") {
					object = '"' + val + '"';
					let range = prop.getRange();
					if (range) {
						// todo: we need a global replace ns by prefix and replace prefix by ns function
						range = range.replace('http://www.w3.org/2001/XMLSchema#', 'xsd:');
						object += '^^' + range;
					}
				} else {
					object = (prefixObjects
						? this.prefixManager.fullToPrefixedIRI(val)
						: this.prefixManager.getSparqlIRI(val)
					);
				}
				let predicateIRI = prop.getIRI();
				let predicateStr = (prefixPredicates
					? this.prefixManager.fullToPrefixedIRI(predicateIRI)
					: this.prefixManager.getSparqlIRI(predicateIRI)
				);
				fields =
					`${fields}\t${iriStr} ${predicateStr} ?${prop.getName()} .
`;
				values =
					`${values}\t${iriStr} ${predicateStr} ${object} .
`;
			}
		}
		let sparql =
			`delete {
${fields}} insert {
${values}} where {
${fields}}`;
		return { sparql };
	}

	/*
	SPARQL example
	delete {
		?subject ?predicate ?object
	} where {
		?subject ?predicate ?object .
		filter(?s = <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander>) .
	}
	*/
	// delete a certain resource by its IRI
	deleteResource(iri) {
		iri = this.prefixManager.getSparqlIRI(iri);
		let sparql =
			`delete {
	?subject ?predicate ?object
} where {
	?subject ?predicate ?object .
	filter(?subject = ${iri}) .
}`;
		return { sparql };
	}

    /*
    SPARQL example:
    insert data {
        <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander> <http://ont.comsats.edu/fyp#hasOrderline> <http://ont.comsats.edu/fyp#SABS_ORDERLINE_01>
    }
    */
	// add a relation between two individuals 
	createRelation(master, property, child) {
		// adjust subject, predicate and object
		master = this.prefixManager.getSparqlIRI(master);
		property = this.prefixManager.getSparqlIRI(property);
		child = this.prefixManager.getSparqlIRI(child);

		let sparql =
			`insert data {
    ${master} ${property} ${child}
}`;
		return { sparql };
	}


    /*
    SPARQL example:
    delete data {
        <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander> <http://ont.comsats.edu/fyp#hasOrderline> <http://ont.comsats.edu/fyp#SABS_ORDERLINE_02>
    }
    */
	// delete a relation between two individuals 
	deleteRelation(master, property, child) {
		// adjust subject, predicate and object
		master = this.prefixManager.getSparqlIRI(master);
		property = this.prefixManager.getSparqlIRI(property);
		child = this.prefixManager.getSparqlIRI(child);
		let sparql =
			`delete data {
    ${master} ${property} ${child}
}`;
		return { sparql };
	}

	/*
	SPARQL example:
	insert {
		?iri ?p ?o .
	} where {
		bind( iri(concat("http://ont.comsats.edu/fyp#Customer_", struuid())) as ?iri) .
		?s ?p ?o .
		filter(?s = fyp:SABS_CUSTOMER_01)
	}
	*/
	// clone an individual (simple flat clone)
	cloneIndividual(cls, origIRI, newIRI) {
		let iri = newIRI || this.prefixManager.getDefaultNamespace() + cls.getName() + '_' + uuidv4();
		let iriStr = this.prefixManager.getSparqlIRI(iri);
		origIRI = this.prefixManager.getSparqlIRI(origIRI);
		let sparql =
			`insert {
	?iri ?p ?o .
} where {
	bind(${iriStr} as ?iri) .
	?s ?p ?o .
	filter(?s = ${origIRI}) .
}`;
		return { sparql, iri };
	}

	/*
	SPARQL example:
	insert {
		fyp:SABS_PRODUCT_03 
			fyp:has_OrderlineProduct_Name ?has_Product_Name ;
			fyp:has_OrderlineProduct_Price ?has_Product_Price .
	} where { 
		fyp:SABS_PRODUCT_01
			fyp:has_Product_Name ?has_Product_Name ;
			fyp:has_Product_Price ?has_Product_Price .
	}
	*/
	mapIndividual(origCls, origIRI, newCls, newIRI, mapping) {
		origIRI = this.prefixManager.getSparqlIRI(origIRI);
		let genIRI = newIRI || this.prefixManager.getDefaultNamespace() + newCls.getName() + '_' + uuidv4();
		newIRI = this.prefixManager.getSparqlIRI(genIRI);
		let src = "";
		let dest = "";
		let idx = 0;
		for (let mapItem of mapping) {
			src = `${src}\n\t\t${mapItem.from} ?v${idx} ${idx < mapping.length - 1 ? ';' : '.'}`;
			dest = `${dest}\n\t\t${mapItem.to} ?v${idx} ${idx < mapping.length - 1 ? ';' : '.'}`;
			idx++;
		}
		let sparql =
			`insert {
	${newIRI}${dest}
} where {
	${origIRI}${src}
}`;
		return { sparql, newIRI };
	}

}

module.exports = {
	Generator
}