// Enapso SPARQL Tools - Module SPARQL generator
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Authors: Alexander Schulze and Muhammad Yasir
//const { count } = require('console');
const { v4: uuidv4 } = require('uuid');

// SPARQL query and update command generator
class Generator {
    constructor(args) {
        args = args || {};
        this.prefixManager = args.prefixManager;
        this.GraphDBURL = args.GraphDB_URL_Repo;
    }

    setPrefixManager(prefixManager) {
        this.prefixManager = prefixManager;
    }

    // retrieve all classes from the graph database
    getAllClasses(graph) {
        graph = this.findGraph(graph);
        let sparql = `select ?class ?superClass
where {
    ${graph.graphStatement}
?class a owl:Class .
filter( !isBlank(?class) )
optional {
?class rdfs:subClassOf ?superClass .
?superClass a ?sctype .
filter(?sctype = owl:Class && !isBlank(?superClass))
}
${graph.graphFilter}
${graph.graphClosingBracket}
}
order by ?class
`;
        return { sparql };
    }

    // retrieve all properties from a given class
    getClassProperties(cls, graph) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        graph = this.findGraph(graph);
        let sparql = `select
?prop ?type ?range ?domain
?only ?some ?min ?max ?exactly ?value
where {
    ${graph.graphStatement}
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
optional { ?restr (owl:minQualifiedCardinality | owl:minCardinality) ?min } .
optional { ?restr owl:qualifiedCardinality ?exactly } .
    optional { ?restr (owl:maxQualifiedCardinality | owl:maxCardinality) ?max } .
    optional { ?restr owl:hasValue ?value } .
    ${graph.graphFilter}
    ${graph.graphClosingBracket}
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
    getSingleClassProperties(cls, graph) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        graph = this.findGraph(graph);
        let sparql = `select distinct
        ?prop ?type ?range ?domain
        ?only ?some ?min ?max ?exactly ?value
    where {
        ${graph.graphStatement}
	{
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
        optional { ?restr (owl:minQualifiedCardinality | owl:minCardinality) ?min } .
        optional { ?restr owl:qualifiedCardinality ?exactly } .
        optional { ?restr (owl:maxQualifiedCardinality | owl:maxCardinality) ?max } .
        optional { ?restr owl:hasValue ?value } .
		}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
    }`;

        return { sparql };
    }

    getClassAllRestrictions(cls, graph) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        graph = this.findGraph(graph);
        let sparql = `select
        ?propertyType ?property ?restrict ?cardinality ?type
    where {
        ${graph.graphStatement}
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
            optional { ?restr (owl:minQualifiedCardinality | owl:minCardinality) ?cardinality
        bind("min" as ?restrict)} .
            optional { ?restr owl:qualifiedCardinality ?cardinality
        bind("exactly" as ?restrict)} .
            optional { ?restr (owl:maxQualifiedCardinality | owl:maxCardinality) ?cardinality
        bind("max" as ?restrict)} .
            optional { ?restr owl:hasValue ?res
        bind("value" as ?restrict)} . 
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
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
    findGraph(graph, option) {
        let graphStatement = '';
        let graphFilter = '';
        let graphClosingBracket = '';
        if (graph) {
            graphFilter = `filter(?graph=<${graph}> && ?graph!=<http://www.openrdf.org/schema/sesame#nil>) `;
            graphClosingBracket = `}`;
            graphStatement = `Graph ?graph {`;
        }
        if (graph && option == 'cud') {
            graphStatement = `Graph <${graph}> {`;
        }
        return { graphStatement, graphClosingBracket, graphFilter };
    }
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
        let graph = this.findGraph(args.graph);
        let limit = args.limit === undefined ? 0 : args.limit;
        let joins = args.joins;
        let filterProp = args.filterProp;
        let cls = args.cls;
        let checkRelation = [];
        let propArray = false;
        this.orderByArray = [];
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
                if (!fields.includes(` ${prop.getName()} `)) {
                    if (prop.getName() == 'sortOrder') {
                        this.orderByArray.push(prop.getName());
                    }
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
        let filtePropWhere = '';
        let clsStr = args.prefixPredicates
            ? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
            : this.prefixManager.getSparqlIRI(cls.getIRI());
        //generte the query part of parent class
        var parentClassPart = ``;
        for (let prop of cls.getProperties()) {
            //  console.log(prop);
            let propStr = this.prefixManager.fullToPrefixedIRI(prop.getIRI());
            propArray = checkRelation.includes(prop.getIRI());
            if (propArray == false) {
                if (!parentClassPart.includes(propStr)) {
                    if (filterProp == prop.getName()) {
                        filtePropWhere = `?ind ${propStr} ?${prop.getName()}`;
                    }
                    parentClassPart = `${parentClassPart}
    optional {?ind ${propStr} ?${prop.getName()} }.`;
                }
            }
        }
        parentClassPart = `${parentClassPart}
    bind(str(?ind) as ?iri)    
    bind ("${cls.getName()}" as ?contentKey ).
   }`;
        let where = `?ind sesame:directType ${clsStr} .${iriFilterStr}
        ${filtePropWhere}`;
        if (fieldFilterStr.length > 0) {
            where = `${where}
${fieldFilterStr}`;
        }
        if (joins) {
            if (joins.length) {
                let parentPart = '';
                var relationData = this.getAllRelation(joins, cls);
                for (let i = 0; i < relationData.result.length; i++) {
                    parentPart = `${parentPart} ${relationData.result[i].parent}`;
                    if (relationData.result[i].child) {
                        let child = ``;
                        relationData.result[i].child.forEach(
                            (element) => (child = `${child} ${element}`)
                        );
                        parentPart = `${parentPart} 
                      ${child}`;
                    } else {
                        parentPart = `${parentPart}`;
                    }
                }
                parentClassPart = `${parentClassPart}
                ${parentPart}`;
                // console.log(parentClassPart);
                fields = ` ?contentKey ?contentRelation ?parentIRI ${fields} ${relationData.fields}`;
                fields = fields.replace(undefined, ' ');
                // this.count = 0;
                // this.findAndCount(joins);
            }
        }
        let orderby = this.findOrderByField(this.orderByArray);
        var sparql = `select distinct ${fields}
where
  {
      ${graph.graphStatement}
${where}
{
    ${parentClassPart}  
}
${graph.graphFilter}
${graph.graphClosingBracket}
`;
        if (offset) {
            sparql = `${sparql}\noffset ${offset}`;
        }
        if (limit) {
            sparql = `${sparql}\nlimit ${limit}`;
        }
        if (orderby) {
            sparql = `${sparql}order by ${orderby}`;
        }
        // return the generated SPARQL
        return { sparql };
    }
    findOrderByField(array) {
        let order = '';
        for (const item of array) {
            order = `${order} ?${item}`;
        }
        return order;
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
                if (!fields.includes(` ${prop.getName()} `)) {
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
        let where = `?ind sesame:directType  ${clsStr} .${iriFilterStr}`;
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
                            if (prop.getName() == 'sortOrder') {
                                this.orderByArray.push(
                                    this.toLowerCase(cls.getName()) +
                                        this.toUpperCase(prop.getName())
                                );
                            }
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
                )} sesame:directType ${this.prefixManager.fullToPrefixedIRI(
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
                            if (prop.getName() == 'sortOrder') {
                                this.orderByArray.push(
                                    this.toLowerCase(cls.getName()) +
                                        this.toUpperCase(prop.getName())
                                );
                            }
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
    )} sesame:directType ${this.prefixManager.fullToPrefixedIRI(cls.getIRI())} .
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
                result.push({
                    parent: res1.firstLevelChildDetail[i],
                    child: res.second
                    //    bracket: this.count + 1
                });
                if (res.field) {
                    fields = res.field.join(' ');
                }
            } else {
                result.push({
                    parent: `${res1.firstLevelChildDetail[i]}`
                });
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
                    element.cls.getName(),
                    fieldArray,
                    childArray,
                    element.cls.getName()
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

    SubChildJoin(child, parent, field, childDetails, parentRefer) {
        let prefixPredicates = true;
        let subChild = childDetails;
        let subFields = field;
        var checkRelation = [];
        var propArray = false;
        for (let i = 0; i < child.length; i++) {
            let cls = child[i].cls.getName();
            // check the relation type
            //var str = 'Class1123';
            let dummyParent = parent;
            var res = parent.replace(/\D/g, '');
            let count = 1;
            if (res.length) {
                let res1 = parent.replace(res, '');
                dummyParent = res1;
                count = count + res.length;
            }
            if (dummyParent == cls) {
                for (let i = 0; i < count; i++) {
                    cls = `${cls}1`;
                }
            }
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
                            if (prop.getName() == 'sortOrder') {
                                this.orderByArray.push(
                                    this.toLowerCase(cls) +
                                        this.toUpperCase(prop.getName())
                                );
                            }
                            fields +=
                                ' ?' +
                                this.toLowerCase(cls) +
                                this.toUpperCase(prop.getName());
                        }
                    }
                }
                if (!subFields.includes(` ${fields} `)) {
                    subFields.push(fields);
                }
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                let propertyRelation = this.splitProperty(propIRI);

