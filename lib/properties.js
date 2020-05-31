// Enapso SPARQL Tools
// Module OWL Properties Implementation
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

const { Entity } = require('./entity');

// models a property
class Property extends Entity {
  constructor(namespace, name, type, range, domain) {
    super(namespace, name);
    this.type = type;
    this.range = range;
    this.domain = domain;
  }

  getType() {
    return this.type;
  }

  getRange() {
    return this.range;
  }

  getDomain() {
    return this.domain;
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
};
