// Enapso SPARQL Tools - Module SPARQL generator
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir
const { throws } = require('assert');
const { count } = require('console');
const { Certificate, KeyObject } = require('crypto');
const { some, property } = require('lodash');
const { join } = require('path');
const uuidv4 = require('uuid/v4');

// SPARQL query and update command generator
class Generator {
    constructor(args) {
        args = args || {};
        this.prefixManager = args.prefixManager;
    }

    setPrefixManager(prefixManager) {
        this.prefixManager = prefixManager;
    }

    // retrieve all classes from the graph database
    getAllClasses() {
        let sparql = `select ?class ?superClass
where {
?class a owl:Class .
filter( !isBlank(?class) )
optional {
?class rdfs:subClassOf ?superClass .
?superClass a ?sctype .
filter(?sctype = owl:Class && !isBlank(?superClass))
}
}
order by ?class
`;
        return { sparql };
    }

    // retrieve all properties from a given class
    getClassProperties(cls) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        let sparql = `select
?prop ?type ?range ?domain
?only ?some ?min ?max ?exactly ?value
where {
bind( ${iri} as ?class ) .
?class rdfs:subClassOf ?restr .
?restr owl:onProperty ?prop .
?prop a ?type .
filter( ?type = owl:DatatypeProperty
|| ?type = owl:ObjectProperty ) .

?restr ( owl:onClass | owl:onDataRange
| owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ?range .
bind( ?class as ?domain ) .

optional { ?restr owl:allValuesFrom ?only } .
optional { ?restr owl:someValuesFrom ?some } .
optional { ?restr owl:minQualifiedCardinality ?min } .
optional { ?restr owl:qualifiedCardinality ?exactly } .
    optional { ?restr owl:maxQualifiedCardinality ?max } .
    optional { ?restr owl:hasValue ?value } .
}`;
        /*
let sparql =
`select ?property ?type ?range ?domain ?some ?min ?max ?exactly
where {
bind( ${iri} as ?class )
{
?property rdfs:domain ?class ; rdf:type ?type .
filter( ?type = owl:DatatypeProperty || ?type = owl:ObjectProperty ) .
optional { ?property rdfs:range ?rangeRaw } .
optional { ?property rdfs:domain ?domain } .

bind(?rangeRaw as ?rangeVar)
optional { ?rangeVar owl:allValuesFrom ?rangeRestriction } .

bind( if( isBlank(?rangeVar), ?rangeRestriction, ?rangeRaw ) as ?range )
 
} union {
   
?class rdfs:subClassOf ?restriction .
filter (isBlank(?restriction)) .
bind( owl:ObjectProperty as ?type )
bind( ?class as ?domain )
?restriction owl:onProperty ?property .
?restriction ( owl:onClass|owl:onDataRange|owl:someValuesFrom|owl:allValuesFrom ) ?range .

optional { ?restriction owl:someValuesFrom ?some } .
optional { ?restriction owl:minQualifiedCardinality ?min } .
optional { ?restriction owl:qualifiedCardinality ?exactly } .
optional { ?restriction owl:maxQualifiedCardinality ?max } .
}
}`;
*/
        return { sparql };
    }

    // retrieve all properties from a single given class
    getSingleClassProperties(cls) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        let sparql = `select
        ?prop ?type ?range ?domain
        ?only ?some ?min ?max ?exactly ?value
    where {
        bind( ${iri} as ?class ) .
        ?class sesame:directSubClassOf ?restr .
        ?restr owl:onProperty ?prop .
        ?prop a ?type .
        filter( ?type = owl:DatatypeProperty
            || ?type = owl:ObjectProperty ) .
   
        ?restr ( owl:onClass | owl:onDataRange
            | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ?range .
        bind( ?class as ?domain ) .
   
        optional { ?restr owl:allValuesFrom ?only } .
        optional { ?restr owl:someValuesFrom ?some } .
        optional { ?restr owl:minQualifiedCardinality ?min } .
        optional { ?restr owl:qualifiedCardinality ?exactly } .
        optional { ?restr owl:maxQualifiedCardinality ?max } .
        optional { ?restr owl:hasValue ?value } .
    }`;

        return { sparql };
    }

    getClassAllRestrictions(cls) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        let sparql = `select
        ?propertyType ?property ?restrict ?cardinality ?type
    where {
        bind( ${iri} as ?class ).
        ?class sesame:directSubClassOf ?restr .
        ?restr owl:onProperty ?property .
        ?property a ?propertyType .
        filter( ?propertyType = owl:DatatypeProperty
            || ?propertyType = owl:ObjectProperty ) .
   
        ?restr ( owl:onClass | owl:onDataRange
            | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ?type .
        bind( ?class as ?domain ) .
   
        optional { ?restr owl:allValuesFrom ?res.
         bind("only" as ?restrict) } .
        optional { ?restr owl:someValuesFrom ?res.
       bind("some" as ?restrict)} .
        optional { ?restr owl:minQualifiedCardinality ?cardinality
    bind("min" as ?restrict)} .
        optional { ?restr owl:qualifiedCardinality ?cardinality
    bind("exactly" as ?restrict)} .
        optional { ?restr owl:maxQualifiedCardinality ?cardinality
    bind("max" as ?restrict)} .
        optional { ?restr owl:hasValue ?res
    bind("value" as ?restrict)} .
    }`;

        return { sparql };
    }
    /*
 SPARQL example:
 select ?iri ?has_Customer_ID ?has_Customer_Name ?has_Customer_Password ?has_Customer_Phone_No ?has_Customer_Email ?hasOrderline
 where {
 ?ind a <http://ont.comsats.edu/fyp#Customer> .
 bind(str(?ind) as ?iri) .
 filter(?iri in ("http://ont.comsats.edu/fyp#Customer_SchulzeAlexander")) .
 optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_ID> ?has_Customer_ID } .
 optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Name> ?has_Customer_Name } .
 optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Password> ?has_Customer_Password } .
 optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Phone_No> ?has_Customer_Phone_No } .
 optional { ?ind <http://ont.comsats.edu/fyp#has_Customer_Email> ?has_Customer_Email } .
 optional { ?ind <http://ont.comsats.edu/fyp#hasOrderline> ?hasOrderline } .
 }
 */

    // get all instances of a certain class from the graph
    // cls: the in-memory class
    // prefixProps: true = usess prefixed property identifiers
    getIndividualsByClass(args) {
        args = args || {};
        if (!args.cls) {
            throw 'No classs passed';
        }
        args.prefixPredicates =
            args.prefixPredicates === undefined ? true : args.prefixPredicates;
        args.prefixFilter =
            args.prefixFilter === undefined ? true : args.prefixFilter;
        args.prefixClass =
            args.prefixClass === undefined ? true : args.prefixClass;
        args.prefixPopulations =
            args.prefixPopulations === undefined
                ? true
                : args.prefixPopulations;
        let offset = args.offset === undefined ? 0 : args.offset;
        let limit = args.limit === undefined ? 0 : args.limit;
        let joins = args.joins;
        let cls = args.cls;
        let checkRelation = [];
        let propArray = false;
        if (joins) {
            if (joins.length) {
                for (let j = 0; j < joins.length; j++) {
                    if (!joins[j].parent2ChildRelation) {
                        let relation = joins[j].child2ParentRelation;
                        if (!checkRelation.includes(relation)) {
                            checkRelation.push(relation);
                        }
                    } else if (!joins[j].child2ParentRelation) {
                        let relation = joins[j].parent2ChildRelation;
                        if (!checkRelation.includes(relation)) {
                            checkRelation.push(relation);
                        }
                    }
                }
            }
        }
        // getting fields of parent/master class
        let fields = '?' + 'iri';
        for (let prop of cls.getProperties()) {
            //  console.log(prop.getName());
            propArray = checkRelation.includes(prop.getName());
            if (propArray == false) {
                if (!fields.includes(prop.getName())) {
                    fields += ' ?' + prop.getName();
                }
            }
        }
        // check if iri filter needs to be applied for parent/master class
        let iris = args.iris;
        let filters = args.filter;
        let iriFilterStr = '';
        if (iris) {
            let filterArgs = [];
            for (let arg of iris) {
                let iri = args.prefixFilter
                    ? this.prefixManager.fullToPrefixedIRI(arg)
                    : this.prefixManager.getSparqlIRI(arg);
                filterArgs.push(iri);
            }
            iriFilterStr = `
filter(?ind in (${filterArgs.join(', ')})) .`;
        }

        let fieldFilterStr = '';
        if (filters) {
            for (let filter of filters) {
                let filterKey = filter.property || filter.key;
                let filterValue = filter.value;
                // the SPARQL filter is deprecated and will be dropped due to security reasons!
                if (filterKey === '$sparql') {
                    fieldFilterStr = `filter(${filterValue})`;
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
        let clsStr = args.prefixPredicates
            ? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
            : this.prefixManager.getSparqlIRI(cls.getIRI());
        //generte the query part of parent class
        var parentClassPart = `
    bind(str(?ind) as ?iri) .`;
        for (let prop of cls.getProperties()) {
            //  console.log(prop);
            let propStr = this.prefixManager.fullToPrefixedIRI(prop.getIRI());
            propArray = checkRelation.includes(prop.getIRI());
            if (propArray == false) {
                if (!parentClassPart.includes(propStr)) {
                    parentClassPart = `${parentClassPart}
    optional {?ind ${propStr} ?${prop.getName()} }.`;
                }
            }
        }
        parentClassPart = `${parentClassPart}
    bind ("${cls.getName()}" as ?contentKey ).
   }`;
        let where = `?ind rdf:type + ${clsStr} .${iriFilterStr}`;
        if (fieldFilterStr.length > 0) {
            where = `${where}
${fieldFilterStr}`;
        }
        if (joins) {
            if (joins.length) {
                var relationData = this.getAllRelation(joins, cls);
                for (let i = 0; i < relationData.result.length; i++) {
                    parentClassPart = `${parentClassPart}
 
        ${relationData.result[i].parent}
    `;
                    if (relationData.result[i].child) {
                        //  let length = relationData.result[i].bracket;
                        //  length++;
                        relationData.result[i].child.forEach(
                            (element) =>
                                (parentClassPart = `${parentClassPart} ${element}`)
                        );
                        // if (relationData.result[i].bracket) {
                        //     // let bracket = '}';
                        //     for (let i = 0; i < length; i++) {
                        //         parentClassPart = `${parentClassPart} }`;
                        //     }
                        // }
                    }
                    // else {
                    //  parentClassPart = `${parentClassPart} }`;
                    // }
                }
                fields = ` ?contentKey ?contentRelation ?parentIRI ${fields} ${relationData.fields}`;
                fields = fields.replace(undefined, ' ');
                this.count = 0;
                this.findAndCount(joins);
            }
        }
        var sparql = `select distinct ${fields}
where
  {
${where}
  {
${parentClassPart}    
  }`;
        if (offset) {
            sparql = `${sparql}\noffset ${offset}`;
        }
        if (limit) {
            sparql = `${sparql}\nlimit ${limit}`;
        }
        // return the generated SPARQL
        return { sparql };
    }

    getIndividualsByClassOnlyObjectProperties(args) {
        args = args || {};
        if (!args.cls) {
            throw 'No classs passed';
        }
        args.prefixPredicates =
            args.prefixPredicates === undefined ? true : args.prefixPredicates;
        args.prefixFilter =
            args.prefixFilter === undefined ? true : args.prefixFilter;
        args.prefixClass =
            args.prefixClass === undefined ? true : args.prefixClass;
        args.prefixPopulations =
            args.prefixPopulations === undefined
                ? true
                : args.prefixPopulations;
        let offset = args.offset === undefined ? 0 : args.offset;
        let limit = args.limit === undefined ? 0 : args.limit;
        let joins = args.joins;
        let cls = args.cls;
        let checkRelation = [];
        let propArray = false;
        // getting fields of parent/master class
        let fields = '?' + 'iri';
        for (let prop of cls.getProperties()) {
            propArray = checkRelation.includes(prop.getName());
            if (
                propArray == false &&
                prop.getType() == 'http://www.w3.org/2002/07/owl#ObjectProperty'
            ) {
                if (!fields.includes(prop.getName())) {
                    fields += ' ?' + prop.getName();
                }
            }
        }
        // check if iri filter needs to be applied for parent/master class
        let iris = args.iris;
        let filters = args.filter;
        let iriFilterStr = '';
        if (iris) {
            let filterArgs = [];
            for (let arg of iris) {
                let iri = args.prefixFilter
                    ? this.prefixManager.fullToPrefixedIRI(arg)
                    : this.prefixManager.getSparqlIRI(arg);
                filterArgs.push(iri);
            }
            iriFilterStr = `
filter(?ind in (${filterArgs.join(', ')})) .`;
        }

        let fieldFilterStr = '';
        if (filters) {
            for (let filter of filters) {
                let filterKey = filter.property || filter.key;
                let filterValue = filter.value;
                // the SPARQL filter is deprecated and will be dropped due to security reasons!
                if (filterKey === '$sparql') {
                    fieldFilterStr = `
                    filter(${filterValue})`;
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
        let clsStr = args.prefixPredicates
            ? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
            : this.prefixManager.getSparqlIRI(cls.getIRI());
        //generte the query part of parent class
        var parentClassPart = `
    bind(str(?ind) as ?iri) .`;
        for (let prop of cls.getProperties()) {
            //  console.log(prop);
            let propStr = this.prefixManager.fullToPrefixedIRI(prop.getIRI());
            propArray = checkRelation.includes(prop.getIRI());
            if (
                propArray == false &&
                prop.getType() == 'http://www.w3.org/2002/07/owl#ObjectProperty'
            ) {
                if (!parentClassPart.includes(propStr)) {
                    parentClassPart = `${parentClassPart}
    optional {?ind ${propStr} ?${prop.getName()} }.`;
                }
            }
        }
        parentClassPart = `${parentClassPart}
    bind ("${cls.getName()}" as ?contentKey ).
   }`;
        let where = `?ind rdf:type + ${clsStr} .${iriFilterStr}`;
        if (fieldFilterStr.length > 0) {
            where = `${where}
${fieldFilterStr}`;
        }

        var sparql = `select distinct ${fields}
where
  {
${where}
  {
${parentClassPart}    
  }`;
        if (offset) {
            sparql = `${sparql}\noffset ${offset}`;
        }
        if (limit) {
            sparql = `${sparql}\nlimit ${limit}`;
        }
        // return the generated SPARQL
        return { sparql };
    }
    splitProperty(item) {
        let res = item.split(':');
        return res[1];
    }
    findAndCount(object) {
        for (let i = 0; i < object.length; i++) {
            if (object[i].joins && !object[i].status) {
                this.count++;
                object[i].status = 1;
                this.findAndCount(object[i].joins, count);
            }
        }
        return 0;
    }

    getFirstLevelChildren(joins, array, parent) {
        let prefixPredicates = true;
        let subFields = array;
        var checkRelation = [];
        var firstLevelChildDetail = [];
        var propArray = false;
        for (let i = 0; i < joins.length; i++) {
            let cls = joins[i].cls;
            // check the relation is it child2ParentRelation
            if (joins[i].child2ParentRelation) {
                // get all the relations
                let relation = joins[i].child2ParentRelation;
                for (let j = 0; j < relation.length; j++) {
                    if (!checkRelation.includes(relation)) {
                        checkRelation.push(relation);
                    }
                }
                if (joins[i].joins) {
                    let res = this.findJoinsRelation(joins[i].joins);
                    checkRelation = checkRelation.concat(res);
                }

                // getting fields of parent/master class
                let fields =
                    '?' +
                    this.toLowerCase(this.removeIRI(cls.getName())) +
                    'Iri';
                for (let prop of joins[i].cls.getProperties()) {
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (
                            !fields.includes(
                                ' ?' +
                                    this.toLowerCase(cls.getName()) +
                                    this.toUpperCase(prop.getName())
                            )
                        ) {
                            fields +=
                                ' ?' +
                                this.toLowerCase(cls.getName()) +
                                this.toUpperCase(prop.getName());
                        }
                    }
                }
                subFields.push(fields);
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                // create the query
                let childProp = `?${this.toLowerCase(
                    cls.getName()
                )} ${propIRI}  ?ind.
                ?${this.toLowerCase(
                    cls.getName()
                )} rdf:type + ${this.prefixManager.fullToPrefixedIRI(
                    cls.getIRI()
                )} .
{
bind(?${this.toLowerCase(cls.getName())} as ?${this.toLowerCase(
                    cls.getName()
                )}Iri)`;
                let propertyRelation = this.splitProperty(propIRI);
                // now add  properties
                for (let prop of cls.getProperties()) {
                    let propStr = prefixPredicates
                        ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                        : this.prefixManager.getSparqlIRI(prop.getIRI());
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (!childProp.includes(propStr)) {
                            childProp = `${childProp}
optional{?${this.toLowerCase(cls.getName())}  ${propStr} ?${this.toLowerCase(
                                cls.getName()
                            )}${this.toUpperCase(prop.getName())}.}`;
                        }
                    }
                }
                childProp = `${childProp}
bind( "${parent.getName()}.${cls.getName()}" as ?contentKey)
    bind( "${propertyRelation}" as ?contentRelation)
    bind( ?ind as ?parentIRI)
            }`;
                let skipBracket = joins.filter(
                    (element) => element.cls.getName() == cls.getName()
                );
                if (skipBracket[0].joins) {
                    childProp = `union
    {
        ${childProp}  
    `;
                } else {
                    childProp = `union
    {
        ${childProp}  
    }`;
                }

                // push the each relation against query in array
                firstLevelChildDetail.push(childProp);
                // check the query is it parent2ChildRelation accordingly create query
            } else if (!joins.parent2ChildRelation) {
                let relation = joins[i].parent2ChildRelation;
                for (let j = 0; j < relation.length; j++) {
                    if (!checkRelation.includes(relation)) {
                        checkRelation.push(relation);
                    }
                }
                if (joins[i].joins) {
                    let res = this.findJoinsRelation(joins[i].joins);
                    checkRelation = checkRelation.concat(res);
                }
                let fields = '?' + this.toLowerCase(cls.getName()) + 'Iri';
                for (let prop of joins[i].cls.getProperties()) {
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (
                            !fields.includes(
                                ' ?' +
                                    this.toLowerCase(cls.getName()) +
                                    this.toUpperCase(prop.getName())
                            )
                        ) {
                            fields +=
                                ' ?' +
                                this.toLowerCase(cls.getName()) +
                                this.toUpperCase(prop.getName());
                        }
                    }
                }
                subFields.push(fields);

                // todo: add relation prefix properties
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                let propertyRelation = this.splitProperty(propIRI);

                var childProp = `
    ?ind ${propIRI}  ?${this.toLowerCase(cls.getName())} .
    ?${this.toLowerCase(
        cls.getName()
    )} rdf:type + ${this.prefixManager.fullToPrefixedIRI(cls.getIRI())} .
    {
    bind(?${this.toLowerCase(cls.getName())} as ?${this.toLowerCase(
                    cls.getName()
                )}Iri)`;
                for (let prop of cls.getProperties()) {
                    let propStr = prefixPredicates
                        ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                        : this.prefixManager.getSparqlIRI(prop.getIRI());
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (!childProp.includes(propStr)) {
                            childProp = `
                     ${childProp}
    optional{?${this.toLowerCase(
        cls.getName()
    )}  ${propStr} ?${this.toLowerCase(cls.getName())}${this.toUpperCase(
                                prop.getName()
                            )}.}`;
                        }
                    }
                }
                childProp = `
${childProp}
    bind( "${parent.getName()}.${cls.getName()}" as ?contentKey)
    bind( "${propertyRelation}" as ?contentRelation)
    bind( ?ind as ?parentIRI)
}`;
                let skipBracket = joins.filter(
                    (element) => element.cls.getName() == cls.getName()
                );
                if (skipBracket[0].joins) {
                    childProp = `union
{
${childProp}  
`;
                } else {
                    childProp = `union
{
${childProp}  
}`;
                }
                firstLevelChildDetail.push(childProp);
            }
        }
        //     firstLevelChildDetail = `${firstLevelChildDetail}
        // }`;
        return { subFields, firstLevelChildDetail };
    }
    getAllRelation(obj, cls) {
        let result = [];
        let fieldArray = [];
        let array = [];
        let fields;
        let res1 = this.getFirstLevelChildren(obj, array, cls);
        for (let i = 0; i < obj.length; i++) {
            let subChildArray = [];
            if (obj[i].joins) {
                let res = this.getInnerRelation(
                    [obj[i]],
                    fieldArray,
                    subChildArray
                );
                // this.count = 0;
                // this.findAndCount(obj[i].joins);
                // if (obj[i].joins && this.count == 0) {
                //     this.count = 1;
                // }
                result.push({
                    parent: res1.firstLevelChildDetail[i],
                    child: res.second
                    //    bracket: this.count + 1
                });
                if (res.field) {
                    fields = res.field.join(' ');
                }
            } else {
                result.push({ parent: res1.firstLevelChildDetail[i] });
            }
        }
        if (res1.subFields) {
            fields = `${res1.subFields.join(' ')} ${fields} `;
        }
        return { fields, result };
    }

    getInnerRelation(obj, fieldArray, childArray) {
        obj.forEach((element) => {
            if (element.joins) {
                let res = this.SubChildJoin(
                    element.joins,
                    element.cls,
                    fieldArray,
                    childArray
                );
                this.childDetail = res.subChild;
                this.fields = res.subFields;
                //console.log(this.childDetail);
                // this.getInnerRelation(
                //     element.joins,
                //     this.fields,
                //     this.childDetail,
                //     element.cls
                // );
            }
        });
        let field = this.fields;
        let second = this.childDetail;
        return { field, second };
    }

    SubChildJoin(child, parent, field, childDetails) {
        let prefixPredicates = true;
        let subChild = childDetails;
        let subFields = field;
        var checkRelation = [];
        var propArray = false;
        for (let i = 0; i < child.length; i++) {
            let cls = child[i].cls.getName();
            // check the relation type
            if (child[i].child2ParentRelation) {
                let relation = child[i].child2ParentRelation;
                for (let j = 0; j < relation.length; j++) {
                    if (!checkRelation.includes(relation)) {
                        checkRelation.push(relation);
                    }
                }
                if (child[i].joins) {
                    let res = this.findJoinsRelation(child[i].joins);
                    checkRelation = checkRelation.concat(res);
                }

                // getting fields of parent/master class
                let fields = '?' + this.toLowerCase(cls) + 'Iri';
                for (let prop of child[i].cls.getProperties()) {
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (
                            !fields.includes(
                                ' ?' +
                                    this.toLowerCase(cls) +
                                    this.toUpperCase(prop.getName())
                            )
                        ) {
                            fields +=
                                ' ?' +
                                this.toLowerCase(cls) +
                                this.toUpperCase(prop.getName());
                        }
                    }
                }
                if (!subFields.includes(fields)) {
                    subFields.push(fields);
                }
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                let propertyRelation = this.splitProperty(propIRI);

                var childDe = `          
?${this.toLowerCase(cls)} ${propIRI}+  ?${this.toLowerCase(parent.getName())}.
   ?${this.toLowerCase(cls)} rdf:type + ${this.prefixManager.fullToPrefixedIRI(
                    child[i].cls.getIRI()
                )} .
    bind(?${this.toLowerCase(cls)} as ?${this.toLowerCase(cls)}Iri)
    {`;
                for (let prop of child[i].cls.getProperties()) {
                    let propStr = prefixPredicates
                        ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                        : this.prefixManager.getSparqlIRI(prop.getIRI());
                    propArray = checkRelation.includes(prop.getIRI());
                    if (!propArray) {
                        if (!childDe.includes(propStr)) {
                            childDe = `${childDe}
    optional{?${this.toLowerCase(
        child[i].cls.getName()
    )}  ${propStr} ?${this.toLowerCase(
                                child[i].cls.getName()
                            )}${this.toUpperCase(prop.getName())}.}`;
                        }
                    }
                }
                childDe = `
${childDe}
    bind( "${parent.getName()}.${cls}" as ?contentKey)
    bind( "${propertyRelation}" as ?contentRelation)
    bind( ?${this.toLowerCase(parent.getName())} as ?parentIRI)
    }`;
                let skipBracket = [child[i]].filter(
                    (element) => element.cls.getName() == cls
                );
                if (skipBracket[0].joins) {
                    childDe = `union
{
${childDe}  
`;
                } else {
                    childDe = `union
{
${childDe}  
}`;
                }
                // if (i == child.length - 1) {
                //     childDe = `${childDe}
                // }`;
                // }
                if (!subChild.includes(childDe)) {
                    subChild.push(childDe);
                }
            } else if (child[i].parent2ChildRelation) {
                let relation = child[i].parent2ChildRelation;
                for (let j = 0; j < relation.length; j++) {
                    if (!checkRelation.includes(relation)) {
                        checkRelation.push(relation);
                    }
                }
                if (child[i].joins) {
                    let res = this.findJoinsRelation(child[i].joins);
                    checkRelation = checkRelation.concat(res);
                }
                let fields = '?' + this.toLowerCase(cls) + 'Iri';
                for (let prop of child[i].cls.getProperties()) {
                    propArray = checkRelation.includes(prop.getIRI());
                    if (!propArray) {
                        if (
                            !fields.includes(
                                ' ?' +
                                    this.toLowerCase(cls) +
                                    this.toUpperCase(prop.getName())
                            )
                        ) {
                            fields +=
                                ' ?' +
                                this.toLowerCase(cls) +
                                this.toUpperCase(prop.getName());
                        }
                    }
                }
                if (!subFields.includes(fields)) {
                    subFields.push(fields);
                }
                // todo: add relation prefix properties
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                let propertyRelation = this.splitProperty(propIRI);
                var childDe = `
   
    ?${this.toLowerCase(parent.getName())}  ${propIRI}+ ?${this.toLowerCase(
                    cls
                )}.
                ?${this.toLowerCase(
                    cls
                )} rdf:type + ${this.prefixManager.fullToPrefixedIRI(
                    child[i].cls.getIRI()
                )} .          
    {
    bind(?${this.toLowerCase(cls)} as ?${this.toLowerCase(cls)}Iri)`;

                for (let prop of child[i].cls.getProperties()) {
                    let propStr = prefixPredicates
                        ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                        : this.prefixManager.getSparqlIRI(prop.getIRI());
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (!childDe.includes(propStr)) {
                            childDe = `${childDe}
    optional{?${this.toLowerCase(
        child[i].cls.getName()
    )}  ${propStr} ?${this.toLowerCase(
                                child[i].cls.getName()
                            )}${this.toUpperCase(prop.getName())}.}`;
                        }
                    }
                }
                childDe = `${childDe}
    bind( "${parent.getName()}.${cls}" as ?contentKey)
    bind( "${propertyRelation}" as ?contentRelation)
    bind( ?${this.toLowerCase(parent.getName())} as ?parentIRI)
    }`;
                let skipBracket = [child[i]].filter(
                    (element) => element.cls.getName() == cls
                );
                if (skipBracket[0].joins) {
                    //  count++;
                    childDe = `union
{
${childDe}  
`;
                } else {
                    childDe = `union
{
${childDe}  
}`;
                }
                // if (i == child.length - 1 && !child[i].joins) {
                //     childDe = `${childDe}
                //     }`;
                //     if (count) {
                //         for (let i = 0; i < count; i++) {
                //             childDe = `${childDe}
                //     }`;
                //         }
                //     }
                //     //  console.log(count);
                // }
                // if (i == child.length - 1 && child[i].joins) {
                //     count++;
                // }
                if (!subChild.includes(childDe)) {
                    subChild.push(childDe);
                }
            }
            if (child[i].joins) {
                //child, parent, field, childDetails
                this.SubChildJoin(
                    child[i].joins,
                    child[i].cls,
                    subFields,
                    subChild
                );
            }
            // if (child[i].joins) {
            //     // console.log(child[i].joins);
            //     this.getInnerRelation(
            //         child[i].joins,
            //         subFields,
            //         subChild
            //         //  element.cls
            //     );
            // }
        }
        let count = subChild.length;
        let v = subChild[count - 1];
        v = `${v}
    }`;
        subChild[count - 1] = v;
        return { subChild, subFields };
    }
    findNoOfBrakcet(object, iterator) {
        try {
            //  for (const key of object) {
            for (const item of object) {
                let index = [item].find(
                    (el) =>
                        el.cls.getName() == iterator.cls.getName() &&
                        el.parent2ChildRelation == iterator.parent2ChildRelation
                );
                if (index) {
                    let depth = this.findDepth(index, 0);
                    console.log(depth);
                    //     return count;
                } else {
                    if (item.joins) {
                        let cout = this.findNoOfBrakcet(item.joins, iterator);
                        console.log(cout);
                    }
                }
            }
        } catch (e) {
            return e;
        }
    }
    findDepth(array, count) {
        if (array.joins) {
            count = +joins.length;
            count = this.findDepth(array.join, count);
        }
        return count;
    }
    findJoinsRelation(joins) {
        let arr = [];
        for (let i = 0; i < joins.length; i++) {
            if (joins[i].child2ParentRelation) {
                if (!arr.includes(joins[i].child2ParentRelation)) {
                    arr.push(joins[i].child2ParentRelation);
                }
            } else if (joins[i].parent2ChildRelation) {
                if (!arr.includes(joins[i].parent2ChildRelation)) {
                    arr.push(joins[i].parent2ChildRelation);
                }
            }
        }
        return arr;
    }
    /*
 SPARQL example:
 select ?master ?child ?has_Product_Name ?has_Product_Code ?has_Product_Price
 where {
 filter(?master in (fyp:SABS_ORDERLINE_01)) .
 optional {
 ?master fyp:hasProduct ?child .
 optional { ?child fyp:has_Product_Name ?has_Product_Name } .
 optional { ?child fyp:has_Product_Code ?has_Product_Code } .
 optional { ?child fyp:has_Product_Price ?has_Product_Price } .
 }
 }
 */

    // get all related instances of a certain class from the graph
    // cls: the in-memory class
    // prefixProps: true = uses prefixed property identifiers
    toLowerCase(option) {
        return `${option[0].toLowerCase()}${option.substr(1)}`;
    }
    toUpperCase(option) {
        return `${option[0].toUpperCase()}${option.substr(1)}`;
    }
    getRelatedIndividuals(args) {
        args = args || {};
        if (!args.childCls) {
            throw 'No child class passed';
        }
        args.prefixPredicates =
            args.prefixPredicates === undefined ? true : args.prefixPredicates;
        args.prefixFilter =
            args.prefixFilter === undefined ? true : args.prefixFilter;
        args.prefixClass =
            args.prefixClass === undefined ? true : args.prefixClass;

        let childCls = args.childCls;
        // first generate list of fields to be queried
        let fields = '?master ?child';
        for (let prop of childCls.getProperties()) {
            fields += ' ?' + prop.getName();
        }

        // check if iri filter needs to be applied
        let masterIris = [args.masterIri];
        let filter = '';
        if (masterIris) {
            let filterArgs = [];
            for (let arg of masterIris) {
                let masterIri = args.prefixFilter
                    ? this.prefixManager.fullToPrefixedIRI(arg)
                    : this.prefixManager.getSparqlIRI(arg);
                filterArgs.push(masterIri);
            }
            filter = `filter(?master in (${filterArgs.join(', ')})) .`;
        }

        // now generate the where clause for the select statement
        // add the iri filter, if such is requested
        let propStr = args.prefixFilter
            ? this.prefixManager.fullToPrefixedIRI(args.propertyIri)
            : this.prefixManager.getSparqlIRI(args.propertyIri);
        let where = `${filter}
optional {
?master ${propStr} ?child`;

        // now add all properties
        for (let prop of childCls.getProperties()) {
            let propStr = args.prefixPredicates
                ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                : this.prefixManager.getSparqlIRI(prop.getIRI());
            where = `${where}
optional { ?child ${propStr} ?${prop.getName()} } .`;
        }
        where = `${where}
}`;

        // and compose the query
        let sparql = `select ${fields}
where {
${where}
}`;
        // return the generated SPARQL
        return { sparql };
    }

    // create a new instance of a certain (in-memory-)class in the graph
    createIndividualByClass(args) {
        let prefixPredicates = true;
        args = args || {};
        let cls = args.cls;
        let options = args.options || {};
        let ind = args.ind || {};
        let baseiri = args.baseiri;
        // if an IRI is provided use that one, if not generate an UUID
        if (!baseiri) {
            var iri =
                ind.iri ||
                this.prefixManager.getDefaultNamespace() +
                    cls.getName() +
                    '_' +
                    uuidv4();
        } else {
            var iri = baseiri + cls.getName() + '_' + uuidv4();
        }

        // todo: add options argument prefixClass
        let classIRI = prefixPredicates
            ? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
            : this.prefixManager.getSparqlIRI(cls.getIRI());
        // let fields = `?iri rdf:type owl:NamedIndividual .`;
        let fields = `?iri rdf:type ${classIRI} .`;
        for (let prop of cls.getProperties()) {
            // get the name of the property
            let name = prop.getName();
            // find the value in the passed individual
            let val = ind[name];
            // if a value is set
            if (undefined != val) {
                // todo: replace this by global method to convert value
                let object;
                if (prop.getType().includes('DatatypeProperty')) {
                    //   object = '"' + val + '"';
                    //  if (object.includes('"')) {
                    val = val.replace(/\"/g, '\\"');
                    //}
                    object = '"' + val + '"';
                } else {
                    object = this.prefixManager.fullToPrefixedIRI(val);
                }
                // todo: add options argument prefixProperties
                let propIRI = options.prefixProperties
                    ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                    : this.prefixManager.getSparqlIRI(prop.getIRI());
                if (!fields.includes(propIRI)) {
                    //  console.log(object);
                    fields = `${fields}
                    ?iri ${propIRI} ${object} .`; // <${prop.getIRI()}>
                }
            }
        }
        // accomplish the sparql insert command
        let sparql = `insert {
${fields}
} where {
bind( <${iri}> as ?iri )
}`;
        return { sparql, iri };
    }

    // updates an individual by its class reference and a data object with the values
    updateIndividualByClass(args) {
        let fields = '';
        let conditions = '';
        let values = '';
        let cls = args.cls;
        let iri = args.iri;
        let ind = args.ind;
        let prefixSubjects = true;
        let prefixPredicates = true;
        let prefixObjects = true;
        let iriStr = prefixSubjects
            ? this.prefixManager.fullToPrefixedIRI(iri)
            : this.prefixManager.getSparqlIRI(iri);

        for (let prop of cls.getProperties()) {
            // get the name of the property
            let name = prop.getName();
            // find the value in the passed individual
            let val = ind[name];
            // if a value is set
            if (undefined != val) {
                // todo: replace this by global method to convert value
                let object;
                if (prop.type.includes('DatatypeProperty')) {
                    val = val.replace(/\"/g, '\\"');
                    object = '"' + val + '"';
                    //  if (object.includes('"')) {
                    //  object = object.replace(/(.)"(.)/g, '$1\\"$2');
                    // }
                } else {
                    object = this.prefixManager.fullToPrefixedIRI(val);
                }
                let predicateIRI = prop.getIRI();
                let predicateStr = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(predicateIRI)
                    : this.prefixManager.getSparqlIRI(predicateIRI);
                if (!fields.includes(predicateStr)) {
                    //  console.log(prop);
                    const triple = `${iriStr} ${predicateStr} ?${prop.getName()}`;
                    fields = `${fields}\n${triple}.`;
                    conditions = `${conditions}\n  optional { ${triple} } .`;
                }
                if (!values.includes(predicateStr)) {
                    values = `${values}\n${iriStr} ${predicateStr} ${object} .
                    `;
                }
            }
        }
        let sparql = `delete {
${fields}
} insert
{
${values}
} where
{
${conditions}
}`;
        return { sparql };
    }

    /*
 SPARQL example
 delete {
 ?subject ?predicate ?object
 } where {
 ?subject ?predicate ?object .
 filter(?s = <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander>) .
 }
 */
    // delete a certain resource by its IRI
    // iri = this.prefixManager.getSparqlIRI(iri);
    // let sparql = `delete {
    // ?subject ?predicate ?object
    // } where {
    // ?subject ?predicate ?object .
    // filter(?subject = ${iri}) .
    // }`;

    deleteResource(args) {
        let prefixPredicates = true;
        let childern = [];
        // get the join nested objects array from argument
        let joins = args.joins;
        // get the iri of indivudal which wanna delete
        let iri = args.iri;
        //  let iri = this.prefixManager.fullToPrefixedIRI(iri1);
        var where = `bind(<${iri}> as ?master).
    {
bind(?master as ?s)
?s ?p ?o        
    }`;
        // check join  is pass in arguments or not
        if (joins) {
            // run the loop to get the parent class childs
            for (let i = 0; i < joins.length; i++) {
                let cls = this.removeIRI(joins[i].cls);
                // check the relation is it child2ParentRelation
                if (joins[i].child2ParentRelation) {
                    // get all the relations
                    let relation = joins[i].child2ParentRelation;
                    let propIRI = prefixPredicates
                        ? this.prefixManager.fullToPrefixedIRI(relation)
                        : this.prefixManager.getSparqlIRI(relation);
                    // create the query
                    let childProp = `?${this.toLowerCase(
                        cls
                    )} ${propIRI}  ?master.
    {
bind(?${this.toLowerCase(cls)} as ?s)
?s ?p ?o`;
                    // push the each relation against query in array
                    childern.push(childProp);
                    // check the query is it parent2ChildRelation accordingly create query
                } else if (!joins.parent2ChildRelation) {
                    where = `bind(<${iri}> as ?master).
                    {  
                    }`;
                    let relation = joins[i].parent2ChildRelation;
                    // todo: add relation prefix properties
                    let propIRI =
                        this.prefixManager.fullToPrefixedIRI(relation);
                    var childProp = `?master  ${propIRI} ?${this.toLowerCase(
                        cls
                    )}.
     {
bind(?${this.toLowerCase(cls)} as ?s)
    ?s ?p ?o`;
                    childern.push(childProp);
                }
            }
            let array = [];
            // create the object of getSubChild to get the details of subchilds
            let subChildDetails = this.getSubChildDetails(joins, array);
            let count;
            // check the children is it undefined or not
            if (childern) {
                count = childern.length;
                // store the query of children in where using union after each statements
                where = `${where}
  ${
      //get the all query part of child classes using map
      childern
          .map(
              (key) => `
  union
   {
      ${key}
   }`
          )
          .join('')
  }`;
            }
            //check the subchild details
            if (subChildDetails) {
                count = count + subChildDetails.length;
                // store the sub child query in where part of query
                where = `${where}
    ${
        //get the all query part of child classes using map
        subChildDetails
            .map(
                (key) => `
  union
   {
        ${key}
   }`
            )
            .join('')
    }`;
            }
            for (let i = 0; i < count; i++) {
                where = `${where}
            }`;
            }
        }
        let sparql = `delete {?s ?p ?o}
where
{
${where}
filter(!isBlank(?o))
}`;
        return { sparql };
    }

    // function to get subchild details
    getSubChildDetails(obj, array) {
        obj.forEach((element) => {
            if (element.joins) {
                let res = this.getSubChildJoin(
                    element.joins,
                    this.removeIRI(element.cls),
                    array
                );
                this.childDetail = res.subChild;
                this.getSubChildDetails(element.joins, this.childDetail);
            }
        });
        return this.childDetail;
    }

    getSubChildJoin(childDetails, parentClass, array) {
        let subChild = array;
        let prefixPredicates = true;
        // run the loop till get all classes details of subchild
        for (let i = 0; i < childDetails.length; i++) {
            let cls = this.removeIRI(childDetails[i].cls);
            // check the relation type
            if (childDetails[i].child2ParentRelation) {
                let relation = childDetails[i].child2ParentRelation;
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                var child = `?${this.toLowerCase(
                    cls
                )} ${propIRI}  ?${this.toLowerCase(parentClass)}.
                {
bind(?${this.toLowerCase(cls)} as ?s)
        ?s ?p ?o`;
                subChild.push(child);
            } else if (!childDetails.parent2ChildRelation) {
                let relation = childDetails[i].parent2ChildRelation;
                // todo: add relation prefix properties
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                var child = `?${this.toLowerCase(
                    parentClass
                )}  ${propIRI} ?${this.toLowerCase(cls)}.
                {
bind(?${this.toLowerCase(cls)} as ?s)
        ?s ?p ?o`;
                subChild.push(child);
            }
        }
        return { subChild };
    }
    removeIRI(item) {
        return item ? item.split('#').pop() : null;
    }

    /*
 SPARQL example:
 insert data {
 <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander> <http://ont.comsats.edu/fyp#hasOrderline> <http://ont.comsats.edu/fyp#SABS_ORDERLINE_01>
 }
 */

    // add a relation between two individuals
    createRelation(master, property, child) {
        // adjust subject, predicate and object
        master = this.prefixManager.getSparqlIRI(master);
        property = this.prefixManager.getSparqlIRI(property);
        child = this.prefixManager.getSparqlIRI(child);

        let sparql = `insert data {
    ${master} ${property} ${child}
}`;
        return { sparql };
    }

    /*
 SPARQL example:
 delete data {
 <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander> <http://ont.comsats.edu/fyp#hasOrderline> <http://ont.comsats.edu/fyp#SABS_ORDERLINE_02>
 }
 */

    // delete a relation between two individuals
    deleteRelation(master, property, child) {
        // adjust subject, predicate and object
        master = this.prefixManager.getSparqlIRI(master);
        property = this.prefixManager.getSparqlIRI(property);
        child = this.prefixManager.getSparqlIRI(child);
        let sparql = `delete data {
    ${master} ${property} ${child}
}`;
        return { sparql };
    }

    /*
 SPARQL example:
 insert {
 ?iri ?p ?o .
 } where {
 bind( iri(concat("http://ont.comsats.edu/fyp#Customer_", struuid())) as ?iri) .
 ?s ?p ?o .
 filter(?s = fyp:SABS_CUSTOMER_01)
 }
 */

    // clone an individual (simple flat clone)
    cloneIndividual(cls, origIRI, newIRI) {
        let iri =
            newIRI ||
            this.prefixManager.getDefaultNamespace() +
                cls.getName() +
                '_' +
                uuidv4();
        let iriStr = this.prefixManager.getSparqlIRI(iri);
        origIRI = this.prefixManager.getSparqlIRI(origIRI);
        let sparql = `insert {
?iri ?p ?o .
} where {
bind(${iriStr} as ?iri) .
?s ?p ?o .
filter(?s = ${origIRI}) .
}`;
        return { sparql, iri };
    }

    /*
 SPARQL example:
 insert {
 fyp:SABS_PRODUCT_03
 fyp:has_OrderlineProduct_Name ?has_Product_Name ;
 fyp:has_OrderlineProduct_Price ?has_Product_Price .
 } where {
 fyp:SABS_PRODUCT_01
 fyp:has_Product_Name ?has_Product_Name ;
 fyp:has_Product_Price ?has_Product_Price .
 }
 */

    mapIndividual(origCls, origIRI, newCls, newIRI, mapping) {
        origIRI = this.prefixManager.getSparqlIRI(origIRI);
        let genIRI =
            newIRI ||
            this.prefixManager.getDefaultNamespace() +
                newCls.getName() +
                '_' +
                uuidv4();
        newIRI = this.prefixManager.getSparqlIRI(genIRI);
        let src = '';
        let dest = '';
        let idx = 0;
        for (let mapItem of mapping) {
            src = `${src}\n\t\t${mapItem.from} ?v${idx} ${
                idx < mapping.length - 1 ? ';' : '.'
            }`;
            dest = `${dest}\n\t\t${mapItem.to} ?v${idx} ${
                idx < mapping.length - 1 ? ';' : '.'
            }`;
            idx++;
        }
        let sparql = `insert {
${newIRI}${dest}
} where {
${origIRI}${src}
}`;
        return { sparql, newIRI };
    }

    deleteGivenPropertyOfClass(args) {
        args = args || {};
        let cls = args.cls;
        let property = args.dataProperty;
        if (!cls) {
            throw 'No classs passed';
        } else if (!property) {
            throw 'No Property passed';
        }
        let sparql = `delete where
{
  ?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
           ?${cls} ${this.prefixManager.fullToPrefixedIRI(
            property
        )} ?${cls}${property}.
        }`;
        return { sparql };
    }

    deleteLabelOfEachClassIndividual(args) {
        args = args || {};
        let cls = args.cls;
        let labelLanguage = args.labelLanguage;
        if (!cls) {
            throw 'No classs passed';
        }
        let where = `?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
?${cls} rdfs:label ?label.`;
        if (!labelLanguage) {
        } else {
            where = `${where}
filter(lang(?label) = "" ||lang(?label)="${labelLanguage}")`;
        }
        let sparql = `delete
    {
?${cls} rdfs:label ?label.
    }
where
    {
${where}
    }`;
        return { sparql };
    }

    copyLabelToDataPropertyOfEachIndividual(args) {
        args = args || {};
        let cls = args.cls;
        let labelLanguage = args.labelLanguage;
        let property = args.dataProperty;
        if (!cls) {
            throw 'No classs passed';
        } else if (!property) {
            throw 'No Property passed';
        }
        let where = `?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
      ?${cls} rdfs:label ?label.`;
        if (!labelLanguage) {
        } else {
            where = `  ${where}
      filter(lang(?label)="${labelLanguage}")`;
        }
        let sparql = `insert
  {
      ?${cls} ${this.prefixManager.fullToPrefixedIRI(property)} ?label.
  }
where
  {
    ${where}
  }`;
        return { sparql };
    }
    copyDataPropertyToLabelOfEachIndividual(args) {
        args = args || {};
        let cls = args.cls;
        let labelLanguage = args.labelLanguage;
        let property = args.dataProperty;
        if (!cls) {
            throw 'No classs passed';
        } else if (!property) {
            throw 'No Property passed';
        }
        let where = `   ?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
     ?${cls} ${this.prefixManager.fullToPrefixedIRI(property)} ?${property}.`;
        if (!labelLanguage) {
        } else {
            where = `  ${where}
     bind(strlang(?${property},"${labelLanguage}") as ?label)`;
        }
        let sparql = `insert
  {
    ?${cls} rdfs:label ?label.
  }
where
  {
${where}
  }`;
        return { sparql };
    }
    getIRIClassName(arg) {
        let iri = this.prefixManager.fullToPrefixedIRI(arg);

        let sparql = `select ?type  where {
            ${iri} sesame:directType ?type .
                filter(!isBlank(?type) && ?type!=owl:NamedIndividual)
         } `;
        return { sparql };
    }
    getClassObjectProperties(cls) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        let sparql = `select
            ?prop ?type ?range ?domain
            ?only ?some ?min ?max ?exactly ?value
        where {
            bind( ${iri} as ?class ) .
            ?class rdfs:subClassOf ?restr .
            ?restr owl:onProperty ?prop .
            ?prop a ?type .
            filter(?type = owl:ObjectProperty ) .
       
            ?restr ( owl:onClass | owl:onDataRange
                | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ?range .
            bind( ?class as ?domain ) .
       
            optional { ?restr owl:allValuesFrom ?only } .
            optional { ?restr owl:someValuesFrom ?some } .
            optional { ?restr owl:minQualifiedCardinality ?min } .
            optional { ?restr owl:qualifiedCardinality ?exactly } .
            optional { ?restr owl:maxQualifiedCardinality ?max } .
            optional { ?restr owl:hasValue ?value } .
        }`;

        return { sparql };
    }
    // retrieve all properties from a single given class
    getSingleClassObjectProperties(cls) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        let sparql = `select
            ?prop ?type ?range ?domain
            ?only ?some ?min ?max ?exactly ?value
        where {
            bind( ${iri} as ?class ) .
            ?class sesame:directSubClassOf ?restr .
            ?restr owl:onProperty ?prop .
            ?prop a ?type .
            filter(?type = owl:ObjectProperty ) .
       
            ?restr ( owl:onClass | owl:onDataRange
                | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ?range .
            bind( ?class as ?domain ) .
       
            optional { ?restr owl:allValuesFrom ?only } .
            optional { ?restr owl:someValuesFrom ?some } .
            optional { ?restr owl:minQualifiedCardinality ?min } .
            optional { ?restr owl:qualifiedCardinality ?exactly } .
            optional { ?restr owl:maxQualifiedCardinality ?max } .
            optional { ?restr owl:hasValue ?value } .
        }`;

        return { sparql };
    }
    getObjectPropertiesAndClassName(cls, prop) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        let propIri = this.prefixManager.fullToPrefixedIRI(prop);
        let sparql = `select ?class
        where {
            ?class sesame:directSubClassOf ?restr .
            ?restr owl:onProperty ?prop .
            ?prop a ?type .
            filter(?type = owl:ObjectProperty && ?prop=${propIri} ) .    
            ?restr ( owl:onClass | owl:onDataRange
                | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ${iri} .
        }`;
        return { sparql };
    }
    evaluateRestrictionType(key) {
        let property;
        if (key.some) {
            if (key.some.includes('#') && !key.some.includes('XMLSchema')) {
                property = this.prefixManager.fullToPrefixedIRI(key.some);
                property = `owl:someValuesFrom ${property}`;
            } else {
                property = `owl:someValuesFrom ${this.prefixManager.fullToPrefixedIRI(
                    key.some
                )}`;
            }
        } else if (key.exactly) {
            property = ` owl:qualifiedCardinality "${key.cardinality}"^^xsd:nonNegativeInteger;`;
            let propIRI;
            if (
                key.exactly.includes('#') &&
                !key.exactly.includes('XMLSchema')
            ) {
                propIRI = this.prefixManager.fullToPrefixedIRI(key.exactly);
                propIRI = `owl:onClass ${propIRI}`;
            } else {
                // propIRI = key.exactly;
                propIRI = `owl:onDataRange ${this.prefixManager.fullToPrefixedIRI(
                    key.exactly
                )}`;
            }
            property = `${property}
            ${propIRI}`;
        } else if (key.max) {
            property = ` owl:maxQualifiedCardinality "${key.cardinality}"^^xsd:nonNegativeInteger;`;
            let propIRI;
            if (key.max.includes('#') && !key.max.includes('XMLSchema')) {
                propIRI = this.prefixManager.fullToPrefixedIRI(key.max);
                propIRI = `owl:onClass ${propIRI}`;
            } else {
                propIRI = `owl:onDataRange ${this.prefixManager.fullToPrefixedIRI(
                    key.max
                )}`;
            }
            property = `${property}
            ${propIRI}`;
        } else if (key.min) {
            property = ` owl:minQualifiedCardinality "${key.cardinality}"^^xsd:nonNegativeInteger;`;
            let propIRI;
            if (key.min.includes('#') && !key.max.includes('XMLSchema')) {
                propIRI = this.prefixManager.fullToPrefixedIRI(key.min);
                propIRI = `owl:onClass ${propIRI}`;
            } else {
                // propIRI = key.exactly;
                propIRI = `owl:onDataRange ${this.prefixManager.fullToPrefixedIRI(
                    key.min
                )}`;
            }
            property = `${property}
            ${propIRI}`;
        } else if (key.only) {
            if (key.only.includes('#') && !key.only.includes('XMLSchema')) {
                property = this.prefixManager.fullToPrefixedIRI(key.only);
                property = `owl:allValuesFrom ${property}`;
            } else {
                property = `owl:allValuesFrom ${this.prefixManager.fullToPrefixedIRI(
                    key.only
                )}`;
            }
        } else if (key.value) {
            if (key.value.includes('#') && !key.value.includes('XMLSchema')) {
                property = this.prefixManager.fullToPrefixedIRI(key.value);
                property = `owl:hasValue ${property}`;
            } else {
                property = `owl:hasValue "${this.prefixManager.fullToPrefixedIRI(
                    key.value
                )}"`;
            }
        }
        return property;
    }
    deleteClassModel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = ` DELETE
        {
            ?s ?p ?o.
        }
        WHERE
        {
            {
            bind (${cls} as ?s)
            ?s ?p ?o.  
            }
        }
        `;
        return { sparql };
    }
    deleteClassData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = ` DELETE
        {
            ?instance rdf:type ?class.
            ?instance ?p ?o.
        }
        WHERE
        {
            {
            bind (${cls} as ?class)
            ?instance rdf:type ?class .
            ?instance ?p ?o.  
            filter(!isBlank(?instance))    
            }      
        }
        `;
        return { sparql };
    }
    deleteClassReferenceModel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = ` delete {  
            ?s ?p ?o.
            ?s1 rdfs:range ?range.
              }
          where
          {
              ?class rdfs:subClassOf ?restr .
              ?restr owl:onProperty ?prop .
              ?restr ( owl:onClass | owl:onDataRange
                  | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ${cls} .
             ?restr rdf:type ?type.
             bind(?restr as ?o)
               ?s ?p ?o.
             filter(?s=?class && ?type=owl:Restriction )
             {
                ?s1 a owl:ObjectProperty.
                ?s1 rdfs:range ?range.
             }
          }
        `;
        return { sparql };
    }
    deleteClassReferenceData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = ` delete {  
            ?s1 ?prop ?name.
              }
          where
          {
              ?class rdfs:subClassOf ?restr .
              ?restr owl:onProperty ?prop .
              ?restr ( owl:onClass | owl:onDataRange
                  | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ${cls} .
              ?s1 ?p1 ?o1.
              {
               ?s1 ?prop ?name.
              }
               filter(?s1=?class || ?o1=?class)  
          }
        `;
        return { sparql };
    }
    deleteClassModelAndData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = ` DELETE
        {
            ?s ?p ?o.
            ?instance rdf:type ?oldClass.
            ?instance ?p ?o.
        }
        WHERE
        {
            {
            bind (${cls} as ?s)
            ?s ?p ?o.  
            }
            union
            {
            bind (${cls} as ?oldClass)
            ?instance rdf:type ?oldClass .
            ?instance ?p ?o.  
            filter(!isBlank(?instance))    
            }      
        }
        `;
        return { sparql };
    }
    deleteClassReferenceModelAndData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = ` delete {  
            ?s ?p ?o.
            ?s1 ?prop ?name.
              }
          where
          {
              {
              bind (${cls} as ?s)
              ?s ?p ?o.  
              }    
          union
             {
              ?class rdfs:subClassOf ?restr .
              ?restr owl:onProperty ?prop .
              ?restr ( owl:onClass | owl:onDataRange
                  | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ${cls}.
             ?restr rdf:type ?type.
             bind(?restr as ?o)
               ?s ?p ?o.
             filter(?s=?class && ?type=owl:Restriction )
              {}
          }
          }
        `;
        return { sparql };
    }
    deleteClass(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = `
    delete
      {  
        ?s ?p ?o.
        ?instance rdf:type ?oldClass .
        ?instance ?p ?o.
        ?s1 ?prop ?name.
        ?s1 rdfs:range ?range.
      }
    where
        {
        {}
        union
        {
            {
            bind (${cls} as ?s)
            ?s ?p ?o.  
            }
            union
            {
            bind (${cls} as ?oldClass)
            ?instance rdf:type ?oldClass .
            ?instance ?p ?o.  
            filter(!isBlank(?instance))    
            }      
        }
        union
           {
            ?class rdfs:subClassOf ?restr .
            ?restr owl:onProperty ?prop .
            ?restr ( owl:onClass | owl:onDataRange
                | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ${cls} .
           ?restr rdf:type ?type.
           bind(?restr as ?o)
             ?s ?p ?o.
           filter(?s=?class && ?type=owl:Restriction )
            {}
            union{
            ?s1 ?p1 ?o1.
            {
             ?s1 ?prop ?name.
            }
             filter(?s1=?class || ?o1=?class)  
            }
            union
                {
                    ?s1 a owl:ObjectProperty.
                    ?s1 rdfs:range ?range.
                 }
        }
        }
        `;
        return { sparql };
    }
    addLabel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let lang = args.lang || 'en';
        let insert = `?cls a owl:Class .`;
        let label = args.label;
        if (label) {
            label = label.replace(/\"/g, '\\"');
            label = '"' + label + '"';
            insert = `${insert}
            ?cls rdfs:label ${label}@${lang}.`;
        }
        let sparql = `insert
        {
            ${insert}
        }
        where
        {
            bind(${cls} as ?cls)
        }
        `;
        return { sparql };
    }
    addComment(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let lang = args.lang || 'en';
        let insert = `?cls a owl:Class .`;
        let comment = args.comment;
        if (comment) {
            comment = comment.replace(/\"/g, '\\"');
            comment = '"' + comment + '"';
            insert = `${insert}
            ?cls rdfs:comment ${comment}@${lang}.`;
        }
        let sparql = `insert
        {
            ${insert}
        }
        where
        {
            bind(${cls} as ?cls)
        }
        `;
        return { sparql };
    }
    changeLabel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let labelValue = args.oldLabel;
        let labelWhere = `?cls rdfs:label ?label.`;
        if (labelValue) {
            labelValue = labelValue.replace(/\"/g, '\\"');
            labelValue = '"' + labelValue + '"';
            labelWhere = `${labelWhere}
            filter(str(?label) = ${labelValue} )`;
        }
        let lang = args.lang || 'en';
        let insert = `?cls a owl:Class .`;
        let label = args.label;
        label = label.replace(/\"/g, '\\"');
        label = '"' + label + '"';
        if (label) {
            insert = `${insert}
            ?cls rdfs:label ${label}@${lang}.`;
        }
        let sparql = `
        delete
        {
        ?cls rdfs:label ?label.
        }
        insert
        {
            ${insert}
        }
        where
        {
            bind(${cls} as ?cls)
            optional {${labelWhere}}
        }
        `;
        return { sparql };
    }
    changeComment(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let commentValue = args.oldComment;
        let commentWhere = `?cls rdfs:comment ?comment.`;
        if (commentValue) {
            commentValue = commentValue.replace(/\"/g, '\\"');
            commentValue = '"' + commentValue + '"';
            commentWhere = `${commentWhere}
            filter(str(?comment) = ${commentValue} )`;
        }
        let insert = `?cls a owl:Class .`;
        let lang = args.lang || 'en';
        let comment = args.comment;
        if (comment) {
            comment = comment.replace(/\"/g, '\\"');
            comment = '"' + comment + '"';
            insert = `${insert}
            ?cls rdfs:comment ${comment}@${lang}.`;
        }
        let sparql = ` delete
        {
         ?cls rdfs:comment ?comment.
        }
        insert
        {
            ${insert}
        }
        where
        {
            bind(${cls} as ?cls)
            optional {${commentWhere}}
        }
        `;
        return { sparql };
    }
    deleteLabel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let labelValue = args.label;
        let label = `?cls rdfs:label ?label.`;
        if (labelValue) {
            labelValue = labelValue.replace(/\"/g, '\\"');
            labelValue = '"' + labelValue + '"';
            label = `${label}
            filter(str(?label) = "${labelValue}" )`;
        }
        let sparql = `
        delete
        {
        ?cls rdfs:label ?label.
        }
        where
        {
            bind(${cls} as ?cls)
            ${label}
        }
        `;
        return { sparql };
    }
    deleteComment(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let commentValue = args.comment;
        let comment = `?cls rdfs:comment ?comment.`;
        if (commentValue) {
            commentValue = commentValue.replace(/\"/g, '\\"');
            commentValue = '"' + commentValue + '"';
            comment = `${comment}
            filter(str(?comment) = ${commentValue})`;
        }
        let sparql = ` delete
        {
            ?cls rdfs:comment ?comment.        }
        where
        {
            bind(${cls} as ?cls)
            ${comment}
        }
        `;
        return { sparql };
    }
    createClassAndAddRestriction(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let restriction = args.restriction;
        let parent = args.parent;
        let insert = `?cls a owl:Class .`;
        let label = args.label;
        let comment = args.comment;
        if (label) {
            insert = `${insert}
            ?cls rdfs:label "${label}".`;
        }
        if (comment) {
            insert = `${insert}
            ?cls rdfs:comment "${comment}".`;
        }
        if (parent) {
            parent = this.prefixManager.fullToPrefixedIRI(parent);
            insert = `${insert}
            ?cls rdfs:subClassOf ${parent}.`;
        }
        for (const key of restriction) {
            let prop = this.prefixManager.fullToPrefixedIRI(key.prop);
            let property = this.evaluateRestrictionType(key);
            insert = `${insert}
            ?cls rdfs:subClassOf [
                rdf:type owl:Restriction;
                owl:onProperty ${prop};
                ${property}
            ].`;
        }
        let sparql = `insert
        {
            ${insert}
        }
        where
        {
            bind(${cls} as ?cls)
        }
        `;
        return { sparql };
    }
    deleteClassSpecificRestriction(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let restriction = args.restriction;
        let instance = `union {
            ?s1 ?p1 ?o1.
            {`;
        let del = `?s ?p ?o.`;
        let where = `{
     {
        ?s ?p ?o
        {}`;
        for (const key of restriction) {
            let prop = this.prefixManager.fullToPrefixedIRI(key.prop);
            let property = this.evaluateRestrictionType(key);
            let propertyName = this.removeIRI(key.prop);
            if (key.instanceDeletion) {
                let pro = `?s1 ${prop} ?${propertyName}.`;
                instance = `${instance}
                ${pro}`;
                del = `${del}
                ${pro}`;
            }
            if (property) {
                where = `${where}
                union
                {
                    ?o rdf:type ?type.
                    ?o owl:onProperty ${prop};
                    ${property}
                }`;
            } else {
                where = `${where}
                union
                {
                    ?o rdf:type ?type.
                    ?o owl:onProperty ${prop}.
                }`;
            }
        }

        let sparql = `
    delete {
    ${del}
    }
    where
        ${where}
    filter(?s=${cls} && ?type=owl:Restriction )
        }
          ${instance}
    }
    filter(?s1=${cls} || ?o1=${cls} )
    }
}
        `;
        return { sparql };
    }

    updateClassRestriction(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let restriction = args.restriction;
        let insert = `?cls a owl:Class .`;
        let del = `?s ?p ?o.`;
        let where = `{
        ?s ?p ?o
        {}`;
        for (const key of restriction) {
            let prop = this.prefixManager.fullToPrefixedIRI(key.prop);
            let property;
            if (key.previousRestriction) {
                property = this.evaluateRestrictionType(
                    key.previousRestriction
                );
            }
            if (key.updateRestriction) {
                let updateProperty = this.evaluateRestrictionType(
                    key.updateRestriction
                );
                insert = `${insert}
                ?cls rdfs:subClassOf [
                    rdf:type owl:Restriction;
                    owl:onProperty ${prop};
                    ${updateProperty}
                ].`;
            }
            if (property) {
                where = `${where}
                union
                {
                    ?o rdf:type ?type.
                    ?o owl:onProperty ${prop};
                    ${property}
                }`;
            } else {
                where = `${where}
                union
                {
                    ?o rdf:type ?type.
                    ?o owl:onProperty ${prop}.
                }`;
            }
        }

        let sparql = `
    delete {
    ${del}
    }
    insert
    {
        ${insert}
    }
    where
        ${where}
    filter(?s=${cls} && ?type=owl:Restriction )
    bind(${cls} as ?cls)
}
        `;
        return { sparql };
    }
    getParentClass(cls) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        let sparql = ` select ?parentClass
        where{
         ${iri} sesame:directSubClassOf     ?parentClass.
     filter(!isBlank(?parentClass))
            }`;
        return { sparql };
    }
    deleteParentRelation(cls) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        let sparql = ` delete
        where
        {
              ?env enf:hasParent ${iri}.
        }`;
        return { sparql };
    }
    getSpecificClassDetail(args) {
        args = args || {};
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let sparql = `select ?name  ?value
        where {
            ?class a owl:Class.
    {
       optional{ ?class rdfs:label ?label.
       bind(?label as ?value)  
       bind("label" as ?name)  
       bind(lang(?label) as ?labelLanguage)}  
    }
    union
    {
     optional{ ?class rdfs:comment ?comment.
     bind(?comment as ?value)  
       bind("comment" as ?name)  
        bind(lang(?comment) as ?commentLanguage)}  
    }
    union
    {
        bind(?class as ?value)  
       bind("cls" as ?name)  
    }
             filter(?class= ${cls} && !isBlank(?class))
        }
        `;
        return { sparql };
    }
    getClasses(args) {
        args = args || {};
        let where = `  ?class a owl:Class.
optional{ ?class rdfs:label ?label.}
        optional{?class sesame:directSubClassOf ?superClass.
        filter(!isBlank(?superClass))}
        filter(!isBlank(?class))`;
        if (args.prefix) {
            let prefix = args.prefix;
            where = ` ${where}
            filter(regEx(str(?class), "${prefix}", "i"))`;
        }
        let sparql = `select ?class  ?superClass ?label
        where {
            ${where}
        }
        order by ?class`;
        return { sparql };
    }
    getAllSubClasses(args) {
        args = args || {};
        let cls = this.prefixManager.fullToPrefixedIRI(args.parent);
        let where = `  ?class a owl:Class.
optional{ ?class rdfs:label ?label.}
        optional{?class sesame:directSubClassOf ?superClass.
        filter(!isBlank(?superClass))}
        filter(?superClass = ${cls} && !isBlank(?class))`;
        if (args.prefix) {
            let prefix = args.prefix;
            where = ` ${where}
            filter(regEx(str(?class), "${prefix}", "i"))`;
        }
        let sparql = `select ?class  ?superClass ?label
        where {
            ${where}
        }
        order by ?class`;
        return { sparql };
    }
    changeClassIRI(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let newIRI = this.prefixManager.fullToPrefixedIRI(args.newIRI);
        let sparql = `DELETE {?s ?p1 ?o} INSERT {?s ?p2 ?o} WHERE
        {
        ?s ?p1 ?o .
        FILTER (strstarts(str(?p1), str(${cls})))
        BIND (IRI(replace(str(?p1), str(${cls}), str(${newIRI})))  AS ?p2)
        };
        DELETE {?s1 ?p ?o} INSERT {?s2 ?p ?o} WHERE
        {
        ?s1 ?p ?o .
        FILTER (strstarts(str(?s1), str(${cls})))
        BIND (IRI(replace(str(?s1), str(${cls}), str(${newIRI})))  AS ?s2)
        };
        DELETE {?s ?p ?o1} INSERT {?s ?p ?o2} WHERE
        {
        ?s ?p ?o1 .
        FILTER (strstarts(str(?o1), str(${cls})) && isIRI(?o1))
        BIND (IRI(replace(str(?o1), str(${cls}), str(${newIRI})))  AS ?o2)
        };
        delete { ?instance rdf:type ?type} where {
            ?instance rdf:type ?class.
            ?instance rdf:type ?type
            filter(?class=${newIRI} && isBlank(?type))
        }; `;
        return { sparql };
    }

    getAllProperties() {
        let sparql = `select
        distinct ?val ?name
    where {
        ?val a ?prop.
        filter(?prop=owl:DatatypeProperty || ?prop=owl:ObjectProperty)
        optional{ bind(strafter(str(?val),"#") as ?name).}
}`;

        return { sparql };
    }

    calculateCost(args) {
        let iri = this.prefixManager.fullToPrefixedIRI(args.iri);
        let sparql = `select distinct ?truckIRI  ?truckNumber   ?TimeTaken ?totalCost
        where
          {
            ?truckIRI rdf:type + ent:Truck .
          {
            optional {?truckIRI ent:averageSpeed ?averageSpeed}.
            optional {?truckIRI ent:costPerHour ?costPerHour }.
            optional {?truckIRI ent:costPerkm ?costPerkm }.
            optional {?truckIRI ent:truckNumber ?truckNumber }.
          {
            ?order rdf:type + ent:Order .
          {
            bind(str(?order) as ?Orderiri) .
            optional {?order ent:staus ?orderStatus }.
            ?order ent:hasRoutes  ?route.
            ?route rdf:type + ent:Route.
            bind(?route as ?routeIri)
            optional{?route  ent:distance ?routeDistance.}
            optional{bind(?routeDistance/?averageSpeed  as ?TimeTaken)}
            optional{bind(?routeDistance*?costPerkm  as ?totalCostPerKM)}
            optional{bind(?TimeTaken*?costPerHour  as ?totalCostPerHour)}
            optional{bind(?totalCostPerKM+?totalCostPerHour  as ?totalCost)}
            filter(?order=${iri})                  
            }
           }
          }
        } order by ?totalCost`;
        return { sparql };
    }
}

module.exports = {
    Generator
};
