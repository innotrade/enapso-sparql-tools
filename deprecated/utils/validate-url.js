// Innotrade Enapso SPARQL Toolbox - URL Validators
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Osvaldo Aguilar Lauzurique

const regexValidators = require('./regex-validators');

module.exports = (url) => {
    if (!url) {
        return false;
    }
    return regexValidators.URL.test(url);
};
