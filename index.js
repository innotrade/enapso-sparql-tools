// Innotrade Enapso - SPARQL Toolbox
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze
require('@innotrade/enapso-config');

const { ClassCache } = require('./lib/classCache'),
    { Entity } = require('./lib/entity'),
    { Class } = require('./lib/classes'),
    { Generator } = require('./lib/generator'),
    { Property } = require('./lib/properties'),
    { Prefix, PrefixManager } = require('./lib/prefixManager'),
    { ViewGenerator } = require('./lib/viewGenerator'),
    { SparqlBeautifier } = require('./lib/sparqlBeautifier');

const ensptools = {
    ClassCache,
    Entity,
    Class,
    Generator,
    Property,
    Prefix,
    PrefixManager,
    SparqlBeautifier
};

module.exports = {
    ensptools,
    ClassCache,
    Entity,
    Class,
    Generator,
    Property,
    Prefix,
    PrefixManager,
    SparqlBeautifier
};
