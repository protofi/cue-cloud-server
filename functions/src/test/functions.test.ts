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
import { unflatten, flatten } from 'flat'
import { Relations, Roles, Errors } from './lib/const'
import * as fakeUUID from 'uuid/v1'
import * as _ from 'lodash'

const test: FeaturesList = require('firebase-functions-test')()

const assert = chai.assert
const expect = chai.expect

describe('OFFLINE', () => {

    let adminInitStub: sinon.SinonStub
    let adminFirestoreStub: sinon.SinonStub
    let adminMessagingStub: sinon.SinonStub
    const messagingSendToDeviceSpy = sinon.spy()
    let myFunctions
    let firestoreStub

    let idIterator = 0
    let injectionIds = []
    
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

        function nextIdInjection()
        {
            const _nextInjectionId = injectionIds[idIterator]

            idIterator++

            return (_nextInjectionId) ? _nextInjectionId : uniqid()
        }

        firestoreStub = {
            settings: () => { return null },
            collection: (col) => {
                return {
                    doc: (id) => {
                        return {
                            id: (id) ? id : uniqid(),
                            set: (data, {merge}) => {
                                
                                const _id = (id) ? id : nextIdInjection()

                                if(merge)
                                {
                                    firestoreMockData = _.merge(firestoreMockData, {
                                        [`${col}/${_id}`] : unflatten(data)
                                    })
                                }
                                else firestoreMockData[`${col}/${_id}`] = unflatten(data)
    
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
                                            console.error(`Mock data is missing: ${e.message} [${`${col}/${id}`}]`)
                                            return undefined
                                        }
                                    },
                                    exists : (!_.isUndefined(firestoreMockData[`${col}/${id}`]))
                                }
                            },
                            update: (data) => {
                                
                                if(!firestoreMockData[`${col}/${id}`]) throw Error(`Mock data is missing: [${`${col}/${id}`}]`)

                                //Handle field deletion
                                const flattenData = flatten(data)
                                
                                _.forOwn(flattenData, (value, key) => {
                                    if(value !== admin.firestore.FieldValue.delete()) return
                                    
                                    _.unset(data, key)
                                    _.unset(firestoreMockData[`${col}/${id}`], key)
                                })

                                firestoreMockData = _.merge(firestoreMockData, {
                                    [`${col}/${id}`] : unflatten(data)
                                })
    
                                return null
                            },

                            delete: () => {
                                _.unset(firestoreMockData, `${col}/${id}`)
                            }
                        }
                    },
                    where: (field: string, operator: string, value: string) => {
                        return {
                            get: () => {

                                const docs: Array<Object> = new Array<Object>()

                                _.forOwn(firestoreMockData, (collection, path) => {

                                    if(!path.includes(col)) return

                                    if(!_.has(collection, field)) return
                                    
                                    if(_.get(collection, field) !== value) return

                                    docs.push(_.merge(firestoreMockData[path], {
                                        ref: {
                                            delete: () => {
                                                _.unset(firestoreMockData, path)
                                            }
                                        }
                                    }))
                                })

                                return docs
                            }
                        }
                    }
                }
            }
        }

        adminFirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return firestoreStub
            }
        })

        adminMessagingStub = sinon.stub(admin, 'messaging')
        .get(() => {
            return () => {
                return {
                    sendToDevice : messagingSendToDeviceSpy
                }
            }
        })

        myFunctions = require('../lib/index')
    })

    after(async () => {
        test.cleanup()
        adminInitStub.restore()
        adminFirestoreStub.restore()
        firestoreMockData = {}
        injectionIds = []
        idIterator = 0
    })

    describe('Functions', async () => {
        
        beforeEach(() => {
            firestoreMockData = {}
        })

        describe('Auth', () => {

            describe('On Create', async () => {

                it('When a new user is registered a Users record should be created', async () => {

                    const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(testUserDataOne)
                    const wrappedAuthUsersOnCreate = test.wrap(myFunctions.authUsersOnCreate)

                    await wrappedAuthUsersOnCreate(userRecord)

                    const userDoc = firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`]

                    expect(userDoc).to.exist
                })

                it('When a new user is registered a Users record should be created with an ID and email field', async () => {

                    const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(testUserDataOne)
                    const wrappedAuthUsersOnCreate = test.wrap(myFunctions.authUsersOnCreate)

                    await wrappedAuthUsersOnCreate(userRecord)

                    const expectedUserDoc = {
                        id : testUserDataOne.uid,
                        email : testUserDataOne.email
                    }

                    const userDoc = firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`]

                    expect(userDoc).to.be.deep.equal(expectedUserDoc)
                })
            })
            
            describe('On Delete', async () => {

                it('When a user is delete the corresponding Users record should be deleted', async () => {

                    firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`] = {
                        id : testUserDataOne.uid,
                        email : testUserDataOne.email
                    }

                    const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(testUserDataOne)
                    const wrappedAuthUsersOnDelete = test.wrap(myFunctions.authUsersOnDelete)

                    await wrappedAuthUsersOnDelete(userRecord)

                    const userDoc = firestoreMockData[`${Models.USER}/${testUserDataOne.uid}`]

                    expect(userDoc).to.not.exist
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

        describe('Pub/Sub', () => {
            
            const nullBuffer = new Buffer('')
            const householdId       = uniqid()
    
            const baseStationId     = uniqid()
            const baseStationUUID   = fakeUUID()
            const sensorId          = uniqid()
            const sensorUUID        = fakeUUID()

            describe('Topic: New Sensor', () => {

                it('Sending a message with no Base Station UUID should fail', async () => {

                    const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                    let error = null
                 
                    try{

                        await wrappedPubsubBaseStationNewSensor({
                                data: nullBuffer,
                                attributes: {
                                    sensor_UUID: sensorUUID
                                }}
                            )
                    }
                    catch(e) {
                        error = e.message
                    }

                    expect(error).to.be.equal(Errors.MODEL_NOT_FOUND)

                    expect(firestoreMockData[`${Models.SENSOR}/${undefined}`]).to.not.exist
                    expect(firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`]).to.not.exist
                    expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
                })

                it('Sending a message with no Sensor UUID should fail', async () => {

                    // mock data
                    firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    }

                    const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                    let error = null
                    
                    try{

                        await wrappedPubsubBaseStationNewSensor({
                                data: nullBuffer,
                                attributes: {
                                    base_station_UUID : baseStationUUID
                                }}
                            )
                    }
                    catch(e) {
                        error = e.message
                    }

                    expect(error).to.be.equal(Errors.NO_SENSOR_UUID)

                    expect(firestoreMockData[`${Models.SENSOR}/${undefined}`]).to.not.exist
                    expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
                })

                it('Sending a message with no attributes should fail', async () => {

                    // mock data
                    firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    }

                    const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                    
                    try{

                        await wrappedPubsubBaseStationNewSensor({
                                data: nullBuffer
                            })
                    }
                    catch(e) { }

                    expect(firestoreMockData[`${Models.SENSOR}/${undefined}`]).to.not.exist
                    expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
                })

                it('Sending a message with a Base Station UUID not found in the database should fail', async () => {

                    const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                    let error = null
                  
                    try{

                        await wrappedPubsubBaseStationNewSensor({
                                data: nullBuffer,
                                attributes: {
                                    base_station_UUID : baseStationUUID,
                                    sensor_UUID: sensorUUID
                                }}
                            )
                    }
                    catch(e) {
                        error = e.message
                    }

                    expect(error).to.be.equal(Errors.MODEL_NOT_FOUND)

                    expect(firestoreMockData[`${Models.SENSOR}/${undefined}`]).to.not.exist
                    expect(firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`]).to.not.exist
                    expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
                })

                it('Sending a message with a Base Station UUID of Base Station not claimed should fail', async () => {

                    // mock data
                    firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {}

                    const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                    let error = null

                    try{

                        await wrappedPubsubBaseStationNewSensor({
                                data: nullBuffer,
                                attributes: {
                                    base_station_UUID : baseStationUUID,
                                    sensor_UUID: sensorUUID
                                }
                            })
                    }
                    catch(e) {
                        error = e.message
                    }

                    expect(error).to.be.equal(Errors.BASE_STATION_NOT_CLAIMED)

                    expect(firestoreMockData[`${Models.SENSOR}/${undefined}`]).to.not.exist
                    expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist

                    expect(firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`]).to.exist
                })

                it('Sending a message should create a Sensor related to the claiming Household', async () => {

                    // mock data
                    firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    }

                    injectionIds = [
                        sensorId,
                        sensorId,
                        sensorId
                    ]

                    const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)

                    await wrappedPubsubBaseStationNewSensor({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationUUID,
                                sensor_UUID: sensorUUID
                            }}
                        )
                    
                    const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]
                    const expectedSensorDoc = {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        },
                        UUID: sensorUUID
                    }

                    const householdDoc = firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]
                    const expectedHouseholdDoc = {
                        [Models.SENSOR] : {
                            [sensorId] : true
                        }
                    }

                    expect(householdDoc).to.be.deep.equal(expectedHouseholdDoc)
                    expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
                })
            })
        //     it('Notification Topic', async () => {
                
        //         const userId        = uniqid()
        //         const sensorId      = uniqid()
        //         const FCMToken      = uniqid()
                
        //         // mock data
        //         firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
        //             [Models.USER] : {
        //                 [userId] : {
        //                     FCM_tokens : {
        //                         [FCMToken] : true
        //                     }
        //                 }
        //             }
        //         }

        //         firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
        //             name : 'Doorbell'
        //         }

        //         const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)
            
        //         await wrappedPubsubSensorNotification({
        //             data: new Buffer(''),
        //             attributes: {
        //                 sensor_id: sensorId
        //             }}
        //         )

        //         console.error(messagingSendToDeviceSpy.args)
        //         expect(messagingSendToDeviceSpy.called).to.be.true
        //     })
        
            
        })
    })
})