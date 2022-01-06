// Enapso SPARQL Tools
// Module RDF Prefix Manager
// (C) Copyright 2019 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze, Muhammad Yasir
// Implements a single prefix definition for SPARQL
class Prefix {
    constructor(prefix, namespace) {
        this.prefix = prefix;
        this.namespace = namespace;
    }

    // return the prefix
    getPrefix() {
        return this.prefix;
    }

    // return the namespace associated with the prefix
    getNamespace() {
        return this.namespace;
    }
}

// Manages the Prefixes for SPARQL Queries and Updates
class PrefixManager {
    constructor(prefixes) {
        this.defaultPrefix = 'endefault';
        this.defaultNamespace = 'http://ont.enapso.com/default#';
        this.prefixes = [];
        for (let item of prefixes) {
            let prefix = new Prefix(item.prefix, item.iri);
            this.prefixes.push(prefix);
        }
    }

    getPrefixes() {
        return this.prefixes;
    }

    getPrefixesForConnector() {
        let prefixes = [];
        for (let item of this.prefixes) {
            prefixes.push({
                prefix: item.getPrefix(),
                iri: item.getNamespace()
            });
        }
        return prefixes;
    }
    getPrefixesInSPARQLFormat() {
        let prefixes = '';
        for (let item of this.prefixes) {
            prefixes = `${prefixes} 
            PREFIX ${item.getPrefix()}: <${item.getNamespace()}>`;
        }
        return prefixes;
    }

    // returns the prefix of a certain namespace, or null if the namespace cannot be found
    getPrefixByNamespace(namespace) {
        for (let item of this.prefixes) {
            if (item.getNamespace() === namespace) {
                return item.getPrefix();
            }
        }
        return null;
    }

    // returns the namespace of a certain prefix, or null if the prefix cannot be found
    getNamespaceByPrefix(prefix) {
        for (let item of this.prefixes) {
            if (item.getPrefix() === prefix) {
                return item.getNamespace();
            }
        }
        return null;
    }

    // sets the default prefix and the default namespace automatically with it
    setDefaultPrefix(prefix) {
        this.defaultPrefix = prefix;
        this.defaultNamespace = this.getNamespaceByPrefix(prefix);
    }

    // sets the default namespace and the default prefix automatically with it
    setDefaultNamespace(namespace) {
        this.defaultNamespace = namespace;
        this.defaultPrefix = this.getPrefixByNamespace(namespace);
    }

    // returns the default prefix
    getDefaultPrefix() {
        return this.defaultPrefix;
    }

    // returns the default namespace
    getDefaultNamespace() {
        return this.defaultNamespace;
    }

    // returns true if the input value is already a full IRI for SPARQL, otherwise false
    isSparqlIRI(input) {
        // todo: maybe better check with a regExp
        return input.startsWith('<') && input.endsWith('>');
    }

    // returns true if the input value is already a full IRI for SPARQL, otherwise false
    isURI(input) {
        // todo: maybe better check with a regExp
        return input.startsWith('http://') || input.startsWith('https://');
    }

    // returns true if the input value is already a prefixed IRI for SPARQL, otherwise false
    isPrefixedIRI(input) {
        // todo: maybe better check with a regExp
        return !this.isURI(input) && input.indexOf(':') >= 0;
    }

    // splits a given prefixed IRI into prefix and namespace
    splitPrefixedName(input) {
        let parts = input.split(':', 2);
        return {
            prefix: parts[0],
            identifier: parts[1]
        };
    }

    // converts a prefixed resource identifier to a full IRI
    // the IRI does not need to be part of the PrefixManager
    prefixedNameToIRI(input) {
        if (this.isPrefixedIRI(input)) {
        } else {
            throw 'IRI is not prefixed';
        }
    }

    // converts a full IRI into a prefixed resource identifier
    fullToPrefixedIRI(input) {
        try {
            let namespace = this.getIRI(input);
            let prefixFound = false;
            for (let item of this.prefixes) {
                let ns = item.getNamespace();
                if (namespace.startsWith(ns)) {
                    prefixFound = true;
                    return item.getPrefix() + ':' + namespace.substr(ns.length);
                }
            }
            // if (!prefixFound) {
            //     // console.log('Hello');
            //     let prefix = this.randomPrefixToIRI();
            //     let iri = namespace.split('#');
            //     let ontoIRI = `${iri[0]}#`;
            //     this.prefixes.push(new Prefix(prefix, ontoIRI));
            //     let className = iri[1];
            //     return prefix + ':' + className;
            //     //   this.fullToPrefixedIRI(input);
            //     //console.log(pre);
            // }
            // else return unchanged
            return `<${input}>`;
        } catch (e) {
            return e;
        }
    }
    // randomPrefixToIRI() {
    //     return randomstring.generate({
    //         length: 7,
    //         charset: 'alphabetic'
    //     });
    // }

    // returns the plain (i.e. non-prefixed, non-sparql'd) IRI of an input
    getIRI(input) {
        input = input.trim();
        if (this.isSparqlIRI(input)) {
            // cut off trailing < and ending >
            return input.substr(1, input.length - 2);
        } else if (this.isURI(input)) {
            return input;
        } else if (this.isPrefixedIRI(input)) {
            let parts = this.splitPrefixedName(input);
            let namespace = this.getNamespaceByPrefix(parts.prefix);
            return namespace + parts.identifier;
        }
        return this.defaultNamespace + input;
    }

    // returns the IRI in SPARQL syntax,
    // i.e. with starting < and trailing >
    getSparqlIRI(input) {
        // if the input is already a SPARQL formatted IRI,
        // return it "as is"
        if (this.isSparqlIRI(input)) {
            return input;
        }
        // otherwise generate or get the IRI and
        // make it a SPARQL formatted IRI
        return '<' + input + '>';
    }
}

module.exports = {
    Prefix,
    PrefixManager
};
