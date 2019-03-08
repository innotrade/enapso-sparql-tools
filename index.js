// Innotrade Enapso SPARQL Toolbox
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const getClassSchemaMeta = require('./lib/schema/getClassSchemaMeta')
const getIndividualsMeta = require('./lib/instances/getIndividualsMeta')
const buildSelectQuery = require('./lib/query/buildSelectQuery')

module.exports = {
	getClassSchemaMeta: getClassSchemaMeta,
	getIndividualsMeta: getIndividualsMeta,
	buildSelectQuery: buildSelectQuery
}
