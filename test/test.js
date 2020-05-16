// Innotrade Enapso GraphDB Client - Automated Test Suite
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Author: Alexander Schulze and Muhammad Yasir

const chai = require("chai"),
  chaiHttp = require("chai-http");
const should = require("chai").should;
const expect = require("chai").expect;
chai.use(chaiHttp);
const testconfig = require("./config");
describe("Delete Individual Query test", () => {
  it("A flat object without no joins delete an individual of Graph", (done) => {
    let iri = "enrepo:Graph_0ea87735_977d_461b_88c5_749d1a5bf909";
    testconfig.AUTH.deleteIndividual({ iri: iri }).then((result) => {
      console.log("Success: " + result.success);
      expect(result).to.have.property("success", true);
      done();
    });
  });
  it("A object with only one joins delete an individual of Host has master2childRelation", (done) => {
    let iri = "enrepo:Host_01141633_0716_4ae3_b38b_aa12b2197c4a";
    let joins = [
      // first join (for tenants) on level 1
      {
        cls: "DatabaseSystem",
        master2childRelation: "hasDatabaseSystem",
      },
      {
        cls: "Environment",
        master2childRelation: "hasEnvironment",
      },
    ];
    testconfig.AUTH.deleteIndividual({ iri: iri, joins: joins }).then(
      (result) => {
        console.log("Success: " + result.success);
        expect(result).to.have.property("success", true);
        done();
      }
    );
  });
  it("A object with single nested joins only delete an individual of DatabaseInstance has child2MasterRelation", (done) => {
    let iri = "enrepo:DatabaseInstance_41710204_2620_4483_a31d_963e2075767f";
    let joins = [
      {
        cls: "Repository",
        child2MasterRelation: "hasDatabaseInstance",
        joins: [
          {
            cls: "Graph",
            child2MasterRelation: "hasRepository",
          },
        ],
      },
    ];
    testconfig.AUTH.deleteIndividual({ iri: iri, joins: joins }).then(
      (result) => {
        console.log("Success: " + result.success);
        expect(result).to.have.property("success", true);
        done();
      }
    );
  });
  it("A object with combined joins nesting only delete an individual of DatabaseInstance has child2MasterRelation", (done) => {
    let iri = "enrepo:Tenant_0143e7ee_fbdd_45b3_879f_fedc78e42ab4";
    let joins = [
      // first join (for tenants) on level 1
      {
        cls: "Environment",
        child2MasterRelation: "hasTenant",
        joins: [
          {
            cls: "Host",
            child2MasterRelation: "hasEnvironment",
            joins: [
              {
                cls: "DatabaseInstance",
                child2MasterRelation: "hasHost",
                joins: [
                  {
                    cls: "Repository",
                    child2MasterRelation: "hasDatabaseInstance",
                    joins: [
                      {
                        cls: "Graph",
                        child2MasterRelation: "hasRepository",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    testconfig.AUTH.deleteIndividual({ iri: iri, joins: joins }).then(
      (result) => {
        console.log("Success: " + result.success);
        expect(result).to.have.property("success", true);
        done();
      }
    );
  });
});
