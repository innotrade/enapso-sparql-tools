// Enapso SPARQL Tools
// Module OWL Entity Base Implementation
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

// models an OWL Entity as base class, used for classes, properties and individuals
class Entity {
  constructor(namespace, name) {
    this.namespace = namespace;
    this.name = name;
    this.parentNamespace = null;
    this.parentName = null;
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

  getParentName() {
    return this.parentName;
  }

  getParentNamespace() {
    return this.parentNamespace;
  }

  getParentIRI() {
    let iri = this.parentNamespace + this.parentName;
    return iri;
  }

  setParentIRI(iri) {
    let iriParts = iri.split('#', 2);
    this.parentNamespace = iriParts[0];
    this.parentName = iriParts[1];
  }
}

module.exports = {
  Entity
};