                var childDe = `          
?${this.toLowerCase(cls)} ${propIRI}  ?${this.toLowerCase(parent.getName())}.
   ?${this.toLowerCase(
       cls
   )} sesame:directType ${this.prefixManager.fullToPrefixedIRI(
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
                //    if (!subChild.includes(childDe)) {
                subChild.push(childDe);
                //  }
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
                let fields =
                    '?' + this.toLowerCase(child[i].cls.getName()) + 'Iri';
                for (let prop of child[i].cls.getProperties()) {
                    propArray = checkRelation.includes(prop.getIRI());
                    if (!propArray) {
                        if (
                            !fields.includes(
                                ' ?' +
                                    this.toLowerCase(child[i].cls.getName()) +
                                    this.toUpperCase(prop.getName())
                            )
                        ) {
                            if (prop.getName() == 'sortOrder') {
                                this.orderByArray.push(
                                    this.toLowerCase(child[i].cls.getName()) +
                                        this.toUpperCase(prop.getName())
                                );
                            }
                            fields +=
                                ' ?' +
                                this.toLowerCase(child[i].cls.getName()) +
                                this.toUpperCase(prop.getName());
                        }
                    }
                }
                if (!subFields.includes(` ${fields} `)) {
                    subFields.push(fields);
                }
                // todo: add relation prefix properties
                let propIRI = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(relation)
                    : this.prefixManager.getSparqlIRI(relation);
                let propertyRelation = this.splitProperty(propIRI);
                var childDe = `
   
    ?${this.toLowerCase(parent)}  ${propIRI} ?${this.toLowerCase(cls)}.
                ?${this.toLowerCase(
                    cls
                )} sesame:directType ${this.prefixManager.fullToPrefixedIRI(
                    child[i].cls.getIRI()
                )} .          
    {
    bind(?${this.toLowerCase(cls)} as ?${this.toLowerCase(
                    child[i].cls.getName()
                )}Iri)`;

                for (let prop of child[i].cls.getProperties()) {
                    let propStr = prefixPredicates
                        ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                        : this.prefixManager.getSparqlIRI(prop.getIRI());
                    propArray = checkRelation.includes(prop.getIRI());
                    if (propArray == false) {
                        if (!childDe.includes(propStr)) {
                            childDe = `${childDe}
    optional{?${this.toLowerCase(cls)}  ${propStr} ?${this.toLowerCase(
                                child[i].cls.getName()
                            )}${this.toUpperCase(prop.getName())}.}`;
                        }
                    }
                }
                childDe = `${childDe}
    bind( "${parentRefer}.${child[i].cls.getName()}" as ?contentKey)
    bind( "${propertyRelation}" as ?contentRelation)
    bind( ?${this.toLowerCase(parent)} as ?parentIRI)
    }`;
                // if (parent.getName() == clsName) {
                //     cls = clsName;
                // }
                let skipBracket = [child[i]].filter(
                    (element) => element.cls.getName() == child[i].cls.getName()
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
                //   if (!subChild.includes(childDe)) {
                subChild.push(childDe);
                // }
            }
            if (child[i].joins) {
                //child, parent, field, childDetails
                let parent1 = child[i].cls.getName();
                if (`${parent}1` == cls) {
                    parent1 = cls;
                }
                this.SubChildJoin(
                    child[i].joins,
                    parent1,
                    subFields,
                    subChild,
                    child[i].cls.getName()
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
        let graph = this.findGraph(args.graph, 'cud');
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
                    if (typeof val == 'string') {
                        val = val.replace(/\"/g, '\\"');
                    }
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
            ${graph.graphStatement}
${fields}
${graph.graphClosingBracket}
} where {
    ${graph.graphStatement}
bind( <${iri}> as ?iri )
${graph.graphClosingBracket}
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
        let graph = this.findGraph(args.graph, 'cud');
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
                    if (typeof val == 'string') {
                        val = val.replace(/\"/g, '\\"');
                    }
                    //  val = val.replace(/\"/g, '\\"');
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
${graph.graphStatement}            
${values}
${graph.graphClosingBracket}

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
        let graph = this.findGraph(args.graph, 'cud');
        // get the iri of indivudal which wanna delete
        let iri = args.iri;
        let cls = args.cls;
        let clsStatement='';
        if(cls)
        {
            let classIRI = prefixPredicates
            ? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
            : this.prefixManager.getSparqlIRI(cls.getIRI());

            clsStatement=`?s rdf:type ${classIRI}.`
        }
        //  let iri = this.prefixManager.fullToPrefixedIRI(iri1);
        var where = `bind(<${iri}> as ?master).
    {
bind(?master as ?s)
${clsStatement}
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
${graph.graphStatement}
${where}
filter(!isBlank(?o))
${graph.graphClosingBracket}
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
        if (!item.includes('#')) {
            return item ? item.split('/').pop() : null;
        } else {
            return item ? item.split('#').pop() : null;
        }
    }

    /*
 SPARQL example:
 insert data {
 <http://ont.comsats.edu/fyp#Customer_SchulzeAlexander> <http://ont.comsats.edu/fyp#hasOrderline> <http://ont.comsats.edu/fyp#SABS_ORDERLINE_01>
 }
 */

