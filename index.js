// Innotrade Enapso - SPARQL Toolbox
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze

const { ClassCache } = require('./lib/classCache'),
  { Entity } = require('./lib/entity'),
  { Class } = require('./lib/classes'),
  { Generator } = require('./lib/generator'),
  { Property } = require('./lib/properties'),
  { Prefix, PrefixManager } = require('./lib/prefixManager');

const ensptools = {
  ClassCache,
  Entity,
  Class,
  Generator,
  Property,
  Prefix,
  PrefixManager
};

module.exports = {
  ensptools,
  ClassCache,
  Entity,
  Class,
  Generator,
  Property,
  Prefix,
  PrefixManager
};
