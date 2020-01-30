// Innotrade Enapso - SPARQL Toolbox
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

const { ClassCache } = require('./lib/classCache');
const { Class } = require('./lib/classes');
const { Generator } = require('./lib/generator');
const { Property } = require('./lib/properties');
const { Prefix, PrefixManager } = require('./lib/prefixManager');

module.exports = {
    ClassCache, Class,
    Generator, Property,
    Prefix, PrefixManager
}
