// Enapso SPARQL Tools
// Module OWL Class Implementation
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

const { Entity } = require('./entity');

// models a complete class with all its properties and description each
class Class extends Entity {
    constructor(namespace, name) {
        super(namespace, name);
        this.properties = [];
    }

    addProperty(property) {
        this.properties.push(property);
    }
    setProperties(properties) {
        this.properties = properties;
    }
    getProperties() {
        return this.properties;
    }
    getObjectProperties() {
        let properties = this.properties.filter(
            (item) =>
                item.type == 'http://www.w3.org/2002/07/owl#ObjectProperty'
        );
        return properties;
    }
}

module.exports = {
    Class
};
