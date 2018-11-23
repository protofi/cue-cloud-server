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
import { Relations, Roles } from './lib/const';
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
        
        beforeEach(() => {
            firestoreMockData = {}
        })

        describe('Households', async () => {

            describe('On Create', async () => { 
                
                it.only('Pivot between user and household should recieve a role property of admin', async () => {
                    
                    firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`] = {}

                    const householdSnap = {
                        data : () => {
                            return { [Models.USER] : { [testUserDataOne.uid] : true } }
                        },
                        delete : () => {
                            return
                        },
                        get : (field) => {

                            switch(field)
                            {
                                case Models.USER : {
                                    return { [testUserDataOne.uid] : true }
                                }
                                default : {
                                    return undefined
                                }
                            }
                        }
                    }

                    const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                    await wrappedHouseholdsOnCreate(householdSnap)

                    expect(firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`]).to.deep.equal({
                        [`${Models.HOUSEHOLD}.${Relations.PIVOT}.role`] : Roles.ADMIN
                    })
                })

                it('Role field should not be added to pivot property if user aleady have a property of HOUSEHOLD with a different ID', async () => {
                    
                    const householdIdOne = uniqid()
                    const householdIdTwo = uniqid()

                    firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdIdOne
                        }
                    }

                    const householdSnap = {
                        data : () => {
                            return { [Models.USER] : { [testUserDataOne.uid] : true } }
                        },
                        ref: {
                            id : householdIdTwo
                        },
                        get : (field) => {

                            switch(field)
                            {
                                case Models.USER : {
                                    return { [testUserDataOne.uid] : true }
                                }
                                default : {
                                    return undefined
                                }
                            }
                        }
                    }

                    const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                    await wrappedHouseholdsOnCreate(householdSnap)

                    expect(firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`])
                        .to.deep.equal({
                            [Models.HOUSEHOLD] : {
                                id : householdIdOne
                            }
                        })
                })
            })
        })

        describe('Users', () => {

            describe('On Update', () => {
        
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