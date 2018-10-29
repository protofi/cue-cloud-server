import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import ModelImpl, { Models } from './lib/ORM/Models'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import { Roles } from './lib/const';
import { Many2ManyRelation } from './lib/ORM/Relation';

const assert = chai.assert;
const expect = chai.expect;

describe('OFFLINE', () => {

    var test: FeaturesList;
    var adminInitStub: sinon.SinonStub;
    var adminfirestoreStub: sinon.SinonStub;
    var adminFs: FirebaseFirestore.Firestore
    var myFunctions;

    var firestoreMockData: any = {}

    const testUserDataOne = {
        uid: "test-user-1",
        name: "Andy",
        email: "andy@mail.com",
        token: null
    }

    const testUserDataTwo = {
        uid: "test-user-2",
        name: "Benny",
        email: "Benny@mail.com",
        token: null
    }
    
    before(async () => {

        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)


        try {
            admin.initializeApp();
        } catch (e) {}

        adminFs = admin.firestore()

        try {
            adminFs.settings({ timestampsInSnapshots: true })
        } catch (e) {}

        adminInitStub = sinon.stub(admin, 'initializeApp');
        adminfirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return {
                    settings: () => {return null},
                    collection: (col) => {
                        return {
                            doc: (doc) => {
                                return {
                                    set: (data) => {
                                        firestoreMockData[`${col}/${doc}`] = data
                                        return null
                                    },
                                    get: () => {
                                        return firestoreMockData[`${col}/${doc}`]
                                    },
                                    update: (data) => {
                                        firestoreMockData[`${col}/${doc}`] = data
                                        return null
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        myFunctions = require('../lib/index')
    })

    afterEach(async () => {
        test.cleanup()
        adminInitStub.restore()
        adminfirestoreStub.restore()
        firestoreMockData = {}
    })

    describe('Functions', async () => {
        
        describe('Households', async () => {

            it('On Create. User should get an property of role as admin', async () => {
                
                const householdSnap = {
                    data : function() {
                        return { [Models.USER] : { [testUserDataOne.uid] : true } }
                    }
                }

                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                await wrappedHouseholdsOnCreate(householdSnap)

                expect(firestoreMockData['households/undefined'][Models.USER]).to.deep.equal({
                    [testUserDataOne.uid] : {
                        role: Roles.ADMIN
                    }
                })
            })
        })

        describe('Cache.', () => {

            it('Cachable field should be defined on the relation.', async () => {

                class Model1 extends ModelImpl {

                    constructor(_db: any)
                    {
                        super('Model1', _db)
                    }
                
                    modal2(): Many2ManyRelation
                    {
                        const r = this.belongsToMany('Model1')
                        
                        // r.setCache([
                        //     'active'
                        // ])

                        return r
                    }
                }

                class Model2 extends ModelImpl {

                    constructor(_db: any)
                    {
                        super('Model2', _db)
                    }
                
                    modal1(): Many2ManyRelation
                    {
                        const r = this.belongsToMany('Model1')
                        return r
                    }
                }

                // const m1 = new Model1(adminFs)
                // const m2 = new Model2(adminFs)

                // const rel = await m1.modal2().attach(m2)

                // const pivot = await m1.modal2().pivot(await m2.getId())
            
                // pivot.update({
                //     active: true
                // })

                
            })
        })
    })
})