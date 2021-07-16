// Enapso SPARQL Tools
// SPARQL Beautifier
// (C) Copyright 2019-2021 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir
const SparqlParser = require('sparqljs').Parser;
// SparqlParser and SparqlGenerator options
// allPrefixes:true to show all prefixes which pass in query if its fail then it show only those prefixes which are part of query not all and remove the unnecessary prefixes
// prefixes:{} in which you can pass the object of prefixes which you want to attach with sparql query.
// baseiri to specify the base graph iri
const SparqlGenerator = require('sparqljs').Generator;
class SparqlBeautifier {
    constructor(data) {
        this.prefixes = data.prefixes;
        this.allPrefixes = data.allPrefixes;
    }
    getPrefixes() {
        return this.prefixes;
    }
    beautify(data) {
        let query = data.query;
        let options = { sparqlStar: true };
        if (this.allPrefixes || data.allPrefixes) {
            Object.assign(options, { allPrefixes: true });
        }
        if (data.prefixes) {
            Object.assign(options, { prefixes: data.prefixes });
        }
        if (data.baseIRI) {
            Object.assign(options, { baseIRI: data.baseIRI });
        }
        let parser = new SparqlParser(options);
        let generator = new SparqlGenerator(options);
        let prefixes = this.getPrefixes();
        query = `${prefixes}
        ${query}`;
        let parsedQuery = parser.parse(query);
        let generatedQuery = generator.stringify(parsedQuery);
        return generatedQuery;
    }
}

module.exports = {
    SparqlBeautifier
};
