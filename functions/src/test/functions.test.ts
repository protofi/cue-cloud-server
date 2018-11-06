import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { Models } from './lib/ORM/Models'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import { Roles } from './lib/const';

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
    
    beforeEach(async () => {

        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        // try {
        //     admin.initializeApp();
        // } catch (e) {}

        // try {
        //     adminFs.settings({ timestampsInSnapshots: true })
        // } catch (e) {}

        adminInitStub = sinon.stub(admin, 'initializeApp')

        adminfirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return {
                    settings: () => { return null },
                    collection: (col) => {
                        return {
                            doc: (doc) => {
                                return {
                                    set: (data) => {
                                        firestoreMockData[`${col}/${doc}`] = data
                                        return null
                                    },
                                    get: (data) => {
                                        return {
                                            get: () => {
                                                return {
                                                }
                                            }
                                        }
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
        
        // describe('Households', async () => {

        //     it('On Create. Pivot between user and household should recieve a role property of admin', async () => {
                
        //         const householdSnap = {
        //             data : () => {
        //                 return { [Models.USER] : { [testUserDataOne.uid] : true } }
        //             },
        //             get : () => {
        //                 return {}
        //             }
        //         }

        //         const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

        //         await wrappedHouseholdsOnCreate(householdSnap)

        //         expect(firestoreMockData[`${Models.USER}/undefined`][Models.HOUSEHOLD]).to.deep.equal({
        //             pivot : {
        //                 role: Roles.ADMIN
        //             }
        //         })
        //     })
        // })

        // describe('Cache.', () => {

        //     it('The name of the user should be cached on the household collection', async () => {
                
        //         const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)

        //         const householdId = 'household-test-1'
        //         const userId = 'user-test-1'

        //         const change = {
        //             before : {
        //                 data: () => {
        //                     return {
        //                         households: {
        //                             id : householdId
        //                         },
        //                     }
        //                 },
        //             },
        //             after : {
        //                 data: () => {
        //                     return {
        //                         households: {
        //                             id : householdId
        //                         },
        //                         age : 123,
        //                         name: 'Bob',
        //                     }
        //                 },
        //                 get : () => {
        //                     return {}
        //                 },
        //                 ref : {
        //                     update: () => {
        //                         return {}
        //                     },
        //                     id : userId
        //                 }
        //             }
        //         }

        //         await wrappedUsersOnUpdate(change, null)

        //         expect(firestoreMockData[`${Models.HOUSEHOLD}/undefined`]).to.deep.equal({
        //             [`${Models.USER}.${userId}.name`] : 'Bob'
        //         })
        //     })

        //     it('The role of the pivot between a user and a household should be cached on the household collection', async () => {
                
        //         const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)

        //         const householdId = 'household-test-1'
        //         const userId = 'user-test-1'

        //         const change = {
        //             before : {
        //                 data: () => {
        //                     return {
        //                         households: {
        //                             id : householdId
        //                         },
        //                     }
        //                 },
        //             },
        //             after : {
        //                 data: () => {
        //                     return {
        //                         households: {
        //                             id : householdId,
        //                             pivot : {
        //                                 role: Roles.ADMIN
        //                             }
        //                         }
        //                     }
        //                 },
        //                 get : () => {
        //                     return {}
        //                 },
        //                 ref : {
        //                     update: () => {
        //                         return {}
        //                     },
        //                     id : userId
        //                 }
        //             }
        //         }

        //         await wrappedUsersOnUpdate(change, null)

        //         expect(firestoreMockData[`${Models.HOUSEHOLD}/undefined`]).to.deep.equal({
        //             [`${Models.USER}.${userId}.pivot.role`] : Roles.ADMIN
        //         })
        //     })


            // it('Cachable field should be defined on the relation.', async () => {

            //     class Model1 extends ModelImpl {

            //         constructor(_db: any)
            //         {
            //             super('Model1', _db)
            //         }
                
            //         modal2(): Many2ManyRelation
            //         {
            //             const r = this.belongsToMany('Model2')
                        
            //             // r.setCache([
            //             //     'active'
            //             // ])

            //             return r
            //         }
            //     }

            //     class Model2 extends ModelImpl {

            //         constructor(_db: any)
            //         {
            //             super('Model2', _db)
            //         }
                
            //         modal1(): Many2ManyRelation
            //         {
            //             const r = this.belongsToMany('Model1')
            //             return r
            //         }
            //     }

            //     const m1 = new Model1(adminFs)
            //     const m2 = new Model2(adminFs)

            //     const rel = await m1.modal2().attach(m2)

            //     console.log(firestoreMockData)

            //     // const pivot = await m1.modal2().pivot(await m2.getId())
            //     // pivot.update({
            //     //     active: true
            //     // })
            // })
        // })
    })
})