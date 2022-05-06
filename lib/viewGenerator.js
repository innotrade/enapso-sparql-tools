// Enapso SPARQL Tools - Module SPARQL Views
// (C) Copyright 2021-2022 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir

// SPARQL query and update command view generator
class ViewGenerator {
    constructor(args) {
        args = args || {};
        this.prefixManager = args.prefixManager;
    }
    getEntityCustomView(args) {
        let entity = args.entity;
        let properties = args.properties;
        let propSparql = '';
        let fields = '';
        let fieldFilterStr = '';
        let filters = args.filter;
        if (filters) {
            for (let filter of filters) {
                let filterKey = filter.property || filter.key;
                let filterValue = filter.value;
                // the SPARQL filter is deprecated and will be dropped due to security reasons!
                if (filterKey === '$sparql') {
                    fieldFilterStr = `filter(${filterValue})\n\t`;
                } else if (filterKey === '$json') {
                    if (filterValue) {
                        // here we need to extend the fiters according to the mongodb spec at:
                        // https://docs.mongodb.com/manual/reference/operator/query/
                        for (let fieldName in filterValue) {
                            let filterArgs = filterValue[fieldName];
                            if (filterArgs.$regex) {
                                fieldFilterStr = `
filter(regEx(?${fieldName}, "${filterArgs.$regex}", "${filterArgs.$options}"))`;
                            }
                        }
                    }
                }
            }
        }
        properties.forEach((element) => {
            let prop = this.removeIRI(element, '#');
            if (!prop) {
                prop = this.removeIRI(element, '/');
            }
            fields = `${fields} ?${prop}`;
            propSparql = `${propSparql}optional {?entity <${element}> ?${prop}}\n\t`;
        });
        let sparql = `select ?entity${fields}
where {
        ?entity rdf:type <${entity}>.
        ${propSparql}${fieldFilterStr}}`;
        return { sparql };
    }
    removeIRI(prop, key) {
        let value;
        if (key == '#') {
            value = prop.split('#');
            return value[1];
        } else if (key == '/') {
            const lastIndex = prop.lastIndexOf('/');
            value = prop.slice(lastIndex + 1);
            return value;
        }
    }
}

module.exports = {
    ViewGenerator
};
