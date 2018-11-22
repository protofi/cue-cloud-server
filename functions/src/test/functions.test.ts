import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import { singular } from 'pluralize'
import * as admin from 'firebase-admin'
import * as uniqid from 'uniqid'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import ModelImpl, { Models } from './lib/ORM/Models';
import { Many2ManyRelation } from './lib/ORM/Relation';
import { Driver, Car } from './stubs';
import { Change } from 'firebase-functions';
import { Relations } from './lib/const';
import * as _ from 'lodash';
import * as flatten from 'flat'

const test: FeaturesList = require('firebase-functions-test')()

const assert = chai.assert;
const expect = chai.expect;

describe('OFFLINE', () => {

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
    
    before(async () => {

        adminInitStub = sinon.stub(admin, 'initializeApp')

        firestoreStub = {
            settings: () => { return null },
            collection: (col) => {
                return {
                    doc: (id) => {
                        return {
                            id: (id) ? id : uniqid(),
                            set: (data) => {
                                firestoreMockData[`${col}/${id}`] = data
                                return null
                            },
                            get: () => {
                                return {
                                    get: (data) => {
                                        
                                        if(data)
                                            return firestoreMockData[`${col}/${id}`][data]
                                        else
                                            return firestoreMockData[`${col}/${id}`]
                                    }
                                }
                            },
                            update: (data) => {
                                firestoreMockData[`${col}/${id}`] = data
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

    after(async () => {
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

        beforeEach(() => {
            firestoreMockData = {}
        })

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

            // it('---', async () => {
            //     const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.ctrlSensorsUsersOnUpdate)

            //     const change = test.makeChange({
            //         data: () => {
            //             return {
            //                 [Models.SENSOR]: {
            //                     id : 'Sensor1'
            //                 },
            //                 [Models.USER]: {
            //                     id : 'User2'
            //                 },
            //                 pivot: {
            //                     muted : false
            //                 },
            //             }
            //         }
            //     }, {
            //         data: () => {
            //             return {
            //                 [Models.SENSOR]: {
            //                     id : 'Sensor1'
            //                 },
            //                 [Models.USER]: {
            //                     id : 'User2'
            //                 },
            //                 pivot: {
            //                     muted : true
            //                 },
            //             }
            //         },
            //         get : () => {
            //             return {}
            //         },
            //         ref : {
            //             update: () => {
            //                 return {}
            //             },
            //             id : 'Sensor1_User2'
            //         }
            //     })

            //     await wrappedSensorsUsersOnUpdate(change, {
            //         eventId : 'Sensor1_User2'
            //     })
            // })

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

        describe('Users', () => {
        
            it('Id should be cached on related sensors', async () => {
    
                const cacheField = 'id'
                const sensorId = uniqid()
                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)
                
                const change = {
                    before : {
                        data: () => {
                            return {}
                        }
                    },
                    after : {
                        data: () => {
                            return {
                               [cacheField] : testUserDataOne.uid
                            }
                        },
                        get : () => {
                            return {
                                [sensorId] : true
                            }
                        },
                        ref : {
                            [cacheField] : testUserDataOne.uid
                        }
                    }
                }
    
                await wrappedUsersOnUpdate(change)
    
                expect(firestoreMockData[`${Models.SENSOR}/${sensorId}`]).to.deep.equal({
                    [`${Models.USER}.${testUserDataOne.uid}.${cacheField}`] : testUserDataOne.uid
                })
            })
    
            it('Name should be cached on related household', async () => {
    
                const cacheField = 'name'
                const householdId = uniqid()
    
                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)
                
                const change = {
                    before : {
                        data: () => {
                            return {}
                        }
                    },
                    after : {
                        data: () => {
                            return {
                               [cacheField] : testUserDataOne.name
                            }
                        },
                        get : () => {
                            return {
                                id : householdId
                            }
                        },
                        ref : {
                            id : testUserDataOne.uid,
                        }
                    }
                }
    
                await wrappedUsersOnUpdate(change)
    
                expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.deep.equal({
                    [`${Models.USER}.${testUserDataOne.uid}.${cacheField}`] : testUserDataOne.name
                })
            })
        })
    
        describe('Sensors-Users-Relation', () => {
    
            it('Mute should be cached on related Sensor', async () => {
                
                const cacheField = 'muted'
                const userId = uniqid()
                const sensorId = uniqid()
                const pivotId = `${sensorId}_${userId}`
    
                const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.ctrlSensorsUsersOnUpdate)
    
                //mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.USER] : {
                        [userId] : true
                    }
                }
    
                const change = {
                    before : {
                        data: () => {
                            return {}
                        }
                    },
                    after : {
                        data: () => {
                            return {
                               [Relations.PIVOT] : {
                                    [cacheField] : true
                               },
                            }
                        },
                        ref : {
                            id : pivotId,
                            path : `${Models.SENSOR}_${Models.USER}/${pivotId}`,
                        }
                    }
                }
    
                await wrappedSensorsUsersOnUpdate(change)
    
                expect(firestoreMockData[`${Models.SENSOR}/${sensorId}`]).to.deep.equal({
                    [`${Models.USER}.${userId}.pivot.${cacheField}`] : true
                })
            })
        })
    })
})