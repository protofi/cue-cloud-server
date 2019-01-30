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
import { Relations, Roles, Errors, WhereFilterOP } from './lib/const'
import * as fakeUUID from 'uuid/v1'
import * as _ from 'lodash'
import * as util from './lib/util'
import User from './lib/ORM/Models/User';
import Sensor from './lib/ORM/Models/Sensor';

const test: FeaturesList = require('firebase-functions-test')()

const assert = chai.assert
const expect = chai.expect

describe('Integrations_Test', () => {

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

    const testSensorDataOne = {
        uid: "test-user-1",
        name: "Andy",
        email: "andy@mail.com",
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
                            id: (id) ? id : nextIdInjection(),
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
                                            // console.error(`Mock data is missing: ${e.message} [${`${col}/${id}`}]`)
                                            throw Error(`Mock data is missing: ${e.message} [${`${col}/${id}`}]`)
                                            // return undefined
                                        }
                                    },
                                    exists : (!_.isUndefined(firestoreMockData[`${col}/${id}`]))
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
                    },
                    where: (field: string, operator: string, value: string) => {
                        return {
                            get: () => {

                                if(operator !== WhereFilterOP.EQUAL) throw Error('OPERATOR NOT IMPLEMENTED IN TEST YET')
                                
                                const docs: Array<Object> = new Array<Object>()

                                _.forOwn(firestoreMockData, (collection, path) => {

                                    if(!path.includes(col)) return

                                    if(!_.has(collection, field)) return
                                    
                                    if(_.get(collection, field) !== value) return

                                    docs.push(_.merge({
                                        ref: {
                                            delete: () => {
                                                _.unset(firestoreMockData, path)
                                            },
                                            id: path.split('/')[1],
                                            update: (data: any) => {
                                                if(!firestoreMockData[path]) throw Error(`Mock data is missing: [${path}]`)
        
                                                firestoreMockData = _.merge(firestoreMockData, {
                                                    [path] : unflatten(data)
                                                })
                    
                                                return null
                                            }
                                        },
                                        id: path.split('/')[1],
                                        get: (f: string) => {
                                            return firestoreMockData[path][f]
                                        }
                                    }, firestoreMockData[path]))
                                })

                                return {
                                    empty : !(docs.length > 0),  
                                    size : docs.length,
                                    docs : docs,
                                    update: (data) => {
                                        return null
                                    }
                                }
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
    })
        
    beforeEach(() => {
        firestoreMockData = {}
        injectionIds = []
        idIterator = 0
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

                const cacheField = User.f.ID
                const sensorsId = uniqid()
                const wrappedUsersOnUpdate = test.wrap(myFunctions.funcUsersOnUpdate)
                
                firestoreMockData[`${Models.SENSOR}/${sensorsId}`] = {}
                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorsId}`] = {}

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
    
                const cacheField = User.f.NAME
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

                const wrappedUsersOnUpdate = test.wrap(myFunctions.funcUsersOnUpdate)

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

            it('Changes to FCM_tokens should be cached onto Sensors_secure', async () => {
    
                const cacheField = User.f.FCM_TOKENS
                const FCMToken = uniqid()
                const sensorId = uniqid()

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {}
                
                const beforeUserDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Models.SENSOR] : {
                            [sensorId] : true
                        }
                    },
                    ref : {
                        id : testUserDataOne.uid,
                    }
                })

                const afterUserDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : {
                            [FCMToken] : true
                        },
                        [Models.SENSOR] : {
                            [sensorId] : true
                        }
                    },
                    ref : {
                        id : testUserDataOne.uid,
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.funcUsersOnUpdate)

                const change = {
                    before : beforeUserDocSnap,
                    after : afterUserDocSnap
                }

                await wrappedUsersOnUpdate(change)
                
                const sensorSecureDoc = firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]
                
                const expectedSensorSecureDoc = {
                    [Models.USER]: {
                        [testUserDataOne.uid] : {
                            [cacheField] : {
                                [FCMToken] : true
                            }
                        }
                    }
                }

                expect(sensorSecureDoc).to.deep.equal(expectedSensorSecureDoc)
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

                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.funcHouseholdsOnCreate)

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

                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.funcHouseholdsOnCreate)

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

    describe('Sensors', () => {

        describe('On Create', async () => { 

            it('When Sensor is create the secure data should be created', async () => {
                const sensorId      = uniqid()
                const wrappedSensorsOnCreate = test.wrap(myFunctions.funcSensorsOnCreate)

                const sensorSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        id : sensorId,
                        update : () => {
                            return
                        }
                    }
                })

                await wrappedSensorsOnCreate(sensorSnap)

                const sensorSecureDoc = firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]

                expect(sensorSecureDoc).to.not.be.undefined
            })
        })

        describe('On Delete', async () => { 

            it('When Sensor is delete the secure data should also be deleted', async () => {
                const sensorId      = uniqid()
                const wrappedSensorsOnDelete = test.wrap(myFunctions.funcSensorsOnDelete)

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {}

                const sensorSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        id : sensorId,
                        update : () => {
                            return
                        }
                    }
                })

                await wrappedSensorsOnDelete(sensorSnap)

                const sensorSecureDoc = firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]

                expect(sensorSecureDoc).to.be.undefined
            })
        })
    })

    describe('Sensors-Users-Relation', () => {

        it('Mute should be cached on related Sensor', async () => {
            
            const userId        = uniqid()
            const sensorId      = uniqid()
            const cacheField    = 'muted'
            const pivotId       = `${sensorId}_${userId}`

            const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.funcSensorsUsersOnUpdate)

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
        const householdTwoId    = uniqid()

        const baseStationUUID   = fakeUUID()
        const baseStationTwoUUID   = fakeUUID()

        const sensorId          = uniqid()
        const sensorUUID        = fakeUUID()

        const sensorTwoId       = uniqid()

        beforeEach(() => {
            messagingSendToDeviceSpy.resetHistory()
        })

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

            it('Sending a message with a Sensor UUID already paired with the Base Staion UUID should not create a new sensor', async () => {

                // mock data
                firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {
                    [Models.SENSOR] : {
                        [sensorId] : true
                    }
                }

                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    },
                    UUID : sensorUUID
                }
                
                injectionIds = [
                    sensorTwoId,
                    sensorTwoId,
                    sensorTwoId
                ]

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

                expect(error).to.be.equal(Errors.SENSOR_ALREADY_PAIRED)

                expect(firestoreMockData[`${Models.SENSOR}/${sensorTwoId}`]).to.not.exist
                expect(householdDoc).to.be.deep.equal(expectedHouseholdDoc)
                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
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

            it('Sending a message with a Sensor UUID identical with another Sensor UUID paired with another Base Staion UUID should create a new sensor', async () => {

                // mock data
                firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.BASE_STATION}/${baseStationTwoUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdTwoId
                    }
                }

                firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {
                    [Models.SENSOR] : {
                        [sensorId] : true
                    }
                }

                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    },
                    UUID : sensorUUID
                }
                
                injectionIds = [
                    sensorTwoId,
                    sensorTwoId,
                    sensorTwoId
                ]

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)

                await wrappedPubsubBaseStationNewSensor({
                        data: nullBuffer,
                        attributes: {
                            base_station_UUID : baseStationTwoUUID,
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

                const householdDoc = firestoreMockData[`${Models.HOUSEHOLD}/${householdTwoId}`]
                const expectedHouseholdDoc = {
                    [Models.SENSOR] : {
                        [sensorTwoId] : true
                    }
                }

                expect(householdDoc).to.be.deep.equal(expectedHouseholdDoc)
                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
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

        describe('Topic: Notification', async () => {

            const FCMTokenOne  = uniqid()
            const FCMTokenTwo  = uniqid()

            it('Sending a message with no Sensor UUID should fail', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)
                
                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: { }
                })

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Sending a message with Sensor UUID assigned to more than one Sensor should fail', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)
                
                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}/${sensorTwoId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('If user has muted sensor, no notification should be send', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : true
                            },
                            [Relations.PIVOT] : {
                                [Sensor.f[Relations.PIVOT][Models.USER].MUTED] : true
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Should not send notification if FCM tokens are not cached to the Sensor secure data', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {}
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Should send notification with title  if sensor has no Name field (Android)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.LOCATION] : 'living room'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.data.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title  if sensor has no Name field (iOS)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.LOCATION] : 'living room'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.notification.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title  if sensor has no Location field (Android)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.NAME] : 'sensor'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.data.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title  if sensor has no Location field (iOS)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.NAME] : 'sensor'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.notification.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title `Sensor lyder i stuen` (iOS)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                const sensorName = 'sensor'
                const sensorLocation = 'stuen'

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const payload = messagingSendToDeviceSpy.args[0][1]

                const generatedTitle = _.capitalize(`${sensorName} lyder i ${sensorLocation}`)

                expect(payload.notification.title).is.equal(generatedTitle)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title `Sensor lyder i stuen` (Android)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                const sensorName = 'sensor'
                const sensorLocation = 'stuen'

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const payload = messagingSendToDeviceSpy.args[0][1]

                const generatedTitle = _.capitalize(`${sensorName} lyder i ${sensorLocation}`)

                expect(payload.data.title).is.equal(generatedTitle)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with Android payload if FCM_tokens specify the context of Android', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const sendToTokens = messagingSendToDeviceSpy.args[0][0]
                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(sendToTokens).to.include(FCMTokenOne)
                expect(_.keys(payload)).to.not.include('notification')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })
            
            it('Should send notification with IOS payload if FCM_tokens specify the context of IOS', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const sendToTokens = messagingSendToDeviceSpy.args[0][0]
                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(sendToTokens).to.include(FCMTokenOne)
                expect(_.keys(payload)).to.include('notification')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send two notifications if the context of some FCM_tokens specified as IOS and Android', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.IOS
                                }
                            }
                        },
                        [testUserDataTwo.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenTwo] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.ANDROID
                                }
                            }
                        }

                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const sendToIOSTokens = messagingSendToDeviceSpy.args[0][0]
                const iOSpayload = messagingSendToDeviceSpy.args[0][1]

                const sendToAndroidTokens = messagingSendToDeviceSpy.args[1][0]
                const androidPayload = messagingSendToDeviceSpy.args[1][1]

                expect(sendToIOSTokens).to.include(FCMTokenOne)
                expect(_.keys(iOSpayload)).to.include('notification')

                expect(sendToAndroidTokens).to.include(FCMTokenTwo)
                expect(_.keys(androidPayload)).to.not.include('notification')

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(2)
            })

            it('Should send two notifications if the context of some FCM_tokens specified as IOS and Android', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Sensor.f.UUID] : sensorUUID
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS] : {
                                [FCMTokenOne] : {
                                    [User.f.CONTEXT._] : User.f.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorUUID
                    }
                })

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]
                const expectedSensorDoc = {
                    [Sensor.f.UUID] : sensorUUID,
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })
        })
    })
})