    // add a relation between two individuals
    createRelation(master, property, child, graph) {
        // adjust subject, predicate and object
        master = this.prefixManager.getSparqlIRI(master);
        property = this.prefixManager.getSparqlIRI(property);
        child = this.prefixManager.getSparqlIRI(child);
        let namedGraph = graph;
        graph = this.findGraph(graph);
        if (namedGraph) {
            graph.graphStatement = `GRAPH <${namedGraph}> {`;
        }
        let sparql = `insert data {
            ${graph.graphStatement}
    ${master} ${property} ${child}
    ${graph.graphClosingBracket}
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
    deleteRelation(master, property, child, graph) {
        // adjust subject, predicate and object
        master = this.prefixManager.getSparqlIRI(master);
        property = this.prefixManager.getSparqlIRI(property);
        child = this.prefixManager.getSparqlIRI(child);
        graph = this.findGraph(graph);
        let sparql = `delete data {
            ${graph.graphStatement}
    ${master} ${property} ${child}
    ${graph.graphClosingBracket}
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
            newIRI || this.prefixManager.getDefaultNamespace() + '_' + uuidv4();
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
        let graph = this.findGraph(args.graph);
        if (!cls) {
            throw 'No classs passed';
        } else if (!property) {
            throw 'No Property passed';
        }
        let sparql = `delete where
{
${graph.graphStatement}
  ?${cls} a ${this.prefixManager.fullToPrefixedIRI(cls)}.
           ?${cls} ${this.prefixManager.fullToPrefixedIRI(
            property
        )} ?${cls}${property}.
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
        }`;
        return { sparql };
    }

    deleteLabelOfEachClassIndividual(args) {
        args = args || {};
        let cls = args.cls;
        let labelLanguage = args.labelLanguage;
        let graph = this.findGraph(args.graph);
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
    ${graph.graphStatement}
${where}
${graph.graphFilter}
${graph.graphClosingBracket}
    }`;
        return { sparql };
    }

    copyLabelToDataPropertyOfEachIndividual(args) {
        args = args || {};
        let cls = args.cls;
        let graph = this.findGraph(args.graph);
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
      ${graph.graphStatement}
      ?${cls} ${this.prefixManager.fullToPrefixedIRI(property)} ?label.
      ${graph.graphClosingBracket}
  }
where
  {
      ${graph.graphStatement}
    ${where}
    ${graph.graphFilter}
    ${graph.graphClosingBracket}
  }`;
        return { sparql };
    }
    copyDataPropertyToLabelOfEachIndividual(args) {
        args = args || {};
        let cls = args.cls;
        let labelLanguage = args.labelLanguage;
        let graph = this.findGraph(args.graph);
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
      ${graph.graphStatement}
    ?${cls} rdfs:label ?label.
    ${graph.graphClosingBracket}
  }
where
  {
      ${graph.graphStatement}
${where}
${graph.graphFilter}
${graph.graphClosingBracket}
  }`;
        return { sparql };
    }
    getIRIClassName(arg) {
        let iri = this.prefixManager.fullToPrefixedIRI(arg);
        let graph = this.findGraph(args.graph);
        let sparql = `select ?type  where {
            ${graph.graphStatement}
            ${iri} sesame:directType ?type .
                filter(!isBlank(?type) && ?type!=owl:NamedIndividual)
                ${graph.graphFilter}
                ${graph.graphClosingBracket}
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
            optional { ?restr (owl:minQualifiedCardinality | owl:minCardinality) ?min } .
            optional { ?restr owl:qualifiedCardinality ?exactly } .
            optional { ?restr (owl:maxQualifiedCardinality | owl:maxCardinality) ?max } .
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
            optional { ?restr (owl:minQualifiedCardinality | owl:minCardinality) ?min } .
            optional { ?restr owl:qualifiedCardinality ?exactly } .
            optional { ?restr (owl:maxQualifiedCardinality | owl:maxCardinality) ?max } .
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
            // if (key.value.includes('#') && !key.value.includes('XMLSchema')) {
            //     property = this.prefixManager.fullToPrefixedIRI(key.value);
            //     property = `owl:hasValue ${property}`;
            // } else {
            property = `owl:hasValue "${key.value}"`;
            // }
        }
        return property;
    }
    deleteClassModel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let sparql = ` DELETE
        {
            ${graph.graphStatement}
            ?s ?p ?o.
            ${graph.graphClosingBracket}
        }
        WHERE
        {
            ${graph.graphStatement}
            {
            bind (${cls} as ?s)
            ?s ?p ?o.  
            }
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    deleteClassData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let sparql = ` DELETE
        {
            ${graph.graphStatement}
            ?instance rdf:type ?class.
            ?instance ?p ?o.
            ${graph.graphClosingBracket}
        }
        WHERE
        {
            ${graph.graphStatement}
            {
            bind (${cls} as ?class)
            ?instance rdf:type ?class .
            ?instance ?p ?o.  
            filter(!isBlank(?instance))    
            }      
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    deleteClassReferenceModel(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let sparql = ` delete {  
            ${graph.graphStatement}
            ?s ?p ?o.
            ?s1 rdfs:range ?range.
            ${graph.graphClosingBracket}
              }
          where
          {
              ${graph.graphStatement}
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
             ${graph.graphFilter}
             ${graph.graphClosingBracket}
          }
        `;
        return { sparql };
    }
    deleteClassReferenceData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let sparql = ` delete {  
            ${graph.graphStatement}
            ?s1 ?prop ?name.
            ${graph.graphClosingBracket}
              }
          where
          {
              ${graph.graphStatement}
              ?class rdfs:subClassOf ?restr .
              ?restr owl:onProperty ?prop .
              ?restr ( owl:onClass | owl:onDataRange
                  | owl:someValuesFrom | owl:allValuesFrom |owl:hasValue ) ${cls} .
              ?s1 ?p1 ?o1.
              {
               ?s1 ?prop ?name.
              }
               filter(?s1=?class || ?o1=?class)  
               ${graph.graphFilter}
               ${graph.graphClosingBracket}
            }
        `;
        return { sparql };
    }
    deleteClassModelAndData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let sparql = ` DELETE
        {
            ${graph.graphStatement}
            ?s ?p ?o.
            ?instance rdf:type ?oldClass.
            ?instance ?p ?o.
            ${graph.graphClosingBracket}
        }
        WHERE
        {
            ${graph.graphStatement}
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
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    deleteClassReferenceModelAndData(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let sparql = ` delete {  
            ${graph.graphStatement}
            ?s ?p ?o.
            ?s1 ?prop ?name.
            ${graph.graphClosingBracket}
              }
          where
          {
              ${graph.graphStatement}
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
          ${graph.graphFilter}
          ${graph.graphClosingBracket}
          }
        `;
        return { sparql };
    }
    deleteClass(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let parentPart = '';
        let parent1 = '';
        let parent2 = '';
        let parent3 = '';
        if (args.parent) {
            let parent = this.prefixManager.fullToPrefixedIRI(args.parent);
            parentPart = `?oldClass rdfs:subClassOf ${parent}.`;
            parent1 = `?s rdfs:subClassOf ${parent}.`;
            parent2 = `?s1 rdfs:subClassOf ${parent}.`;
            parent3 = `?o1 rdfs:subClassOf ${parent}.`;
        }
        let sparql = `
    delete
      {  
        ${graph.graphStatement}  
        ?s ?p ?o.
        ?instance rdf:type ?oldClass.
        ?instance ?p ?o.
        ?s1 ?prop ?name.
        ?s1 rdfs:range ?range.
        ${graph.graphClosingBracket}
      }
    where
        {
            ${graph.graphStatement}
        {}
        union
        {
            {
            bind (${cls} as ?s)
            ${parent1}
            ?s ?p ?o.  
            }
            union
            {
            bind (${cls} as ?oldClass)
            ?instance rdf:type ?oldClass .
            ${parentPart}
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
             ${parent1}
           filter(?s=?class && ?type=owl:Restriction )
            {}
            union{
            ?s1 ?p1 ?o1.
            ${parent2}
            ${parent3}
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
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    addLabel(args) {
        let name = this.prefixManager.fullToPrefixedIRI(args.name);
        let graph = this.findGraph(args.graph);
        let lang = args.lang || 'en';
        let insert = ``;
        let label = args.label;
        if (label) {
            label = label.replace(/\"/g, '\\"');
            label = '"' + label + '"';
            insert = `${insert}
            ?cls rdfs:label ${label}@${lang}.`;
        }
        let sparql = `insert
        {
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${name} as ?cls)
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    addComment(args) {
        let name = this.prefixManager.fullToPrefixedIRI(args.name);
        let graph = this.findGraph(args.graph);
        let lang = args.lang || 'en';
        let insert = ``;
        let comment = args.comment;
        if (comment) {
            comment = comment.replace(/\"/g, '\\"');
            comment = '"' + comment + '"';
            insert = `${insert}
            ?name rdfs:comment ${comment}@${lang}.`;
        }
        let sparql = `insert
        {
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${name} as ?name)
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    changeLabel(args) {
        let name = this.prefixManager.fullToPrefixedIRI(args.name);
        let graph = this.findGraph(args.graph);
        let labelValue = args.oldLabel;
        let labelWhere = `?name rdfs:label ?label.`;
        if (labelValue) {
            labelValue = labelValue.replace(/\"/g, '\\"');
            labelValue = '"' + labelValue + '"';
            labelWhere = `${labelWhere}
            filter(str(?label) = ${labelValue} )`;
        }
        let lang = args.lang || 'en';
        let insert = ``;
        let label = args.label;
        label = label.replace(/\"/g, '\\"');
        label = '"' + label + '"';
        if (label) {
            insert = `${insert}
            ?name rdfs:label ${label}@${lang}.`;
        }
        let sparql = `
        delete
        {
            ${graph.graphStatement}
        ?name rdfs:label ?label.
        ${graph.graphClosingBracket}
        }
        insert
        {
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${name} as ?name)
            optional {${labelWhere}}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    changeComment(args) {
        let name = this.prefixManager.fullToPrefixedIRI(args.name);
        let graph = this.findGraph(args.graph);
        let commentValue = args.oldComment;
        let commentWhere = `?name rdfs:comment ?comment.`;
        if (commentValue) {
            commentValue = commentValue.replace(/\"/g, '\\"');
            commentValue = '"' + commentValue + '"';
            commentWhere = `${commentWhere}
            filter(str(?comment) = ${commentValue} )`;
        }
        let insert = ``;
        let lang = args.lang || 'en';
        let comment = args.comment;
        if (comment) {
            comment = comment.replace(/\"/g, '\\"');
            comment = '"' + comment + '"';
            insert = `${insert}
            ?name rdfs:comment ${comment}@${lang}.`;
        }
        let sparql = ` delete
        {
            ${graph.graphStatement}
         ?name rdfs:comment ?comment.
         ${graph.graphClosingBracket}
        }
        insert
        {
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${name} as ?name)
            optional {${commentWhere}}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    deleteLabel(args) {
        let name = this.prefixManager.fullToPrefixedIRI(args.name);
        let graph = this.findGraph(args.graph);
        let labelValue = args.label;
        let label = `?name rdfs:label ?label.`;
        if (labelValue) {
            labelValue = labelValue.replace(/\"/g, '\\"');
            labelValue = '"' + labelValue + '"';
            label = `${label}
            filter(str(?label) = ${labelValue} )`;
        }
        let sparql = `
        delete
        {
            ${graph.graphStatement}
        ?name rdfs:label ?label.
        ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${name} as ?name)
            ${label}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    deleteComment(args) {
        let name = this.prefixManager.fullToPrefixedIRI(args.name);
        let graph = this.findGraph(args.graph);
        let commentValue = args.comment;
        let comment = `?name rdfs:comment ?comment.`;
        if (commentValue) {
            commentValue = commentValue.replace(/\"/g, '\\"');
            commentValue = '"' + commentValue + '"';
            comment = `${comment}
            filter(str(?comment) = ${commentValue})`;
        }
        let sparql = ` delete
        {
            ${graph.graphStatement}
            ?name rdfs:comment ?comment.
            ${graph.graphClosingBracket}        
        }
        where
        {
            ${graph.graphStatement}
            bind(${name} as ?name)
            ${comment}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    addClassRestrictions(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let restriction = args.restriction;
        let insert = ``;
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
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${cls} as ?cls)
            ?cls a owl:Class .
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        // console.log(sparql);
        return { sparql };
    }
    createClassAndAddRestriction(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
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
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${cls} as ?cls)
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        // console.log(sparql);
        return { sparql };
    }
    deleteClassSpecificRestriction(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let graph = this.findGraph(args.graph);
        let restriction = args.restriction;
        let instance = `union {
            ?s1 ?p1 ?o1.
            {`;
        let del = `?s ?p ?o.`;
        let where = `
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
        ${graph.graphStatement}
    ${del}
    ${graph.graphClosingBracket}
    }
    where
    {
        ${graph.graphStatement}
        ${where}
    filter(?s=${cls} && ?type=owl:Restriction )
        }
          ${instance}
    }
    filter(?s1=${cls} || ?o1=${cls} )
    }
    ${graph.graphFilter}
    ${graph.graphClosingBracket}
}
        `;
        return { sparql };
    }

    updateClassRestriction(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let restriction = args.restriction;
        let graph = this.findGraph(args.graph);
        let insert = `?cls a owl:Class .`;
        let del = `?s ?p ?o.`;
        let where = `
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
        ${graph.graphStatement}
    ${del}
    ${graph.graphClosingBracket}
    }
    insert
    {
        ${graph.graphStatement}
        ${insert}
        ${graph.graphClosingBracket}
    }
    where
    {
        ${graph.graphStatement}
        ${where}
    filter(?s=${cls} && ?type=owl:Restriction )
    bind(${cls} as ?cls)
    ${graph.graphFilter}
    ${graph.graphClosingBracket}
}
        `;
        return { sparql };
    }
    getParentClass(cls, graph) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        graph = this.findGraph(graph);
        let sparql = ` select ?parentClass
        where{
            ${graph.graphStatement}
         ${iri} sesame:directSubClassOf     ?parentClass.
     filter(!isBlank(?parentClass))
     ${graph.graphFilter}
     ${graph.graphClosingBracket}
            }`;
        return { sparql };
    }
    deleteParentRelation(cls, graph) {
        let iri = this.prefixManager.fullToPrefixedIRI(cls);
        graph = this.findGraph(graph);

        let sparql = ` delete
        where
        {
            ${graph.graphStatement}
              ?env enf:hasParent ${iri}.
              ${graph.graphFilter}
              ${graph.graphClosingBracket}
        }`;
        return { sparql };
    }
    getSpecificClassDetail(args) {
        args = args || {};
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let annotation =
            args.annotation || 'http://www.w3.org/2000/01/rdf-schema#comment';
        let lang = args.lang;
        let labelFilter = ``;
        let commentFilter = ``;
        let graph = this.findGraph(args.graph);
        if (lang) {
            labelFilter = `filter(?labelLanguage="${lang}")`;
            commentFilter = `filter(?commentLanguage="${lang}")`;
        }
        let sparql = `select ?name  ?value
        where {
        ${graph.graphStatement}
            ?class a ?type.
    {
       optional{ ?class rdfs:label ?label.
       bind(?label as ?value)  
       bind("label" as ?name)  
       bind(lang(?label) as ?labelLanguage)
       ${labelFilter}}  
       
    }
    union
    {
     optional{ ?class <${annotation}> ?comment.
     bind(?comment as ?value)  
     bind("comment" as ?name)  
     bind(lang(?comment) as ?commentLanguage)
     ${commentFilter}}  
        
    }
    union
    {
        bind(?class as ?value)  
       bind("cls" as ?name)  
    }
             filter(?class= ${cls} && !isBlank(?class))
             ${graph.graphFilter}
             ${graph.graphClosingBracket}
        }
        `;
        return { sparql };
    }
    getClasses(args) {
        args = args || {};
        let graph = this.findGraph(args.graph);
        let lang = args.lang;
        let langFilter = ``;
        if (lang) {
            langFilter = `filter(?lang="en")`;
        }
        let where = `  ?class a owl:Class.
optional{ ?class rdfs:label ?label.
           bind(lang(?label) as ?lang) }
        optional{?class sesame:directSubClassOf ?superClass.
        filter(!isBlank(?superClass) && ?superClass!=owl:Thing)}
        filter(!isBlank(?class))`;
        if (args.prefix) {
            let prefix = args.prefix;
            where = ` ${where}
            filter(regEx(str(?class), "${prefix}", "i"))`;
        }
        let sparql = `select ?class ?superClass ?label ?lang
        where {
            ${graph.graphStatement}
            ${where}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        order by ?class`;
        return { sparql };
    }
    getAllSubClasses(args) {
        args = args || {};
        let graph = this.findGraph(args.graph);
        let cls = this.prefixManager.fullToPrefixedIRI(args.parent);
        let where = `  ?class a owl:Class.
optional{ ?class rdfs:label ?label.}
optional{ ?class rdfs:comment ?comment.}
          ?class sesame:directSubClassOf ?superClass.
        filter(!isBlank(?superClass) && ?superClass!=owl:Thing)
        filter(?superClass = ${cls} && !isBlank(?class))`;
        if (args.prefix) {
            let prefix = args.prefix;
            where = ` ${where}
            filter(regEx(str(?class), "${prefix}", "i"))`;
        }
        let sparql = `select ?class  ?superClass ?label ?comment
        where {
            ${graph.graphStatement}
            ${where}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        order by ?class`;
        console.log(sparql);
        return { sparql };
    }
    getEquivalentClasses(args) {
        args = args || {};
        let graph = this.findGraph(args.graph);
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let where = `  ?class a owl:Class.
optional{ ?class rdfs:label ?label.}
optional{ ?class rdfs:comment ?comment.}
          ?class owl:equivalentClass ?equivalentClass.
        filter(!isBlank(?equivalentClass) && ?equivalentClass!=owl:Thing)
        filter(?equivalentClass = ${cls} && !isBlank(?class) && ?equivalentClass!=?class)`;
        if (args.prefix) {
            let prefix = args.prefix;
            where = ` ${where}
            filter(regEx(str(?class), "${prefix}", "i"))`;
        }
        let sparql = `select ?class ?label ?comment ?equivalentClass
        where {
            ${graph.graphStatement}
            ${where}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        order by ?equivalentClass`;
        return { sparql };
    }
    getAllNestedSubClasses(args) {
        args = args || {};
        let graph = this.findGraph(args.graph);
        let cls = this.prefixManager.fullToPrefixedIRI(args.parent);

        let where = ` 
 ?class a owl:Class.
optional{ ?class rdfs:label ?label.}
optional{ ?class rdfs:comment ?comment.}
optional{ ?class sesame:directSubClassOf ?parentClass.}
        ?class rdfs:subClassOf ?superClass.
     filter(!isBlank(?parentClass))
       filter(?superClass = ${cls} && !isBlank(?class))`;

        if (args.prefix) {
            let prefix = args.prefix;
            where = ` ${where}
            filter(regEx(str(?class), "${prefix}", "i"))`;
        }
        let sparql = `select ?class  ?parentClass ?superClass ?label ?comment
        where {
            ${graph.graphStatement}
            ${where}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        order by ?class`;
        //console.log(sparql);
        return { sparql };
    }
    changeClassIRI(args) {
        let cls = this.prefixManager.fullToPrefixedIRI(args.cls);
        let newIRI = this.prefixManager.fullToPrefixedIRI(args.newIRI);
        let graph = this.findGraph(args.graph);
        let parentPart = '';
        let parent1 = '';
        let parent2 = '';
        let parent3 = '';
        if (args.parent) {
            let parent = this.prefixManager.fullToPrefixedIRI(args.parent);
            parentPart = `?p1 rdfs:subClassOf ${parent}.`;
            parent1 = `?s1 rdfs:subClassOf ${parent}.`;
            parent2 = `?o1 rdfs:subClassOf ${parent}.`;
            parent3 = `?type rdfs:subClassOf ${parent}.`;
        }
        let sparql = `DELETE {
            ${graph.graphStatement}
            ?s ?p1 ?o
            ${graph.graphClosingBracket}
        } INSERT {
            ${graph.graphStatement}
            ?s ?p2 ?o
            ${graph.graphClosingBracket}
        } WHERE
        {
            ${graph.graphStatement}
        ?s ?p1 ?o .
        ${parentPart}
        FILTER (strstarts(str(?p1), str(${cls})))
        BIND (IRI(replace(str(?p1), str(${cls}), str(${newIRI})))  AS ?p2)
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
        };
        DELETE {
            ${graph.graphStatement}
            ?s1 ?p ?o
            ${graph.graphClosingBracket}
        } INSERT {
                ${graph.graphStatement}
                ?s2 ?p ?o
                ${graph.graphClosingBracket}
            } WHERE
        {
            ${graph.graphStatement}
        ?s1 ?p ?o .
        ${parent1}
        FILTER (strstarts(str(?s1), str(${cls})))
        BIND (IRI(replace(str(?s1), str(${cls}), str(${newIRI})))  AS ?s2)
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
        };
        DELETE {
            ${graph.graphStatement}
            ?s ?p ?o1
            ${graph.graphClosingBracket}
        } INSERT {
            ${graph.graphStatement}
            ?s ?p ?o2
            ${graph.graphClosingBracket}
        } WHERE
        {
            ${graph.graphStatement}
        ?s ?p ?o1 .
        ${parent2}
        FILTER (strstarts(str(?o1), str(${cls})) && isIRI(?o1))
        BIND (IRI(replace(str(?o1), str(${cls}), str(${newIRI})))  AS ?o2)
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
        };
        delete {
            ${graph.graphStatement} 
            ?instance rdf:type ?type
            ${graph.graphClosingBracket}
        } where {
            ${graph.graphStatement}
            ?instance rdf:type ?class.
            ?instance rdf:type ?type.
            ${parent3}
            filter(?class=${newIRI} && isBlank(?type))
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }; `;
        return { sparql };
    }

    getAllProperties(graph) {
        graph = this.findGraph(graph);
        let sparql = `select
        distinct ?val ?name
    where {
       ${graph.graphStatement}
        ?val a ?prop.
        filter(?prop=owl:DatatypeProperty || ?prop=owl:ObjectProperty)
        optional{ bind(strafter(str(?val),"#") as ?name).}
        ${graph.graphFilter}
        ${graph.graphClosingBracket}
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
    createProperty(args) {
        let prop = this.prefixManager.fullToPrefixedIRI(args.prop);
        let parent = args.parent;
        let propertyType = args.propertyType;
        let graph = this.findGraph(args.graph);
        let insert = '';
        if (propertyType == 'DataProperty') {
            insert = `?prop a owl:DatatypeProperty .`;
        } else if (propertyType == 'ObjectProperty') {
            insert = `?prop a owl:ObjectProperty .`;
        }
        let label = args.label;
        let comment = args.comment;
        if (label) {
            insert = `${insert}
            ?prop rdfs:label "${label}".`;
        }
        if (comment) {
            insert = `${insert}
            ?prop rdfs:comment "${comment}".`;
        }
        if (parent) {
            parent = this.prefixManager.fullToPrefixedIRI(parent);
            insert = `${insert}
            ?prop rdfs:subPropertyOf ${parent}.`;
        }
        let sparql = `insert
        {
            ${graph.graphStatement}
            ${insert}
            ${graph.graphClosingBracket}
        }
        where
        {
            ${graph.graphStatement}
            bind(${prop} as ?prop)
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        // console.log(sparql);
        return { sparql };
    }
    deleteProperty(args) {
        let prop = this.prefixManager.fullToPrefixedIRI(args.prop);
        let graph = this.findGraph(args.graph);
        let sparql = `delete {
            ${graph.graphStatement}
            ?s ?p ?o.
            ?o1 ?p1 ?restr.
            ?s2 ?p2 ?o2.
            ${graph.graphClosingBracket}
        } 
        where 
        {
            ${graph.graphStatement}
            {
            ?s ?p ?o.
            filter(?s=${prop})       
            }
            union
            {
            ?o1 ?p1 ?restr.
            ?restr owl:onProperty ${prop}.
            }
            union
            {
            ?s2 ?p2 ?o2.
            ?o2 rdfs:subPropertyOf ${prop}.
            }
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        // console.log(sparql);
        return { sparql };
    }
    deletePropertyFromIndividuals(args) {
        let prop = this.prefixManager.fullToPrefixedIRI(args.prop);
        let graph = this.findGraph(args.graph);
        let sparql = `DELETE
        {
            ${graph.graphStatement}
            ?instance ${prop} ?class.
            ${graph.graphClosingBracket}
        }
        WHERE
        {
            ${graph.graphStatement}
            ?instance ${prop} ?class.
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        // console.log(sparql);
        return { sparql };
    }
    deletePropertyFromClassRestrictions(args) {
        let prop = this.prefixManager.fullToPrefixedIRI(args.prop);
        let graph = this.findGraph(args.graph);
        let sparql = `delete {
            ${graph.graphStatement}
            ?o1 ?p1 ?restr.
            ${graph.graphClosingBracket}
        } 
        where {
            ${graph.graphStatement}
            ?o1 ?p1 ?restr.
            ?restr owl:onProperty ${prop}.
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }
        `;
        // console.log(sparql);
        return { sparql };
    }
    getObjectProperties(args) {
        args = args || {};
        let prop = args.prop;
        let graph = this.findGraph(args.graph);
        let filter = '';
        if (prop) {
            prop = this.prefixManager.fullToPrefixedIRI(prop);
            filter = `?prop=${prop} && `;
        }
        let sparql = `select ?prop  ?label ?comment
        where {
        ${graph.graphStatement}
            ?prop a owl:ObjectProperty.
                optional{
                    ?prop rdfs:label ?label.
                    bind(lang(?label) as ?labelLanguage)
                }  
                optional{
                    ?prop rdfs:comment ?comment.
                    bind(lang(?comment) as ?commentLanguage)
                }  
            filter(${filter}!isBlank(?prop))
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }`;
        return { sparql };
    }
    getDataProperties(args) {
        args = args || {};
        let prop = args.prop;
        let graph = this.findGraph(args.graph);
        let filter = '';
        if (prop) {
            prop = this.prefixManager.fullToPrefixedIRI(prop);
            filter = `?prop=${prop} && `;
        }
        let sparql = `select ?prop  ?label ?comment
        where {
            ${graph.graphStatement}
            ?prop a owl:DatatypeProperty.
                optional{
                    ?prop rdfs:label ?label.
                    bind(lang(?label) as ?labelLanguage)
                }  
                optional{
                    ?prop rdfs:comment ?comment.
                    bind(lang(?comment) as ?commentLanguage)
                }  
            filter(${filter}!isBlank(?prop))
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }`;
        return { sparql };
    }
    changePropertyIRI(args) {
        args = args || {};
        let prop = this.prefixManager.fullToPrefixedIRI(args.prop);
        let newIRI = this.prefixManager.fullToPrefixedIRI(args.newIRI);
        let graph = this.findGraph(args.graph);
        let sparql = `delete {
            ${graph.graphStatement}
            ${prop} ?p1 ?o1 .
            ?s2 ${prop} ?o2.
            ?s3 ?p2 ${prop}.
            ${graph.graphClosingBracket}
        }
        insert {
            ${graph.graphStatement}
            ${newIRI} ?p1 ?o1 .
            ?s2 ${newIRI} ?o2.
            ?s3 ?p2 ${newIRI}.
            ${graph.graphClosingBracket}
        }
        WHERE
        {
            ${graph.graphStatement}
            optional{${prop} ?p1 ?o1 .} 
            optional {?s2 ${prop} ?o2.}
            optional {?s3 ?p2 ${prop}.}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        };
        delete{
            ${graph.graphStatement}
            ${prop} ?p ?o.
            ?s ?p1 ${prop}
            ${graph.graphClosingBracket} 
        }
        where
        {
            ${graph.graphStatement}
            optional{${prop} ?p ?o.}  
            optional {?s ?p1 ${prop}}
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }`;
        return { sparql };
    }
    // retrieve all properties from a given class
    getClassPropertiesByDomain(cls, graph) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        graph = this.findGraph(graph);
        let sparql = `SELECT ?prop ?domain ?range ?type WHERE {
            ${graph.graphStatement}
                values(?type) {
                    (owl:DatatypeProperty)
                    (owl:ObjectProperty)
                }
                bind(${iri} as ?domain)
              ?prop rdf:type ?type .
              {
                ?prop rdfs:domain ?domain.
                ?prop rdfs:range ?range.
                filter(!isBlank(?domain) && !isBlank(?range))
            }
            union       
            {
                ?prop rdfs:domain ?rf.
                ?rf owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?domain .
                ?prop rdfs:range ?range.
                filter(!isBlank(?range)) 
            }
            union
            {
                values(?type) {
                    (owl:DatatypeProperty)
                    (owl:ObjectProperty)
                }
                ?prop rdfs:domain ?domain.
                ?prop rdfs:range ?r .
                ?r owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?range  .
                filter(!isBlank(?domain))   
            }
            union
            {
                ?prop rdfs:domain ?rf.
                ?rf owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?domain .
                ?prop rdfs:range ?r .
                ?r owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?range  .
            }
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
            }`;
        return { sparql };
    }
    getClassPropertiesByDomainAndRestrictions(cls, graph) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        graph = this.findGraph(graph);
        let sparql = `select distinct
        ?prop ?type ?range ?domain
        ?only ?some ?min ?max ?exactly ?value
    where {
    ${graph.graphStatement}
	{
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
        optional { ?restr (owl:minQualifiedCardinality | owl:minCardinality) ?min } .
        optional { ?restr owl:qualifiedCardinality ?exactly } .
        optional { ?restr (owl:maxQualifiedCardinality | owl:maxCardinality) ?max } .
        optional { ?restr owl:hasValue ?value } .
		}
            union
            {
                values(?type) {
                    (owl:DatatypeProperty)
                    (owl:ObjectProperty)
                }
                bind(${iri} as ?domain)
                ?prop rdf:type ?type .
                {
                    ?prop rdfs:domain ?domain.
                    ?prop rdfs:range ?range.
                    filter(!isBlank(?domain) && !isBlank(?range))
                }
                union       
                {
                    ?prop rdfs:domain ?rf.
                    ?rf owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?domain .
                    ?prop rdfs:range ?range.
                    filter(!isBlank(?range)) 
                }
                union
                {
                    values(?type) {
                        (owl:DatatypeProperty)
                        (owl:ObjectProperty)
                    }
                    ?prop rdfs:domain ?domain.
                    ?prop rdfs:range ?r .
                    ?r owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?range  .
                    filter(!isBlank(?domain))   
                }
                union
                {
                    ?prop rdfs:domain ?rf.
                    ?rf owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?domain .
                    ?prop rdfs:range ?r .
                    ?r owl:unionOf/rdf:rest*/rdf:first |owl:intersectionOf/rdf:rest*/rdf:first |owl:complementOf/rdf:rest*/rdf:first ?range  .
                }
            }
            union
            {
                bind(${iri} as ?domain)
                ?domain sh:property ?propertyShape.
                ?propertyShape sh:path ?prop .
                ?propertyShape ( sh:class | sh:datatype) ?range .
                ?prop a ?type .
                        filter( ?type = owl:DatatypeProperty
                            || ?type = owl:ObjectProperty ) .
                optional {
                    ?propertyShape sh:minCount ?min
                }
                optional{
                    ?propertyShape sh:maxCount ?max
                }
                filter(!isBlank(?prop))
            }
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
    }`;
        return { sparql };
    }
    bampRDFToOWL(args) {
        let sourceGraph =
            args.sourceGraph || 'http://rdf4j.org/schema/rdf4j#nil';
        let destinationGraph = args.destinationGraph;
        let sourceRepository = args.sourceReposiotry || this.GraphDBURL;
        let sparql = '';
        if (destinationGraph) {
            sparql = `insert {
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?class a owl:Class.
                    ?class rdfs:subClassOf ?superClass.
                    ?class ?p ?o.
                    ?s1 ?p1 ?class.
                    ?s1 ?p2 ?o2
                }
            }
            where {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        {
                            # ?class a rdfs:Class.
                            ?class ?p ?o.
                            ?s1 ?p1 ?class.
                            ?s1 ?p2 ?o2
                        }
                        union
                        {
                            #?class a rdfs:class.
                            ?class rdfs:subClassOf ?superClass.
                            ?class ?p ?o.
                        } 
                    }
                }
            };
            delete
            {
                GRAPH<${destinationGraph}>{
                    ?s rdf:type mmm:Attribute.
                    ?s ?p ?o.
                }
            }
            where
            {
               # SERVICE <${sourceRepository}> {
                    GRAPH <${destinationGraph}>
                    {
                        ?s rdf:type mmm:Attribute.
                        ?s ?p ?o.
                    }
            #    }
            };
            # making all individual of attribute class as subclasses of Attribute
            insert {
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?clsName a owl:Class.
                    ?clsName rdfs:subClassOf mmm:Attribute.
                    mmm:hasAttributes a owl:ObjectProperty.
                    #?prop a owl:ObjectProperty.
                    mmm:hasAttributes rdfs:label "has Attributes".
                    #?prop rdfs:domain ?domain.
                    ?clsName mmm:range ?propRange.
                    ?domain rdfs:subClassOf [
                        rdf:type owl:Restriction;
                        owl:onProperty mmm:hasAttributes;
                        owl:allValuesFrom ?clsName
                    ].
                    ?clsName rdfs:label ?label.
                    ?clsName rdfs:comment ?comment.
                }
            }
            WHERE  
            {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        ?s ?p mmm:Attribute.
                        bind(strafter(str(?s),"#") as ?range).
                        bind(strbefore(str(?s),"#") as ?prefix).
                        BIND(CONCAT(UCASE(SUBSTR(?range, 1, 1)), SUBSTR(?range, 2)) as ?Caprange)
                        bind(IRI(concat(?prefix,'#',?Caprange)) as ?clsName) 
                     #   bind(IRI(concat(?prefix,'#has',?Caprange)) as ?prop) 
                      #  bind(concat('has',?Caprange) as ?propLabel)
                        optional{
                            ?s rdfs:domain ?domain.
                        }
                        optional{
                            ?s rdfs:range ?propRange.
                        }
                        bind(?clsName as ?label)
                        optional{
                            ?s rdfs:comment ?comment
                        }
                    }
                }
            };
            # creating object property by checking the range if it is a class it become a object property
            delete
            {
                ?s a rdf:Property   
            }
            insert{
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?s a owl:ObjectProperty.
                    ?s ?p ?o.
                }
            }
            WHERE {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        # ?s ?p rdf:Property.
                        ?s rdf:type rdf:Property.
                        ?s ?p ?o.
                        ?s rdfs:range ?range.
                        FILTER ( !regex(str(?range),"http://www.w3.org/2001/XMLSchema#","i"))
                    }
                }
            };
            # creating data property by checking the range if it is a xsd or built datatype it become a data property
            delete
            {
                ?s a rdf:Property   
            }
            insert{
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?s a owl:DatatypeProperty.
                    ?s ?p ?o.
                }
            }
            WHERE {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        #   ?s ?p rdf:Property.
                        ?s rdf:type rdf:Property.
                        ?s ?p ?o.
                        ?s rdfs:range ?range.
                        FILTER (regex(str(?range),"http://www.w3.org/2001/XMLSchema#","i"))
                    }
                }
            }`;
        }
        return { sparql };
    }
    bampOWLToRDF(args) {
        let sourceGraph =
            args.sourceGraph || 'http://rdf4j.org/schema/rdf4j#nil';
        let destinationGraph = args.destinationGraph;
        let sourceRepository = args.sourceReposiotry || this.GraphDBURL;
        let sparql = '';
        if (destinationGraph) {
            sparql = `insert {
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?class rdfs:subClassOf ?superClass.
                    ?class ?p ?o.
                    ?s1 ?p1 ?class.
                    ?s1 ?p2 ?o2
                }
            }
            where {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        {
                            ?class a rdfs:Class.
                            optional{
                                ?class rdfs:subClassOf ?superClass.
                            }              
                            ?class ?p ?o.
                            ?s1 ?p1 ?class.
                            ?s1 ?p2 ?o2
                            filter(?superClass!=mmm:Attribute && !isBlank(?superClass) && !isBlank(?o) && ?o2!=mmm:Attribute && !isBlank(?o2)&& !isBlank(?s1))
                        }
                        union
                        {
                            ?class rdfs:subClassOf ?superClass.
                            ?class ?p ?o.
                            optional{
                                ?s1 ?p1 ?class.
                            }
                            optional{
                                ?s1 ?p2 ?o2
                            }
                            filter(?superClass!=mmm:Attribute && !isBlank(?superClass) && !isBlank(?o) && ?o2!=mmm:Attribute && !isBlank(?o2)&& !isBlank(?s1))
                        } 
                    }
                }
            };
            delete
            {
                graph<${destinationGraph}>{
                    ?s rdfs:subClassOf mmm:Attribute.
                    ?s a owl:Class.
                    ?s mmm:range ?range.
                    # ?s ?p ?o.
                    #   ?s rdfs:comment ?comment.
                }
            }
            where
            {
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        ?s rdfs:subClassOf mmm:Attribute.
                        ?s a owl:Class.
                        optional{?s mmm:range ?range.}  
                        #  ?s ?p ?o.
                        #  ?s rdfs:comment ?comment.
                    }
                }   
            };
            delete
            {
                graph<${destinationGraph}>
                {
                    ?s a owl:DatatypeProperty.
                    ?s a owl:ObjectProperty   
                }
            }
            insert{
                GRAPH <${destinationGraph}> 
                {
                    ?s a rdf:Property.
                    ?s ?p ?o.
                }
            }
            WHERE {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        ?s ?p ?o.
                        ?s rdfs:range ?range.
                    }
                }
            };
            insert {
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?indName a mmm:Attribute.
                    ?indName ?p ?o.
                    ?indName rdfs:label ?Caprange.
                    ?indName rdfs:range ?clsRange
                }
            }
            WHERE  
            {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        ?s rdfs:subClassOf mmm:Attribute.
                        bind(strafter(str(?s),"#") as ?range).
                        bind(strbefore(str(?s),"#") as ?prefix).
                        BIND(CONCAT(LCASE(SUBSTR(?range, 1, 1)), SUBSTR(?range, 2)) as ?Caprange)
                        bind(IRI(concat(?prefix,'#',?Caprange)) as ?indName) 
                        ?s ?p ?o.
                        optional{?s mmm:range ?clsRange.}  
                        filter(?p!=rdfs:subClassOf && ?o!=owl:Class && ?s!=?o)
                    }
                }
            };
            insert
            {
                GRAPH <${destinationGraph}> 
                {
                    ?indName rdfs:domain ?class.
                    #?range rdfs:range ?propRange.
                }
            }
            where
            {
                SERVICE <${sourceRepository}> {
                    GRAPH <${sourceGraph}> 
                    {
                        ?class rdfs:subClassOf ?restr.
                        ?restr owl:onProperty ?prop.
                        optional{
                            ?prop mmm:range ?propRange.
                        }
                        optional{
                            ?prop a ?type.
                        }
                        filter( ?type = owl:DatatypeProperty
                            || ?type = owl:ObjectProperty ) .
                        ?restr owl:allValuesFrom  ?s .
                        bind(strafter(str(?s),"#") as ?range).
                        bind(strbefore(str(?s),"#") as ?prefix).
                        BIND(CONCAT(LCASE(SUBSTR(?range, 1, 1)), SUBSTR(?range, 2)) as ?Caprange)
                        bind(IRI(concat(?prefix,'#',?Caprange)) as ?indName) 
                    }
                }  
            };
            delete {
                GRAPH <${destinationGraph}> 
                {
                    ?s mmm:range ?o .
                }
            } where {
                GRAPH <${destinationGraph}> 
                {
                    ?s mmm:range ?o .
                }
            };
            delete
            {
                graph<${destinationGraph}>{
                    ?s ?p owl:Class.
                }
            }
            insert{
                # save the triples in that specific graph
                GRAPH <${destinationGraph}> 
                {
                    ?s ?p rdfs:Class.
                }
            }
            WHERE {
                # save the triples in that specific repository of GraphDB
                SERVICE <${sourceRepository}> {
                    GRAPH <${destinationGraph}> 
                    {
                        ?s ?p owl:Class.
                    }
                }
            };
            delete
            {
                GRAPH <${destinationGraph}> 
                {
                    ?s ?p owl:ObjectProperty
                }
            }where {
                # save the triples in that specific repository of GraphDB
                GRAPH <${destinationGraph}> 
                {
                    ?s ?p owl:ObjectProperty
                }
            }`;
        }
        return { sparql };
    }
    // retrieve all properties from a given class
    getClassPropertiesFromPropertyShape(cls, graph) {
        let iri = this.prefixManager.getSparqlIRI(cls);
        graph = this.findGraph(graph);
        let sparql = `select ?domain ?prop ?type ?range ?min ?max where {
            ${graph.graphStatement}
            bind(${iri} as ?domain)
            ?domain sh:property ?propertyShape.
            ?propertyShape sh:path ?prop .
            ?prop a ?type .
            filter( ?type = owl:DatatypeProperty
                || ?type = owl:ObjectProperty ) .
            ?propertyShape ( sh:class | sh:datatype) ?range .
            optional {
                ?propertyShape sh:minCount ?min
            }
            optional{
                ?propertyShape sh:maxCount ?max
            }
            filter(!isBlank(?prop))
            ${graph.graphFilter}
            ${graph.graphClosingBracket}
        }`;
        return { sparql };
    }
    updateMultipleRelation(iri, prop, newValues) {
        let values = [];
        let sparql = '';
        let insert = '';
        let propName = this.removeIRI(prop);
        if (!Array.isArray(newValues)) {
            values.push(newValues);
        } else {
            values = newValues;
        }
        for (const item of values) {
            if (item.includes('http://')) {
                insert = `${insert}
                <${iri}> <${prop}> <${item}>.`;
            } else {
                insert = `${insert}
                <${iri}> <${prop}> "${item}".`;
            }
        }
        sparql = `delete
        {
            <${iri}> <${prop}> ?${propName}   
        }
        insert
        {
            ${insert}
        }
        where
        {
            optional{<${iri}> <${prop}> ?${propName}}
        }`;
        return { sparql };
    }

    // create a new instance of a certain (in-memory-)class in the graph
    createIndividualByClassTemplate(args) {
        let prefixPredicates = true;
        args = args || {};
        let cls = args.cls;
        let graph = this.findGraph(args.graph, 'cud');
        let options = args.options || {};
        let ind = args.ind || {};
        let baseiri = args.baseiri;
        // if an IRI is provided use that one, if not generate an UUID
        if (!baseiri) {
            var iri =
                ind.iri ||
                this.prefixManager.getDefaultNamespace() + cls.getName() + '_';
        } else {
            var iri = baseiri + cls.getName();
        }

        // todo: add options argument prefixClass
        let classIRI = prefixPredicates
            ? this.prefixManager.fullToPrefixedIRI(cls.getIRI())
            : this.prefixManager.getSparqlIRI(cls.getIRI());
        // let fields = `?iri rdf:type owl:NamedIndividual .`;
        let fields = `?iri rdf:type ${classIRI} .`;
        let variable = [];
        for (let prop of cls.getProperties()) {
            // get the name of the property
            let name = prop.getName();
            variable.push(name);
            // find the value in the passed individual
            let val = `${'${' + name + '}'}`;
            // if a value is set
            if (undefined != val) {
                // todo: add options argument prefixProperties
                let propIRI = options.prefixProperties
                    ? this.prefixManager.fullToPrefixedIRI(prop.getIRI())
                    : this.prefixManager.getSparqlIRI(prop.getIRI());
                if (!fields.includes(propIRI)) {
                    fields = `${fields}
                    \${'${val}' !== '' ? \`?iri ${propIRI} ${val}.\` : ''}`;
                }
            }
        }
        // accomplish the sparql insert command
        let sparql = `insert {
            ${graph.graphStatement}
${fields}
${graph.graphClosingBracket}
} where {
    ${graph.graphStatement}
    \${'${'${iri}'}' !== '' ? \` bind(${'${iri}'} as ?iri)\` : \` bind(iri(concat('${iri}', struuid())) as ?iri)\`}
${graph.graphClosingBracket}
}`;
        return { sparql, variable };
    }

    updateIndividualByClassTemplate(args) {
        let fields = '';
        let conditions = '';
        let values = '';
        let cls = args.cls;
        let variable = [];
        let graph = this.findGraph(args.graph, 'cud');
        let prefixPredicates = true;
        for (let prop of cls.getProperties()) {
            // get the name of the property
            let name = prop.getName();
            variable.push(name);
            // find the value in the passed individual
            let val = `${'${' + name + '}'}`;
            // if a value is set
            if (undefined != val) {
                let predicateIRI = prop.getIRI();
                let predicateStr = prefixPredicates
                    ? this.prefixManager.fullToPrefixedIRI(predicateIRI)
                    : this.prefixManager.getSparqlIRI(predicateIRI);
                if (!fields.includes(predicateStr)) {
                    const triple = `?iri ${predicateStr} ?${prop.getName()}`;
                    fields = `${fields}\n\${'${val}' !== '' ? \`${triple} .\` : ''}`;
                    conditions = `${conditions}\n  \${'${val}' !== '' ? \`optional { ${triple} } .\` : ''}`;
                }
                if (!values.includes(predicateStr)) {
                    values = `${values}
                    \${'${val}' !== '' ? \`?iri ${predicateStr} ${val}.\` : ''}`;
                }
            }
        }
        let sparql = `delete {
${fields}
} insert
{
${graph.graphStatement}            
${values}
${graph.graphClosingBracket}

} where
{
${conditions}
filter(?iri=${'${iri}'})
}`;
        return { sparql, variable };
    }
}

module.exports = {
    Generator
};
