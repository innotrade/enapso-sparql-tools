// Enapso SPARQL Tools
// Module OWL Properties Implementation
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

// models a property
class Property {

	constructor(ns, name, type, range, domain) {
		this.ns = ns;
		this.name = name;
		this.type = type;
		this.range = range;
		this.domain = domain;
	}

	getNS() {
		return this.ns;
	}

	getName() {
		return this.name;
	}

	getType() {
		return this.type;
	}

	getRange() {
		return this.range;
	}

	getDomain() {
		return this.range;
	}

	getIRI() {
		let iri = this.ns + this.name;
		return iri;
	}

}

class DataProperty extends Property {

	constructor(ns, name) {
		super(ns, name);
	}

}

class ObjectProperty extends Property {

	constructor(ns, name) {
		super(ns, name);
	}

}

module.exports = {
	Property,
	DataProperty,
	ObjectProperty
}