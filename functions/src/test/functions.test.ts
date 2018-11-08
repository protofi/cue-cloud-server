import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import { singular } from 'pluralize'
import * as admin from 'firebase-admin'
import * as uniqid from 'uniqid'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import ModelImpl, { Models } from './lib/ORM/Models';
import { Many2ManyRelation } from './lib/ORM/Relation';
import { Driver, Car } from './stubs';
import { InstanceLoader } from './lib/util';

const assert = chai.assert;
const expect = chai.expect;

describe('OFFLINE', () => {

    let test: FeaturesList
    let adminInitStub: sinon.SinonStub
    let adminfirestoreStub: sinon.SinonStub
    let myFunctions
    let firestoreStub

    let firestoreMockData: any = {}

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

        adminInitStub = sinon.stub(admin, 'initializeApp')

        firestoreStub = {
            settings: () => { return null },
            collection: (col) => {
                return {
                    doc: (doc) => {
                        return {
                            id: uniqid(),
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

        adminfirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return firestoreStub
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

        describe('Cache', () => {

            it('The name of the user should be cached on the household collection', async () => {
                
                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)

                const householdId = 'household-test-1'

                const change = {
                    before : {
                        data: () => {
                            return {
                                households: {
                                    id : householdId
                                },
                            }
                        },
                    },
                    after : {
                        data: () => {
                            return {
                                households: {
                                    id : householdId
                                },
                                name: testUserDataOne.name
                            }
                        },
                        get : () => {
                            return {}
                        },
                        ref : {
                            update: () => {
                                return {}
                            },
                            id : testUserDataOne.uid
                        }
                    }
                }

                await wrappedUsersOnUpdate(change, null)

                expect(firestoreMockData[`${Models.HOUSEHOLD}/undefined`]).to.deep.equal({
                    [`${Models.USER}.${testUserDataOne.uid}.name`] : testUserDataOne.name
                })
            })

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


            // it('Cachable fields should be defined on the relation.', async () => {

            //     const driver = new Driver(firestoreStub)
            //     const car = new Car(firestoreStub)

            //     const rel = await car.drivers().attach(driver)

            //     console.log(firestoreMockData)

            //     // const pivot = await m1.modal2().pivot(await m2.getId())
            //     // pivot.update({
            //     //     active: true
            //     // })
            // })

            // it('Properties of Owner model should be cachable on Property model', async () => {

            //     const driver = new Driver(firestoreStub)
            //     const car = new Car(firestoreStub)

            //     car.create({
            //         brand: 'Ford',
            //         year: 1984
            //     })

            //     const rel = new Many2ManyRelation(car, driver.name, firestoreStub)

            //     const cache1 = [
            //         'brand',
            //         'year'
            //     ]

            //     rel.defineCachableFields(cache1)

            //     console.log(firestoreMockData)
            // })

            // it('instance', async () => {
                
            //     const model = await import(`./lib/ORM/Models/${singular(Models.USER)}`)
                
            //     console.log(new model.default())

            // })
        })
    })
})