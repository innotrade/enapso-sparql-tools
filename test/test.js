// Innotrade Enapso GraphDB Client - Automated Test Suite
// (C) Copyright 2019-2020 Innotrade GmbH, Herzogenrath, NRW, Germany
// Author: Alexander Schulze and Muhammad Yasir

const chai = require("chai"),
	chaiHttp = require("chai-http");
const should = require("chai").should;
const expect = require("chai").expect;
chai.use(chaiHttp);
const testconfig = require("./config");
const NS_AUTH = "http://ont.enapso.com/repo#";
describe("SPARQL Tool Test Suites", () => {


	it("Create an Individual of a Class ", async () => {
		this.classCache = await testconfig.AUTH.buildClassCache();
		this.Tenant = this.classCache.getClassByIRI(NS_AUTH + "Tenant");
		let baseiri = "http://ont.enapso.com/repo#";
		let ind = [
			{
				"name": "Test Company"
			}
		];
		testconfig.AUTH.createIndividualByClass({ cls: this.Tenant, baseiri: baseiri, ind: ind }).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
		});
	});
	it("Update Individual of a Class ", (done) => {
		this.Tenant = this.classCache.getClassByIRI(NS_AUTH + "Tenant");
		let iri = "http://ont.enapso.com/repo#Tenant_e7e124a2_3a7b_4333_8f51_5f70d48f0bfe";
		let ind = [
			{
				"name": "Test"
			}
		];
		testconfig.AUTH.updateIndividualByClass(this.Tenant, iri, ind).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});
	it("Get Individual of a class without join", async () => {
		this.Tenant = this.classCache.getClassByIRI(NS_AUTH + "Tenant");
		await testconfig.AUTH.showAllIndividuals({
			cls: this.Tenant
		}).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
		});
	});

	it("Get Individual of a class with single join have master2childRelation", async () => {
		this.classCache = await testconfig.AUTH.buildClassCache();
		this.Tenant = this.classCache.getClassByIRI(NS_AUTH + "Tenant");
		this.Environment = this.classCache.getClassByIRI(NS_AUTH + "Environment");
		let joins = [
			// first join (for tenants) on level 1
			{
				cls: this.Environment,
				child2MasterRelation: "hasTenant",
			},
		];

		await testconfig.AUTH.showAllIndividuals({
			cls: this.Tenant,
			joins: joins
		}).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
		});
	});

	it("Get Individual of a class with join using master to child relation", async () => {
		this.classCache = await testconfig.AUTH.buildClassCache();
		this.Host = this.classCache.getClassByIRI(NS_AUTH + "Host");
		this.Environment = this.classCache.getClassByIRI(NS_AUTH + "Environment");
		this.DatabaseSystem = this.classCache.getClassByIRI(NS_AUTH + "DatabaseSystem");
		let joins = [
			// first join (for tenants) on level 1
			{
				cls: this.DatabaseSystem,
				master2childRelation: "hasDatabaseSystem",
			},
			{
				cls: this.Environment,
				master2childRelation: "hasEnvironment",
			},
		];

		await testconfig.AUTH.showAllIndividuals({
			cls: this.Host,
			joins: joins
		}).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
		});
	});


	it("Get Individual of a class with nested joins have master2childRelation", async () => {
		this.classCache = await testconfig.AUTH.buildClassCache();
		this.Tenant = this.classCache.getClassByIRI(NS_AUTH + "Tenant");
		this.Environment = this.classCache.getClassByIRI(NS_AUTH + "Environment");
		this.Host = this.classCache.getClassByIRI(NS_AUTH + "Host");
		this.DatabaseInstance = this.classCache.getClassByIRI(NS_AUTH + "DatabaseInstance");
		this.Repository = this.classCache.getClassByIRI(NS_AUTH + "Repository");
		this.Graph = this.classCache.getClassByIRI(NS_AUTH + "Graph");
		let joins = [
			// first join (for tenants) on level 1
			{
				cls: this.Environment,
				child2MasterRelation: "hasTenant",
				joins: [
					{
						cls: this.Host,
						child2MasterRelation: "hasEnvironment",
						joins: [
							{
								cls: this.DatabaseInstance,
								child2MasterRelation: "hasHost",
								joins: [
									{
										cls: this.Repository,
										child2MasterRelation: "hasDatabaseInstance",
										joins: [
											{
												cls: this.Graph,
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
		await testconfig.AUTH.showAllIndividuals({
			cls: this.Tenant,
			joins: joins
		}).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
		});
	});

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
	it("Clone Individual of a Class ", (done) => {
		this.Environment = this.classCache.getClassByIRI(NS_AUTH + "Environment");
		let iri = "http://ont.enapso.com/repo#Environment_14eaf5b6_1704_4f8d_b315_8a8728640b66";
		testconfig.AUTH.cloneIndividual(this.Environment, iri).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});
	it("Create Relation between two Individual", (done) => {
		let master = "http://ont.enapso.com/repo#Tenant_e7e124a2_3a7b_4333_8f51_5f70d48f0bfe";
		let relation = "hasTenant";
		let child = "http://ont.enapso.com/repo#Environment_833a44cc_ec58_4202_b44d_27460ae94e2d";
		testconfig.AUTH.createRelation(master, relation, child).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});

	it("Delete Relation between two Individual", (done) => {
		let master = "http://ont.enapso.com/repo#Tenant_e7e124a2_3a7b_4333_8f51_5f70d48f0bfe";
		let relation = "hasTenant";
		let child = "http://ont.enapso.com/repo#Environment_833a44cc_ec58_4202_b44d_27460ae94e2d";
		testconfig.AUTH.deleteRelation(master, relation, child).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});

	it("Copy Data Property to label of each individual of a Class", (done) => {
		let cls = "Environment";
		let property = "name";
		let language = "en";
		testconfig.AUTH.copyDataPropertyToLabelOfEachIndividual({ cls: cls, labelLanguage: language, dataProperty: property }).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});

	it("Delete given Data Property of each individual of given Class", (done) => {
		let cls = "Environment";
		let property = "name";
		testconfig.AUTH.deletePropertyOfClass({ cls: cls, dataProperty: property }).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});


	it("Copy label of given language to given Data Property of each individual of a given Class", (done) => {
		let cls = "Environment";
		let property = "name";
		let language = "en";
		testconfig.AUTH.copyLabelToDataPropertyOfEachIndividual({ cls: cls, labelLanguage: language, dataProperty: property }).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});

	it("Delete label of given language of each individual of given Class ", (done) => {
		let cls = "Environment";
		let language = "en";
		testconfig.AUTH.deleteLabelOfEachClassIndividual({ cls: cls, labelLanguage: language }).then((result) => {
			console.log("Success: " + result.success);
			expect(result).to.have.property("success", true);
			done();
		});
	});


});
