// Innotrade Enapso SPARQL Toolbox
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

/*
const getClassSchemaMeta = require('./lib/schema/getClassSchemaMeta')
const getIndividualsMeta = require('./lib/instances/getIndividualsMeta')
const buildSelectQuery = require('./lib/query/buildSelectQuery')
*/

const ClassCache = require('./lib/classCache');
const Class = require('./lib/classes');
const Generator = require('./lib/generator');
const { Prefix, PrefixManager } = require('./lib/prefixManager');

module.exports = {
    ClassCache,
    Class,
    Generator,
    Prefix, PrefixManager

    /*
    getClassSchemaMeta: getClassSchemaMeta,
	getIndividualsMeta: getIndividualsMeta,
    buildSelectQuery: buildSelectQuery
    */
}
