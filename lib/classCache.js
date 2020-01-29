// Innotrade Enapso SPARQL Tools - Module OWL Class Cache
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

// provides an in-memory cache for OWL classes

class ClassCache {

	// start with an empty cache
	constructor() {
		this.clear();
	}

	// clears the entire class cache
	clear() {
		this.classes = {};
	}

	// add a class to the cache
	addClass(cls) {
		this.classes[cls.getIRI()] = cls;
	}

	// return a cached class to the caller or undefined if the class is not cached
	getClassByIRI(iri) {
		return this.classes[iri];
	}

}

module.exports = {
	ClassCache
}