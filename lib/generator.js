// Enapso SPARQL Tools - Module SPARQL generator
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir

const uuidv4 = require("uuid/v4");
// SPARQL query and update command generator
class Generator {
	constructor(args) {
		args = args || {};
		this.prefixManager = args.prefixManager;
		this.array = [];
	}

	setPrefixManager(prefixManager) {
		this.prefixManager = prefixManager;
	}

	// retrieve all classes from the graph database
	getAllClasses() {
		let sparql = `select ?class ?superClass
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
		let sparql = `select
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
	// prefixProps: true = usess prefixed property identifiers
	getIndividualsByClass(args) {
		args = args || {};
		if (!args.cls) {
			throw "No classs passed";
		}
		args.prefixPredicates =
			args.prefixPredicates === undefined ? true : args.prefixPredicates;
		args.prefixFilter =
			args.prefixFilter === undefined ? true : args.prefixFilter;
		args.prefixClass = args.prefixClass === undefined ? true : args.prefixClass;
		args.prefixPopulations =
			args.prefixPopulations === undefined ? true : args.prefixPopulations;
		let offset = args.offset === undefined ? 0 : args.offset;
		let limit = args.limit === undefined ? 0 : args.limit;
		let populations = args.populations;
		//check the population if it is empty then just call parent class
		if (!populations) {
			//calling the parent class
			var parentClass = this.getParentClassIndividuals(args);
			//creating sparql query
			var sparql = `select ${parentClass.fields}
	where {
		${parentClass.where}
		{
		    {
			${parentClass.parentClassPart}
		}
	   }
	}`;
		} else {
			//if values pass in population then we call both method parentclass and child classes
			var parentClass = this.getParentClassIndividuals(args);
			var childClass = this.getChildClassIndividuals(args);
			var sparql =
				//creating sparql query
				`select ?contentkey ${childClass.allChildClassesFields.join(" ")} ${
				parentClass.fields
				} 
	where {
		${parentClass.where}
		{
		    {
			${parentClass.parentClassPart}
		}
		${
				//get the all query part of child classes using map
				childClass.allChildClassesPart
					.map(
						(key) => `
		union {
		${key}
	      }`
					)
					.join("")
				}	
	   }
	}`;
		}
		if (offset) {
			sparql = `${sparql}\noffset ${offset}`;
		}
		if (limit) {
			sparql = `${sparql}\nlimit ${limit}`;
		}
		// return the generated SPARQL
		return { sparql };
	}
	getChildClassIndividuals(args) {
		//get population object array from args
		let populations = args.populations;
		var allChildClassesFields = [];
		var allChildClassesPart = [];
		// loop for getting all classes and their relation one by one
		for (let i = 0; i < populations.length; i++) {
			//get the classes name using index from population
			let cls = populations[i].cls;
			// get the relation using index from population which store in relation
			let relation = populations[i].relation;
			// first generate list of fields master/parent class to be queried
			//  generate list of fields of child class  to be queried
			var fields = " ?" + cls.getName() + "iri";
			for (let prop of cls.getProperties()) {
				fields += " ?" + cls.getName() + prop.getName();
			}

			// push the child classes fields in an array
			allChildClassesFields.push(fields);

			// get the fields of child classes for query
			var childClassesPart = `?ind ${this.prefixManager.fullToPrefixedIRI(
				relation
			)} ?${cls.getName()}iri.`;
			// now add  properties
			for (let prop of cls.getProperties()) {
				let propStr = args.prefixPredicates
					? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
					: this.prefixManager.getSparqlIRI(prop.getIRI());
				childClassesPart = `${childClassesPart}
	            ?${cls.getName()}iri  ${propStr} ?${cls.getName()}${prop.getName()} .`;
			}
			childClassesPart = `       ${childClassesPart}
	             bind ("${cls.getName()}" as ?contentkey).`;
			//push the query part of child classes in an array
			allChildClassesPart.push(childClassesPart);
		}
		return {
			allChildClassesFields,
			allChildClassesPart,
		};
	}
	getParentClassIndividuals(args) {
		args = args || {};
		let cls = args.cls;
		var values = [];
		let populations = args.populations;
		if (!args.populations) {
			// population is not passed then we set the array value as false
			var propArray = false;
		} else {
			//if population pass then we create and array where we store all relation of pouplation
			for (let j = 0; j < populations.length; j++) {
				values.push(populations[j].relation);
			}
		}

		// getting fields of parent/master class
		let fields = "?" + cls.getName() + "iri";
		for (let prop of cls.getProperties()) {
			var propArray = values.includes(prop.getName());
			//check if relation value is available in then didnt include it in properties
			if (propArray == false) {
				fields += " ?" + cls.getName() + prop.getName();
			} else {
			}
		}
		// check if iri filter needs to be applied for parent/master class
		let iris = args.iris;
		let filters = args.filter;
		let iriFilterStr = "";
		if (iris) {
			let filterArgs = [];
			for (let arg of iris) {
				let iri = args.prefixFilter
					? this.prefixManager.fullToPrefixedIRI(arg)
					: this.prefixManager.getSparqlIRI(arg);
				filterArgs.push(iri);
			}
			iriFilterStr = `
			filter(?ind in (${filterArgs.join(", ")})) .`;
		}

		let fieldFilterStr = "";
		if (filters) {
			for (let filter of filters) {
				let filterKey = filter.property || filter.key;
				let filterValue = filter.value;
				// the SPARQL filter is deprecated and will be dropped due to security reasons!
				if (filterKey === "$sparql") {
					fieldFilterStr = `filter(${filterValue})`;
				} else if (filterKey === "$json") {
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
		let clsStr = args.prefixPredicates
			? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
			: this.prefixManager.getSparqlIRI(cls.getIRI());
		//generte the query part of parent class
		var parentClassPart = `
			bind(str(?ind) as ?${cls.getName()}iri) .`;
		for (let prop of cls.getProperties()) {
			let propStr = args.prefixPredicates
				? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
				: this.prefixManager.getSparqlIRI(prop.getIRI());
			parentClassPart = `${parentClassPart}
			bind (?${prop.getName()} as ?${cls.getName()}${prop.getName()} ).`;
		}
		parentClassPart = `${parentClassPart}
			bind ("${cls.getName()}" as ?contentkey ).`;
		let where = `?ind rdf:type + ${clsStr} .\t${iriFilterStr}`;
		// now add all properties of child class for binding
		for (let prop of cls.getProperties()) {
			let propStr = args.prefixPredicates
				? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
				: this.prefixManager.getSparqlIRI(prop.getIRI());
			//skip the relation property here also
			var propArray = values.includes(prop.getName());
			if (propArray == false) {
				where = `    ${where}
			optional { ?ind ${propStr} ?${prop.getName()} }.`;
			} else {
			}
		}
		if (fieldFilterStr.length > 0) {
			where = `${where}
			${fieldFilterStr}`;
		}
		return { where, fields, parentClassPart };
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
		args.prefixPredicates =
			args.prefixPredicates === undefined ? true : args.prefixPredicates;
		args.prefixFilter =
			args.prefixFilter === undefined ? true : args.prefixFilter;
		args.prefixClass = args.prefixClass === undefined ? true : args.prefixClass;

		let childCls = args.childCls;
		// first generate list of fields to be queried
		let fields = "?master ?child";
		for (let prop of childCls.getProperties()) {
			fields += " ?" + prop.getName();
		}

		// check if iri filter needs to be applied
		let masterIris = [args.masterIri];
		let filter = "";
		if (masterIris) {
			let filterArgs = [];
			for (let arg of masterIris) {
				let masterIri = args.prefixFilter
					? this.prefixManager.fullToPrefixedIRI(arg)
					: this.prefixManager.getSparqlIRI(arg);
				filterArgs.push(masterIri);
			}
			filter = `filter(?master in (${filterArgs.join(", ")})) .`;
		}

		// now generate the where clause for the select statement
		// add the iri filter, if such is requested
		let propStr = args.prefixFilter
			? this.prefixManager.fullToPrefixedIRI(args.propertyIri)
			: this.prefixManager.getSparqlIRI(args.propertyIri);
		let where = `${filter}
	optional {
		?master ${propStr} ?child`;

		// now add all properties
		for (let prop of childCls.getProperties()) {
			let propStr = args.prefixPredicates
				? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
				: this.prefixManager.getSparqlIRI(prop.getIRI());
			where = `${where}
		optional { ?child ${propStr} ?${prop.getName()} } .`;
		}
		where = `${where}
	}`;

		// and compose the query
		let sparql = `select ${fields}
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
		let iri =
			ind.iri ||
			this.prefixManager.getDefaultNamespace() + cls.getName() + "_" + uuidv4();
		// todo: add options argument prefixIndividual
		iri = options.prefixIndividual
			? this.prefixManager.fullToPrefixedIRI(iri)
			: this.prefixManager.getSparqlIRI(iri);

		// todo: add options argument prefixClass
		let classIRI = options.prefixClass
			? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
			: this.prefixManager.getSparqlIRI(cls.getIRI());
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
				if (prop.getType() === "DatatypeProperty") {
					object = '"' + val + '"';
				} else {
					object = "<" + val + ">";
				}
				// todo: add options argument prefixProperties
				let propIRI = options.prefixProperties
					? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
					: this.prefixManager.getSparqlIRI(prop.getIRI());
				fields = `${fields}
	?iri ${propIRI} ${object} .`; // <${prop.getIRI()}>
			}
		}
		// accomplish the sparql insert command
		let sparql = `insert {
	${fields}
} where {
	bind( ${iri} as ?iri )
}`;
		return { sparql, iri };
	}

	// updates an individual by its class reference and a data object with the values
	updateIndividualByClass(cls, iri, ind) {
		let fields = "";
		let values = "";

		let prefixSubjects = true;
		let prefixPredicates = true;
		let prefixObjects = true;

		let iriStr = prefixSubjects
			? this.prefixManager.fullToPrefixedIRI(iri)
			: this.prefixManager.getSparqlIRI(iri);

		for (let prop of cls.getProperties()) {
			// get the name of the property
			let name = prop.getName();
			// find the value in the passed individual
			let val = ind[name];
			// if a value is set
			if (undefined != val) {
				// todo: replace this by global method to convert value
				let object;
				if (prop.getType() === "DatatypeProperty") {
					object = '"' + val + '"';
				} else {
					object = prefixObjects
						? this.prefixManager.fullToPrefixedIRI(val)
						: this.prefixManager.getSparqlIRI(val);
				}
				let predicateIRI = prop.getIRI();
				let predicateStr = prefixPredicates
					? this.prefixManager.fullToPrefixedIRI(predicateIRI)
					: this.prefixManager.getSparqlIRI(predicateIRI);
				fields = `${fields}\t${iriStr} ${predicateStr} ?${prop.getName()} .
`;
				values = `${values}\t${iriStr} ${predicateStr} ${object} .
`;
			}
		}
		let sparql = `delete {
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
	// 		iri = this.prefixManager.getSparqlIRI(iri);
	// 		let sparql = `delete {
	// 	?subject ?predicate ?object
	// } where {
	// 	?subject ?predicate ?object .
	// 	filter(?subject = ${iri}) .
	// }`;
	deleteResource(args) {
		let prefixPredicates = true;
		let childern = [];
		// get the join nested objects array from argument
		let joins = args.joins;
		// get the iri of indivudal which wanna delete
		let iri = args.iri;
		var where = `bind(${iri} as ?master).
    {
	bind(?master as ?s)
	?s ?p ?o        
    }`;
		// check join  is pass in arguments or not
		if (!joins) {
		} else {
			// run the loop to get the parent class childs
			for (let i = 0; i < joins.length; i++) {
				let cls = joins[i].cls;
				// check the relation is it child2MasterRelation
				if (joins[i].child2MasterRelation) {
					// get all the relations
					let relation = joins[i].child2MasterRelation;
					let propIRI = prefixPredicates
						? this.prefixManager.fullToPrefixedIRI(relation)
						: this.prefixManager.getSparqlIRI(relation);
					// create the query
					let childProp = `?${cls} ${propIRI}  ?master.
	bind(?${cls} as ?s)
	?s ?p ?o`;
					// push the each relation against query in array
					childern.push(childProp);
					// check the query is it master2childRelation accordingly create query
				} else if (!joins.master2childRelation) {
					let relation = joins[i].master2childRelation;
					// todo: add relation prefix properties
					let propIRI = prefixPredicates
						? this.prefixManager.fullToPrefixedIRI(relation)
						: this.prefixManager.getSparqlIRI(relation);
					var childProp = `?master  ${propIRI} ?${cls}.
	bind(?${cls} as ?s)
    ?s ?p ?o`;
					childern.push(childProp);
				}
			}
			// create the object of getSubChild to get the details of subchilds
			let subChildDetails = this.getSubChildDetails(joins);
			// check the children is it undefined or not
			if (!childern) {
			} else {
				// store the query of children in where using union after each statements
				where = `${where} 
  ${
					//get the all query part of child classes using map
					childern
						.map(
							(key) => `
  union 
   {
      ${key}
   }`
						)
						.join("")
					}`;
			}
			//check the subchild details
			if (!subChildDetails) {
			} else {
				// store the sub child query in where part of query
				where = `${where} 
    ${
					//get the all query part of child classes using map
					subChildDetails
						.map(
							(key) => `
  union 
   {
        ${key}
   }`
						)
						.join("")
					}`;
			}
		}
		let sparql = `delete {?s ?p ?o}
where 
{
	 ${where}
	 filter(!isBlank(?o))
}`;
		return { sparql };
	}
	// function to get subchild details
	getSubChildDetails(obj) {
		obj.forEach((element) => {
			if (element.joins) {
				let res = this.getSubChildJoin(element.joins, element.cls);
				this.childDetail = res.subChild;
				this.getSubChildDetails(element.joins);
			}
		});
		return this.childDetail;
	}
	getSubChildJoin(childDetails, parentClass) {
		let subChild = this.array;
		let prefixPredicates = true;
		// run the loop till get all classes details of subchild
		for (let i = 0; i < childDetails.length; i++) {
			let cls = childDetails[i].cls;
			// check the relation type
			if (childDetails[i].child2MasterRelation) {
				let relation = childDetails[i].child2MasterRelation;
				let propIRI = prefixPredicates
					? this.prefixManager.fullToPrefixedIRI(relation)
					: this.prefixManager.getSparqlIRI(relation);
				var child = `?${cls} ${propIRI}  ?${parentClass}.
	bind(?${cls} as ?s)
        ?s ?p ?o`;
				subChild.push(child);
			} else if (!childDetails.master2childRelation) {
				let relation = childDetails[i].master2childRelation;
				// todo: add relation prefix properties
				let propIRI = prefixPredicates
					? this.prefixManager.fullToPrefixedIRI(relation)
					: this.prefixManager.getSparqlIRI(relation);
				var child = `?${parentClass}  ${propIRI} ?${cls}.
	bind(?${cls} as ?s)
        ?s ?p ?o`;
				subChild.push(child);
			}
		}
		return { subChild };
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

		let sparql = `insert data {
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
		let sparql = `delete data {
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
		let iri =
			newIRI ||
			this.prefixManager.getDefaultNamespace() + cls.getName() + "_" + uuidv4();
		let iriStr = this.prefixManager.getSparqlIRI(iri);
		origIRI = this.prefixManager.getSparqlIRI(origIRI);
		let sparql = `insert {
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
		let genIRI =
			newIRI ||
			this.prefixManager.getDefaultNamespace() +
			newCls.getName() +
			"_" +
			uuidv4();
		newIRI = this.prefixManager.getSparqlIRI(genIRI);
		let src = "";
		let dest = "";
		let idx = 0;
		for (let mapItem of mapping) {
			src = `${src}\n\t\t${mapItem.from} ?v${idx} ${
				idx < mapping.length - 1 ? ";" : "."
				}`;
			dest = `${dest}\n\t\t${mapItem.to} ?v${idx} ${
				idx < mapping.length - 1 ? ";" : "."
				}`;
			idx++;
		}
		let sparql = `insert {
	${newIRI}${dest}
} where {
	${origIRI}${src}
}`;
		return { sparql, newIRI };
	}
	deleteGivenPropertyOfClass(args) {
		args = args || {};
		let cls = args.cls;
		let property = args.dataProperty;
		if (!cls) {
			throw "No classs passed";
		}
		else if (!property) {
			throw "No Property passed";
		}
		let sparql = `delete where
	{
	   ?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
           ?${cls} ${this.prefixManager.fullToPrefixedIRI(property)} ?${cls}${property}.
        }`;
		return { sparql };
	}

	deleteLabelOfEachClassIndividual(args) {
		args = args || {};
		let cls = args.cls;
		let labelLanguage = args.labelLanguage;
		if (!cls) {
			throw "No classs passed";
		}
		let where = `?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
	?${cls} rdfs:label ?label.`
		if (!labelLanguage) { }
		else {
			where = `${where}
	filter(lang(?label) = "" ||lang(?label)="${labelLanguage}")`;
		}
		let sparql = `delete
    {
	?${cls} rdfs:label ?label.
    }
where
    {
	${where}
    }`;
		return { sparql };
	}
	copyLabelToDataPropertyOfEachIndividual(args) {
		args = args || {};
		let cls = args.cls;
		let labelLanguage = args.labelLanguage;
		let property = args.dataProperty;
		if (!cls) {
			throw "No classs passed";
		}
		else if (!property) {
			throw "No Property passed";
		}
		let where = `?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
      ?${cls} rdfs:label ?label.`
		if (!labelLanguage) { }
		else {
			where = `  ${where}
      filter(lang(?label)="${labelLanguage}")`;
		}
		let sparql = `insert
  {
      ?${cls} ${this.prefixManager.fullToPrefixedIRI(property)} ?label.
  }
where
  {
    ${where}
  }`;
		return { sparql };
	}
	copyDataPropertyToLabelOfEachIndividual(args) {
		args = args || {};
		let cls = args.cls;
		let labelLanguage = args.labelLanguage;
		let property = args.dataProperty;
		if (!cls) {
			throw "No classs passed";
		}
		else if (!property) {
			throw "No Property passed";
		}
		let where = `   ?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
     ?${cls} ${this.prefixManager.fullToPrefixedIRI(property)} ?${property}.`
		if (!labelLanguage) { }
		else {
			where = `  ${where}
     bind(strlang(?${property},"${labelLanguage}") as ?label)`;
		}
		let sparql = `insert
  {
    ?${cls} rdfs:label ?label.
  }
where
  {
${where}
  }`;
		return { sparql };
	}


}

module.exports = {
	Generator,
};
