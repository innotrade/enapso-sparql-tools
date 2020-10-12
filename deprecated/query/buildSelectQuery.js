// Innotrade Enapso SPARQL Toolbox - Select Query Builder
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const Joi = require('joi');

const inputSchema = {
    headers: Joi.string().min(2).required(),
    triples: Joi.string().min(8).required(),
    limit: Joi.number(),
    offset: Joi.number(),
    namedGraph: Joi.string().min(1)
};

function buildSelectQuery(
    headers,
    triples,
    limit = 1000,
    offset = 0,
    namedGraph
) {
    const valid = Joi.validate(
        { headers, triples, limit, offset, namedGraph },
        inputSchema
    );
    if (valid.error) {
        throw new Error(valid.error.details[0].message);
    }

    let delimiter = `
LIMIT ${limit} 
OFFSET ${offset}
	`;
    if (namedGraph !== null && namedGraph !== undefined && namedGraph !== '') {
        triples =
            `
GRAPH ${namedGraph} {
	` +
            triples +
            ` 
}
	   `;
    }
    let query =
        `
SELECT ${headers}
WHERE {
	` +
        triples +
        ` 
}
${delimiter}
  `;
    return query;
}

module.exports = exports = buildSelectQuery;
