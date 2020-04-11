// Enapso SPARQL Tools
// Module OWL Entity Base Implementation
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze


// models an OWL Entity as base class, used for classes, properties and individuals
class Entity {

    constructor(namespace, name) {
        this.namespace = namespace;
        this.name = name;
    }

    getName() {
        return this.name;
    }

    getNamespace() {
        return this.namespace;
    }

    // just an alias
    getNS() {
        return this.getNamespace();
    }

    getIRI() {
        let iri = this.namespace + this.name;
        return iri;
    }

}

module.exports = {
    Entity
}