import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import { singular } from 'pluralize'
import * as admin from 'firebase-admin'
import * as uniqid from 'uniqid'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import { Models } from './lib/ORM/Models'
import { OfflineDocumentSnapshotStub } from './stubs'
import { Change } from 'firebase-functions'
import { unflatten } from 'flat'
import { Relations, Roles } from './lib/const'
import * as _ from 'lodash'

const test: FeaturesList = require('firebase-functions-test')()

const assert = chai.assert
const expect = chai.expect

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
                            set: (data, {merge}) => {
    
                                if(merge)
                                {
                                    firestoreMockData = _.merge(firestoreMockData, {
                                        [`${col}/${id}`] : unflatten(data)
                                    })
                                }
                                else firestoreMockData[`${col}/${id}`] = unflatten(data)
    
                                return null
                            },
                            get: () => {
                                return {
                                    get: (data) => {
                                        try{
                                            if(data)
                                                return firestoreMockData[`${col}/${id}`][data]
                                            else
                                                return firestoreMockData[`${col}/${id}`]
                                        }
                                        catch(e)
                                        {
                                            throw Error(`Mock data is missing: ${e} [${`${col}/${id}`}]`)
                                        }
                                    }
                                }
                            },
                            update: (data) => {
                                if(!firestoreMockData[`${col}/${id}`]) throw Error(`Mock data is missing: [${`${col}/${id}`}]`)
    
                                firestoreMockData = _.merge(firestoreMockData, {
                                    [`${col}/${id}`] : unflatten(data)
                                })
    
                                return null
                            },
                            delete: () => {
                                delete firestoreMockData[`${col}/${id}`]
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
                
                it('Pivot between user and household should recieve a role property of admin', async () => {
                    
                    const householdId = uniqid()

                    firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`] = {
                        id: testUserDataOne.uid,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    }

                    const householdSnap = new OfflineDocumentSnapshotStub({
                        data : {
                            [Models.USER] : {
                                [testUserDataOne.uid] : true
                            }
                        },
                        ref : {
                            id : householdId
                        }
                    })

                    const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                    await wrappedHouseholdsOnCreate(householdSnap)

                    const userDoc = firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`]

                    const expectedUserDoc = {
                        id: testUserDataOne.uid,
                        [Models.HOUSEHOLD] : {
                            id : householdId,
                            [Relations.PIVOT] : {
                                role : Roles.ADMIN,
                                accepted : true
                            }
                        }
                    }

                    expect(userDoc).to.deep.include(expectedUserDoc)
                })

                it('Role field should not be added to pivot property if user aleady have a property of HOUSEHOLD with a different ID', async () => {
                    
                    const householdIdOne = uniqid()
                    const householdIdTwo = uniqid()

                    firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdIdOne
                        }
                    }

                    const householdSnap = new OfflineDocumentSnapshotStub({
                        data : { [Models.USER] : { [testUserDataOne.uid] : true } },
                        ref: {
                            id : householdIdTwo,
                            delete : () => {
                                return
                            }
                        }
                    })

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
                    const sensorsId = uniqid()
                    const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)
                    
                    firestoreMockData[`${Models.SENSOR}/${sensorsId}`] = {}

                    const afterDocSnap = new OfflineDocumentSnapshotStub({
                        data : {
                            [cacheField] : testUserDataOne.uid,
                            [Models.SENSOR] : {
                                [sensorsId] : true
                            }
                        },
                        ref : {
                            [cacheField] : testUserDataOne.uid
                        }
                    })

                    const change = {
                        before : new OfflineDocumentSnapshotStub(),
                        after : afterDocSnap 
                    }
        
                    await wrappedUsersOnUpdate(change)

                    const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorsId}`]
                    const expectedSensorDoc = {
                        [Models.USER]: {
                            [testUserDataOne.uid] : {
                                [cacheField] : testUserDataOne.uid
                            }
                        }
                    }
                    expect(sensorDoc).to.deep.equal(expectedSensorDoc)
                })
        
                it('Name should be cached on related household', async () => {
        
                    const cacheField = 'name'
                    const householdId = uniqid()
        
                    firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {}

                    const afterDocSnap = new OfflineDocumentSnapshotStub({
                        data : {
                            [cacheField] : testUserDataOne.name,
                            [Models.HOUSEHOLD] : {
                                id : householdId
                            }
                        },
                        ref : {
                            id : testUserDataOne.uid,
                        }
                    })

                    const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)

                    const change = {
                        before : new OfflineDocumentSnapshotStub(),
                        after : afterDocSnap
                    }

                    await wrappedUsersOnUpdate(change)
                    
                    const householdDoc = firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]
                    const expectedHouseholdDoc = {
                        [Models.USER]: {
                            [testUserDataOne.uid] : {
                                [cacheField] : testUserDataOne.name
                            }
                        }
                    }

                    expect(householdDoc).to.deep.equal(expectedHouseholdDoc)  
                })
            })
        })
    
        describe('Sensors-Users-Relation', () => {
    
            it('Mute should be cached on related Sensor', async () => {
                
                const userId        = uniqid()
                const sensorId      = uniqid()
                const cacheField    = 'muted'
                const pivotId       = `${sensorId}_${userId}`
    
                const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.ctrlSensorsUsersOnUpdate)
    
                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.USER] : {
                        [userId] : true
                    }
                }

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Relations.PIVOT] : {
                            [cacheField] : true
                        },
                        [Models.USER] : {
                            [userId] : true
                        }
                    },
                    ref : {
                        id : pivotId,
                        path : `${Models.SENSOR}_${Models.USER}/${pivotId}`,
                    }
                })

                const change = {
                    before : new OfflineDocumentSnapshotStub(),
                    after : afterDocSnap
                }
    
                await wrappedSensorsUsersOnUpdate(change)
                
                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]
                const expectedSensorDoc = {
                    [Models.USER]: {
                        
                        [userId] : {
                            [Relations.PIVOT] : {
                                [cacheField] : true
                            }
                        }
                    }
                }
                expect(sensorDoc).to.deep.equal(expectedSensorDoc)
            })
        })
    })
})