// Innotrade Enapso SPARQL Toolbox
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const Joi = require('joi');

const inputSchema = {
    sparqlResult: Joi.object().required()
    // sparqlResult: Joi.object().requiredKeys('head', 'result')
};

/**
 *
 * @param {object} sparqlResult - standard json result of an sparql query
 */
function sparql2json(sparqlResult) {
    const valid = Joi.validate({ sparqlResult }, inputSchema);
    if (valid.error) {
        throw new Error(valid.error.details[0].message);
    }

    let headers = sparqlResult.head.vars;
    let bindings = sparqlResult.results.bindings;

    let bindingsMapped = bindings.map((item) => {
        let temp = {};
        for (let header of headers) {
            if (typeof item[header] === 'undefined') {
                item[header] = { value: null };
            }
            temp[header] = item[header].value;
        }
        return temp;
    });

    return bindingsMapped;
}

module.exports = exports = sparql2json;
