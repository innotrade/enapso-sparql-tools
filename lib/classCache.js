// Innotrade Enapso SPARQL Tools - Module OWL Class Cache
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

// provides an in-memory cache for OWL classes

const { Class } = require('./classes');

const { Property } = require('./properties');

class ClassCache {
    // start with an empty cache
    constructor(classes, individual) {
        classes ? (this.classes = classes) : (this.classes = {});
        individual ? (this.Individual = individual) : (this.Individual = []);
    }

    // clears the entire class cache
    clear() {
        this.classes = {};
        this.Individual = [];
    }

    // add a class to the cache
    addClass(cls) {
        this.classes[cls.getIRI()] = cls;
    }
    addIndividual(Individual) {
        this.Individual = Individual;
    }
    getIndividual(iri) {
        let individual = this.Individual.filter(
            (item) => item.individual == iri
        );
        if (individual.length) {
            return individual[0].class;
        } else {
            return null;
        }
    }
    // return a cached class to the caller or undefined if the class is not cached
    getClassByIRI(iri) {
        return this.classes[iri];
    }

    deserializeClassCache(cc) {
        let rawClassCache = JSON.parse(cc);
        let classCache = new ClassCache(
            rawClassCache.classes,
            rawClassCache.Individual
        );
        for (const prop in classCache.classes) {
            for (
                let i = 0;
                i < classCache.classes[prop].properties.length;
                i++
            ) {
                classCache.classes[prop].properties[i] = new Property(
                    classCache.classes[prop].properties[i].namespace,
                    classCache.classes[prop].properties[i].name,
                    classCache.classes[prop].properties[i].type,
                    classCache.classes[prop].properties[i].range,
                    classCache.classes[prop].properties[i].domain,
                    classCache.classes[prop].properties[i].prop
                );
            }

            let cls = new Class(
                classCache.classes[prop].namespace,
                classCache.classes[prop].name
            );
            cls.setProperties(classCache.classes[prop].properties);
            classCache.classes[prop] = cls;

            // console.log(classCache.classes[prop]);
        }

        return classCache;
    }
}

module.exports = {
    ClassCache
};
