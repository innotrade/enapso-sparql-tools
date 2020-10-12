// Innotrade Enapso SPARQL Toolbox
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const Joi = require('joi');
const regexValidators = require('../utils/regex-validators');

const inputSchema = {
    classObject: Joi.array().required(),
    records: Joi.array().min(1).required(),
    baseIRI: Joi.string().regex(regexValidators.URL).required(),
    idProperty: Joi.string(),
    similarity: Joi.number().min(0).max(1),
    separatorIRI: Joi.string().length(1)
};

/**
 *
 * @param {array} classObject - target class as enapso EnapsoObject Array for automatic property creation
 * @param {array} records - array of json objects to find correspondences with the given cassObject
 * @param {string} baseIRI - Base IRI for the new instace, if not given the IRI of the classObject is take it.
 * @param {string} idProperty - This value will suffix the baseIRI to create the complete IRI of the new instance
 * @param {string} baseIRI - Base IRI for the new instace, if not given the IRI of the classObject is take it.
 */
function read(
    classObject,
    records,
    baseIRI,
    idProperty,
    similarity = 1,
    separatorIRI = '#'
) {
    const valid = Joi.validate(
        { classObject, records, baseIRI, idProperty, similarity, separatorIRI },
        inputSchema
    );
    if (valid.error) {
        throw new Error(valid.error.details[0].message);
    }

    let triples = {};
    let ignoredFields = {};
    let recordKeys = Object.keys(records);
    let IRI = '';

    let recordBaseIRI = baseIRI || inputs.sparqlJsonSchema[0].node;
    if ('IRI' in inputs.record) {
        IRI = inputs.record.IRI;
    } else if (inputs.IRIProperty in inputs.record) {
        IRI = recordBaseIRI + '_' + inputs.record[inputs.IRIProperty];
    } else {
        IRI = recordBaseIRI + '_' + uidgen.generateSync();
    }

    if (!triples[IRI]) triples[IRI] = [];

    for (key of recordKeys) {
        let correspondence = findModelAlignament(
            key,
            inputs.record[key],
            inputs.sparqlJsonSchema,
            inputs.similarityRestriction,
            inputs.characterIRISeparator
        );

        if (correspondence.match < inputs.similarityRestriction) {
            if (!ignoredFields[IRI]) {
                ignoredFields[IRI] = [];
            }

            let ignored = {};
            ignored[key] = inputs.record[key];
            ignored.bestMatch = correspondence;

            ignoredFields[IRI].push(ignored);
            continue;
        }

        let triple = {
            node: IRI,
            edge: correspondence.item.edge,
            filler: `${inputs.record[key]}^^<${correspondence.item.filler}>`,
            match: correspondence
        };

        triples[IRI].push(triple);
    }

    // All done.
    return exits.success({ data: triples, ignored: ignoredFields });
}
module.exports = exports = read;
