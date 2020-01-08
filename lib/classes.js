// Enapso SPARQL Tools
// Module OWL Class Implementation
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze


// models a complete class with all its properties and description each
class Class {

	constructor(namespace, name) {
		this.namespace = namespace;
		this.name = name;
		this.properties = [];
	}

	getName() {
		return this.name;
	}

	getNamespace() {
		return this.namespace;
	}

	getIRI() {
		let iri = this.namespace + this.name;
		return iri;
	}

	addProperty(property) {
		this.properties.push(property);
	}

	getProperties() {
		return this.properties;
	}

}

module.exports = {
	Class
}