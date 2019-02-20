import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin'
import * as uniqid from 'uniqid'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import { Models } from './lib/ORM/Models'
import { OfflineDocumentSnapshotStub, FirestoreStub } from './stubs'
import { Relations, Roles, Errors, WhereFilterOP } from './lib/const'
import * as fakeUUID from 'uuid/v1'
import * as _ from 'lodash'
import User from './lib/ORM/Models/User';
import Sensor from './lib/ORM/Models/Sensor';
import BaseStation from './lib/ORM/Models/BaseStation';
import * as faker from 'faker'
import { printFormattedJson } from './lib/util';

const randomstring = require('randomstring')

const test: FeaturesList = require('firebase-functions-test')()

const assert = chai.assert
const expect = chai.expect

describe('Integration_Test', () => {

    let adminInitStub: sinon.SinonStub
    let adminFirestoreStub: sinon.SinonStub
    let adminMessagingStub: sinon.SinonStub
    const messagingSendToDeviceSpy = sinon.spy()
    let myFunctions
    const firestoreStub = new FirestoreStub()

    const userOneData = {
        uid: uniqid(),
        name: faker.name.firstName(),
        email: faker.internet.email(),
        token: null
    }

    const userTwoData = {
        uid: uniqid(),
        name: faker.name.firstName(),
        email: faker.internet.email(),
        token: null
    }

    before(async () => {

        adminInitStub = sinon.stub(admin, 'initializeApp')

        adminFirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return firestoreStub.get()
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
        adminMessagingStub.restore()
    })

    beforeEach(() => {
        firestoreStub.reset()
    })

    describe('Auth', () => {
        
        describe('On Create', async () => {

            it('When a new user is registered a Users record should be created', async () => {

                const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(userOneData)
                const wrappedAuthUsersOnCreate = test.wrap(myFunctions.authUsersOnCreate)

                await wrappedAuthUsersOnCreate(userRecord)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userOneData.uid}`]

                expect(userDoc).to.exist
            })

            it('When a new user is registered a Users record should be created with an ID and email field', async () => {

                const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(userOneData)
                const wrappedAuthUsersOnCreate = test.wrap(myFunctions.authUsersOnCreate)

                await wrappedAuthUsersOnCreate(userRecord)

                const expectedUserDoc = {
                    id : userOneData.uid,
                    email : userOneData.email
                }

                const userDoc = firestoreStub.data()[`${Models.USER}/${userOneData.uid}`]

                expect(userDoc).to.be.deep.equal(expectedUserDoc)
            })
        })
        
        describe('On Delete', async () => {

            it('When a user is delete the corresponding Users record should be deleted', async () => {

                firestoreStub.data()[`${Models.USER}/${userOneData.uid}`] = {
                    id : userOneData.uid,
                    email : userOneData.email
                }

                const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(userOneData)
                const wrappedAuthUsersOnDelete = test.wrap(myFunctions.authUsersOnDelete)

                await wrappedAuthUsersOnDelete(userRecord)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userOneData.uid}`]

                expect(userDoc).to.not.exist
            })
        })
    })

    describe('Users', () => {

        describe('On Update', () => {

            it('Should cache field "id" to related sensors', async () => {

                const cacheField = User.f.ID
                const sensorsId = uniqid()
                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)
                
                firestoreStub.data()[`${Models.SENSOR}/${sensorsId}`] = {}
                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorsId}`] = {}

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : userOneData.uid,
                        [Models.SENSOR] : {
                            [sensorsId] : true
                        }
                    },
                    ref : {
                        [cacheField] : userOneData.uid
                    }
                })

                const change = {
                    before : new OfflineDocumentSnapshotStub(),
                    after : afterDocSnap 
                }

                await wrappedUsersOnUpdate(change)

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorsId}`]
                const expectedSensorDoc = {
                    [Models.USER]: {
                        [userOneData.uid] : {
                            [cacheField] : userOneData.uid
                        }
                    }
                }
                expect(sensorDoc).to.deep.equal(expectedSensorDoc)
            })

            it('Should not update Name cache on Household if Name is not changed', async () => {

                const cacheField = User.f.NAME
                const householdId = uniqid()

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : userOneData.name,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid,
                    }
                })

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : userOneData.name,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid,
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)


                const change = {
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedUsersOnUpdate(change)
                
                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]
                const expectedHouseholdDoc = {}

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })

            it('Name should be cached on related household when Name is added', async () => {

                const cacheField = User.f.NAME
                const householdId = uniqid()

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid,
                    }
                })

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : userOneData.name,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid,
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)

                const change = {
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedUsersOnUpdate(change)
                
                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]
                const expectedHouseholdDoc = {
                    [Models.USER]: {
                        [userOneData.uid] : {
                            [cacheField] : userOneData.name
                        }
                    }
                }

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })

            it('Name should be cached on related household when Name is changed', async () => {

                const cacheField = User.f.NAME
                const householdId = uniqid()

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : 'Bobby',
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid,
                    }
                })

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : userOneData.name,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid,
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)


                const change = {
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedUsersOnUpdate(change)
                
                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]
                const expectedHouseholdDoc = {
                    [Models.USER]: {
                        [userOneData.uid] : {
                            [cacheField] : userOneData.name
                        }
                    }
                }

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })

            it('Should create cache of field "name" on newly added Household', async() => {
               
                const householdId = uniqid()

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [User.f.NAME] : userOneData.name,
                    },
                    ref : {
                        id : userOneData.uid
                    }
                })

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [User.f.NAME] : userOneData.name,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)


                const change = {
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedUsersOnUpdate(change)

                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]

                const expectedHouseholdDoc = {
                    [Models.USER]: {
                        [userOneData.uid] : {
                            [User.f.NAME] : userOneData.name
                        }
                    }
                }

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })

            it('Should create cache of field "email" on newly added Household', async() => {
               
                const householdId = uniqid()

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [User.f.EMAIL] : userOneData.email,
                    },
                    ref : {
                        id : userOneData.uid
                    }
                })

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [User.f.EMAIL] : userOneData.email,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : userOneData.uid
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)


                const change = {
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedUsersOnUpdate(change)

                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]

                const expectedHouseholdDoc = {
                    [Models.USER]: {
                        [userOneData.uid] : {
                            [User.f.EMAIL] : userOneData.email
                        }
                    }
                }

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })

            it('Changes to FCM_tokens should be cached onto Sensors_secure', async () => {
    
                const cacheField = User.f.FCM_TOKENS._
                const FCMToken = uniqid()
                const sensorId = uniqid()

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {}
                
                const beforeUserDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Models.SENSOR] : {
                            [sensorId] : true
                        }
                    },
                    ref : {
                        id : userOneData.uid,
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
                        id : userOneData.uid,
                    }
                })

                const wrappedUsersOnUpdate = test.wrap(myFunctions.ctrlUsersOnUpdate)

                const change = {
                    before : beforeUserDocSnap,
                    after : afterUserDocSnap
                }

                await wrappedUsersOnUpdate(change)
                
                const sensorSecureDoc = firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]
                
                const expectedSensorSecureDoc = {
                    [Models.USER]: {
                        [userOneData.uid] : {
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

    describe('Households', () => {

        describe('On Create', () => { 
            
            it('Pivot between user and household should recieve a role property of admin', async () => {
                
                const householdId = uniqid()

                firestoreStub.data()[`${Models.USER}/${userOneData.uid}`] = {
                    id: userOneData.uid,
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Models.USER] : {
                            [userOneData.uid] : true
                        }
                    },
                    ref : {
                        id : householdId
                    }
                })

                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                await wrappedHouseholdsOnCreate(householdSnap)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userOneData.uid}`]

                const expectedUserDoc = {
                    id: userOneData.uid,
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

                firestoreStub.data()[`${Models.USER}/${userOneData.uid}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdIdOne
                    }
                }

                const householdSnap = new OfflineDocumentSnapshotStub({
                    data : { [Models.USER] : { [userOneData.uid] : true } },
                    ref: {
                        id : householdIdTwo,
                        delete : () => {
                            return
                        }
                    }
                })

                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                await wrappedHouseholdsOnCreate(householdSnap)

                expect(firestoreStub.data()[`${Models.USER}/${userOneData.uid}`])
                    .to.deep.equal({
                        [Models.HOUSEHOLD] : {
                            id : householdIdOne
                        }
                    })
            })
        })

        describe('On Update', () => {

            it('Should create relation between newly added sensor and already added users if reation is accepted', async () => {
                const wrappedHouseholdsOnUpdate = test.wrap(myFunctions.ctrlHouseholdsOnUpdate)

                const householdId = uniqid()
                const sensorId = uniqid()
                const userId = uniqid()

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId,
                        [Relations.PIVOT] : {
                            accepted : true
                        }
                    }
                }

                const householdDoc = {
                    [Models.SENSOR] : {
                        [sensorId] : true
                    },
                    [Models.USER] : {
                        [userId] : true
                    }
                }

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : householdDoc,
                    ref : {
                        id : householdId
                    }
                })

                const change = {
                    before : new OfflineDocumentSnapshotStub(),
                    after : afterDocSnap
                }

                await wrappedHouseholdsOnUpdate(change)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]
                const expectedUserDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId,
                        [Relations.PIVOT] : {
                            accepted : true
                        }
                    },
                    [Models.SENSOR] : {
                        [sensorId] : true
                    }
                }

                expect(userDoc).is.deep.equal(expectedUserDoc)

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`]

                expect(sensorDoc[Models.USER][userId]).to.exist

                const sensorUserDoc = firestoreStub.data()[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]
                const expectedSensorUserDoc = {
                    [Models.SENSOR] : {
                        id : sensorId
                    },
                    [Models.USER] : {
                        id : userId
                    }
                }

                expect(sensorUserDoc).to.be.deep.equal(expectedSensorUserDoc)
            })

            it('Should not create relation between newly added Sensor and already added User if reation is not accepted', async () => {
                const wrappedHouseholdsOnUpdate = test.wrap(myFunctions.ctrlHouseholdsOnUpdate)

                const householdId = uniqid()
                const sensorId = uniqid()
                const userId = uniqid()

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdDoc = {
                    [Models.SENSOR] : {
                        [sensorId] : true
                    },
                    [Models.USER] : {
                        [userId] : true
                    }
                }

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : householdDoc,
                    ref : {
                        id : householdId
                    }
                })

                const change = {
                    before : new OfflineDocumentSnapshotStub(),
                    after : afterDocSnap
                }

                await wrappedHouseholdsOnUpdate(change)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                expect(userDoc[Models.SENSOR]).to.be.undefined

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`]

                expect(sensorDoc).to.not.exist

                const sensorUserDoc = firestoreStub.data()[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                expect(sensorUserDoc).to.not.exist
            })

            it('Should be able to correct relations between newly added Sensor and Users that either have or have not accepted the relation to the Household', async () => {
                const wrappedHouseholdsOnUpdate = test.wrap(myFunctions.ctrlHouseholdsOnUpdate)

                const householdId = uniqid()
                const sensorId = uniqid()
                const userId = uniqid()
                const userTwoId = uniqid()

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.USER}/${userTwoId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId,
                        [Relations.PIVOT] : {
                            accepted : true
                        }
                    }
                }

                const householdDoc = {
                    [Models.SENSOR] : {
                        [sensorId] : true
                    },
                    [Models.USER] : {
                        [userId] : true,
                        [userTwoId] : true
                    }
                }

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : householdDoc,
                    ref : {
                        id : householdId
                    }
                })

                const change = {
                    before : new OfflineDocumentSnapshotStub(),
                    after : afterDocSnap
                }

                await wrappedHouseholdsOnUpdate(change)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                expect(userDoc[Models.SENSOR]).to.be.undefined

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`]

                expect(sensorDoc[Models.USER][userId]).to.undefined

                const sensorUserDoc = firestoreStub.data()[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                expect(sensorUserDoc).to.not.exist

                const userTwoDoc = firestoreStub.data()[`${Models.USER}/${userTwoId}`]
                const expectedUserTwoDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId,
                        [Relations.PIVOT] : {
                            accepted : true
                        }
                    },
                    [Models.SENSOR] : {
                        [sensorId] : true
                    }
                }

                expect(userTwoDoc).is.deep.equal(expectedUserTwoDoc)

                expect(sensorDoc[Models.USER][userTwoId]).to.exist

                const sensorUserTwoDoc = firestoreStub.data()[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userTwoId}`]
                const expectedSensorUserTwoDoc = {
                    [Models.SENSOR] : {
                        id : sensorId
                    },
                    [Models.USER] : {
                        id : userTwoId
                    }
                }

                expect(sensorUserTwoDoc).to.be.deep.equal(expectedSensorUserTwoDoc)
            })
        })

        describe('On Delete', () => {

            it('Should delete relations to all Users when deleted', async () => {
                const wrappedHouseholdsOnDelete = test.wrap(myFunctions.ctrlHouseholdsOnDelete)

                const userId = uniqid()
                const userIdTwo = uniqid()
                const householdId = uniqid()

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.USER}/${userIdTwo}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        update : () => {
                            return null
                        },
                    },
                    data : {
                        [Models.USER] : {
                            [userId] : true,
                            [userIdTwo] : true
                        }
                    }
                })

                await wrappedHouseholdsOnDelete(householdSnap)
 
                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]
                const expectedUserDoc = {}

                const userTwoDoc = firestoreStub.data()[`${Models.USER}/${userIdTwo}`]
                const expectedUserTwoDoc = {}

                expect(userDoc).to.be.deep.equal(expectedUserDoc)
                expect(userTwoDoc).to.be.deep.equal(expectedUserTwoDoc)
            })
            
            it('Should delete relations to all Sensors when deleted and delete Sensors', async () => {
                const wrappedHouseholdsOnDelete = test.wrap(myFunctions.ctrlHouseholdsOnDelete)

                const householdId = uniqid()
                const sensorId = uniqid()
                const sensorIdTwo = uniqid()

                firestoreStub.data()[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.SENSOR}/${sensorIdTwo}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        update : () => {
                            return null
                        },
                    },
                    data : {
                        [Models.SENSOR] : {
                            [sensorId] : true,
                            [sensorIdTwo] : true
                        }
                    }
                })

                await wrappedHouseholdsOnDelete(householdSnap)

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`]

                const sensorTwoDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorIdTwo}`]

                expect(sensorDoc).to.be.undefined
                expect(sensorTwoDoc).to.be.undefined
            })

            it('Should delete relations to all Base Station when deleted', async () => {
                const wrappedHouseholdsOnDelete = test.wrap(myFunctions.ctrlHouseholdsOnDelete)

                const householdId = uniqid()
                const baseStationId = uniqid()
                const baseStationIdTwo = uniqid()

                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationIdTwo}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        update : () => {
                            return null
                        },
                    },
                    data : {
                        [Models.BASE_STATION] : {
                            [baseStationId] : true,
                            [baseStationIdTwo] : true
                        }
                    }
                })

                await wrappedHouseholdsOnDelete(householdSnap)

                const baseStationDoc = firestoreStub.data()[`${Models.BASE_STATION}/${baseStationId}`]
                const expectedBaseStationDoc = {}

                const baseStationTwoDoc = firestoreStub.data()[`${Models.BASE_STATION}/${baseStationIdTwo}`]
                const expectedBaseStationTwoDoc = {}

                expect(baseStationDoc).to.be.deep.equal(expectedBaseStationDoc)
                expect(baseStationTwoDoc).to.be.deep.equal(expectedBaseStationTwoDoc)
            })
        })
    })

    describe('Sensors', () => {

        const sensorId = uniqid()
                
        describe('On Create', async () => { 

            it('Should create Secure Sensor collection', async () => {

                const wrappedSensorsOnCreate = test.wrap(myFunctions.ctrlSensorsOnCreate)

                const sensorSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        id : sensorId,
                        update : () => {
                            return
                        }
                    }
                })

                await wrappedSensorsOnCreate(sensorSnap)

                const sensorSecureDoc = firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]

                expect(sensorSecureDoc).to.not.be.undefined
            })

            // it('Should create cache of field "name" on Household', async() => {
               
            //     const wrappedSensorsOnCreate = test.wrap(myFunctions.ctrlSensorsOnCreate)

            //     const householdId = uniqid()
            //     const sensorName = faker.name.jobDescriptor()

            //     firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

            //     const sensorSnap = new OfflineDocumentSnapshotStub({
            //         ref: {
            //             id : sensorId,
            //             update : () => {
            //                 return
            //             }
            //         }, data: {
            //             [Sensor.f.NAME] : sensorName,
            //             [Models.HOUSEHOLD] : {
            //                 id : householdId
            //             }
            //         }
            //     })

            //     printFormattedJson(firestoreStub.data())

            //     await wrappedSensorsOnCreate(sensorSnap)

            //     printFormattedJson(firestoreStub.data())

            //     const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]

            //     const expectedHouseholdDoc = {
            //         [Models.SENSOR]: {
            //             [sensorId] : {
            //                 [Sensor.f.NAME] : sensorName
            //             }
            //         }
            //     }

            //     expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            // })
        })

        describe('On Update', async () => {

            it('Should create cache of field "name" on newly added Household', async() => {
               
                const householdId = uniqid()
                const sensorName = faker.name.jobType()

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Sensor.f.NAME] : sensorName,
                    },
                    ref : {
                        id : sensorId
                    }
                })

                const afterDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Sensor.f.NAME] : sensorName,
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : sensorId
                    }
                })

                const wrappedSensorsOnUpdate = test.wrap(myFunctions.ctrlSensorsOnUpdate)

                const change = {
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedSensorsOnUpdate(change)

                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]

                const expectedHouseholdDoc = {
                    [Models.SENSOR]: {
                        [sensorId] : {
                            [Sensor.f.NAME] : sensorName
                        }
                    }
                }

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })
        })

        describe('On Delete', async () => { 

            it('When Sensor is delete the secure data should also be deleted', async () => {
                const wrappedSensorsOnDelete = test.wrap(myFunctions.ctrlSensorsOnDelete)

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {}

                const sensorSnap = new OfflineDocumentSnapshotStub({
                    ref: {
                        id : sensorId,
                        update : () => {
                            return
                        }
                    }
                })

                await wrappedSensorsOnDelete(sensorSnap)

                const sensorSecureDoc = firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]

                expect(sensorSecureDoc).to.be.undefined
            })
        })
    })

    describe('Sensors-Users-Relation', () => {

        it('Mute should be cached on related Sensor', async () => {
            
            const userId        = uniqid()
            const sensorId      = uniqid()
            const cacheField    = Sensor.f.USERS.MUTED
            const pivotId       = `${sensorId}_${userId}`

            const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.ctrlSensorsUsersOnUpdate)

            // mock data
            firestoreStub.data()[`${Models.SENSOR}/${sensorId}`] = {
                [Models.USER] : {
                    [userId] : true
                }
            }

            firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
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
            
            const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`]
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

        it('Should cache Muted field to Sensor Secure data', async () => {
            
            const userId        = uniqid()
            const sensorId      = uniqid()
            const pivotId       = `${sensorId}_${userId}`

            const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.ctrlSensorsUsersOnUpdate)

            // mock data
            firestoreStub.data()[`${Models.SENSOR}/${sensorId}`] = {
                [Models.USER] : {
                    [userId] : true
                }
            }
            firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
                [Models.USER] : {
                    [userId] : true
                }
            }

            const afterDocSnap = new OfflineDocumentSnapshotStub({
                data : {
                    [Relations.PIVOT] : {
                        [Sensor.f.USERS.MUTED] : true
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
            
            const sensorSecureDoc = firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]
            const expectedSensorSecureDoc = {
                [Models.USER]: {
                    [userId] : {
                        [Relations.PIVOT] : {
                            [Sensor.f.USERS.MUTED] : true
                        }
                    }
                }
            }
            
            expect(sensorSecureDoc).to.deep.equal(expectedSensorSecureDoc)
        })
    })

    describe('Pub/Sub', () => {
        
        const nullBuffer            = new Buffer('')       
        const householdId           = uniqid()
        const baseStationUUID       = fakeUUID()
        const baseStationTwoUUID    = fakeUUID()
        const sensorOneUUID         = fakeUUID()

        const baseStationPin        = uniqid()
        const baseStationTwoPin     = uniqid()

        let baseStationPins = []
        let baseStationPinCount = 0

        function getNextPinCode () {
            const code = (baseStationPins[baseStationPinCount]) ? baseStationPins[baseStationPinCount] : uniqid()
            baseStationPinCount++
            return code
        }

        before(() => {
            sinon.stub(randomstring, 'generate').get(() => {
                return () => {
                    return getNextPinCode()
                }
            })
        })

        beforeEach(() => {
            messagingSendToDeviceSpy.resetHistory()
            firestoreStub.reset()
            baseStationPins = []
            baseStationPinCount = 0
        })

        describe('Topic: Base Station New Sensor', () => {

            it('Sending a message with no Base Station UUID should fail', async () => {

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                let error = null
                
                try{

                    await wrappedPubsubBaseStationNewSensor({
                            data: nullBuffer,
                            attributes: {
                                sensor_UUID: sensorOneUUID
                            }}
                        )
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.MODEL_NOT_FOUND)

                expect(firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
            })

            it('Sending a message with no Sensor UUID should fail', async () => {

                // mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
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

                expect(firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
            })

            it('Sending a message with no attributes should fail', async () => {

                // mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                let error

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                
                try{

                    await wrappedPubsubBaseStationNewSensor({
                            data: nullBuffer
                        })
                }
                catch(e) {
                    error = e
                }

                expect(error).to.exist
                expect(firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
            })

            it('Sending a message with a Base Station UUID not found in the database should fail', async () => {

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                let error = null

                try{

                    await wrappedPubsubBaseStationNewSensor({
                        data: nullBuffer,
                        attributes: {
                            base_station_UUID : baseStationUUID,
                            sensor_UUID: sensorOneUUID
                        }}
                    )
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.MODEL_NOT_FOUND)

                expect(firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
            })
            
            it('Sending a message with a Base Station UUID of Base Station not claimed should fail', async () => {

                // mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {}

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                let error = null

                try{

                    await wrappedPubsubBaseStationNewSensor({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationUUID,
                                sensor_UUID: sensorOneUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.BASE_STATION_NOT_CLAIMED)

                expect(firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]).to.exist
            })

            it('Should not override Sensor if Sensor with UUID is already created', async () => {

                // mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    },
                    [Sensor.f.EVENT] : true
                }
                
                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)
                let error = null

                try{

                    await wrappedPubsubBaseStationNewSensor({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationUUID,
                                sensor_UUID: sensorOneUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]

                const expectedSensorDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    },
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
                expect(error).to.not.exist
            })

            it('Sending a message should create a Sensor related to the claiming Household', async () => {

                // mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }
                firestoreStub.setInjectionIds([
                    sensorOneUUID,
                    sensorOneUUID,
                    sensorOneUUID
                ])

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)

                await wrappedPubsubBaseStationNewSensor({
                        data: nullBuffer,
                        attributes: {
                            base_station_UUID : baseStationUUID,
                            sensor_UUID: sensorOneUUID
                        }}
                    )
                
                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]
                const expectedHouseholdDoc = {
                    [Models.SENSOR] : {
                        [sensorOneUUID] : true
                    }
                }

                expect(householdDoc).to.be.deep.equal(expectedHouseholdDoc)
                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
            })
        })

        describe('Topic: Base Station Init', () => {

            it('Sending a message with no Base Station UUID should fail', async () => {
                const wrappedPubsubBaseStationInit = test.wrap(myFunctions.pubsubBaseStationInit)

                let error = null
                
                try{
                    await wrappedPubsubBaseStationInit({
                            data: nullBuffer,
                            attributes: {}
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.DATA_MISSING)

                expect(firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]).to.not.exist
            })

            it('Should throw error if Base Station with UUID already exists', async () => {

                const pin = uniqid()

                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [BaseStation.f.PIN] : pin
                }

                const wrappedPubsubBaseStationInit = test.wrap(myFunctions.pubsubBaseStationInit)

                let error = null
                
                try{

                    await wrappedPubsubBaseStationInit({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.not.be.null

                const baseStationDoc = firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]
                const expectedBaseStationDoc = {
                    [BaseStation.f.PIN] : pin
                }

                expect(baseStationDoc).to.be.deep.equal(expectedBaseStationDoc)
            })

            it('Should create Base Station', async () => {
                const wrappedPubsubBaseStationInit = test.wrap(myFunctions.pubsubBaseStationInit)

                let error = null
                
                try{

                    await wrappedPubsubBaseStationInit({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.null
                expect(firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]).to.exist
            })

            it('Should create Base Station with a unique pin code', async () => {
                
                baseStationPins = [
                    baseStationPin
                ]
                
                const wrappedPubsubBaseStationInit = test.wrap(myFunctions.pubsubBaseStationInit)

                let error = null
                
                try{

                    await wrappedPubsubBaseStationInit({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.null
               
                const baseStationDoc = firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`]
                const expectedBaseStationDoc = {
                    [BaseStation.f.PIN] : baseStationPin
                }

                expect(baseStationDoc).to.be.deep.equal(expectedBaseStationDoc)
            })

            it('Should make sure no two Base Stations get assigned the same code', async () => {
                
                //mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [BaseStation.f.PIN] : baseStationPin
                }

                baseStationPins = [
                    baseStationPin,
                    baseStationTwoPin
                ]
                
                const wrappedPubsubBaseStationInit = test.wrap(myFunctions.pubsubBaseStationInit)
                let error = null
                
                try{

                    await wrappedPubsubBaseStationInit({
                            data: nullBuffer,
                            attributes: {
                                base_station_UUID : baseStationTwoUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.null
               
                const baseStationDoc = firestoreStub.data()[`${Models.BASE_STATION}/${baseStationTwoUUID}`]
                const expectedBaseStationDoc = {
                    [BaseStation.f.PIN] : baseStationTwoPin
                }

                expect(baseStationDoc).to.be.deep.equal(expectedBaseStationDoc)
            })
        })


        describe('Topic: Sensor Notification', () => {

            const FCMTokenOne  = uniqid()
            const FCMTokenTwo  = uniqid()

            it('Sending a message with no Sensor UUID should fail', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)
                
                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {}
                })

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('If user has muted sensor, no notification should be send, but event should be registered on sensor', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS 
                                }
                            },
                            [Relations.PIVOT] : {
                                [Sensor.f.USERS.MUTED] : true
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Should not send notification if FCM tokens are not cached to the Sensor secure data', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {}
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Should send notification with `Unconfigured sensor` title if sensor has no Name field (Android)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.LOCATION] : 'living room'
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true,
                    [Sensor.f.LOCATION] : 'living room'
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.data.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title `Unconfigured sensor` if sensor has no Name field (iOS)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.LOCATION] : 'living room'
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })
                
                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.LOCATION] : 'living room',
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.notification.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title `Unconfigured sensor` if sensor has no Location field (Android)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : 'sensor'
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.NAME] : 'sensor',
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.data.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title `Unconfigured sensor` if sensor has no Location field (iOS)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : 'sensor'
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.NAME] : 'sensor',
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(payload.notification.title).is.equal('Unconfigured sensor')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with title `Sensor lyder i stuen` (iOS)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                const sensorName = 'sensor'
                const sensorLocation = 'stuen'

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true,
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

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
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation,
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const payload = messagingSendToDeviceSpy.args[0][1]

                const generatedTitle = _.capitalize(`${sensorName} lyder i ${sensorLocation}`)

                expect(payload.data.title).is.equal(generatedTitle)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send notification with Android payload if FCM_tokens specify the context of Android', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {}

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.ANDROID
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const sendToTokens = messagingSendToDeviceSpy.args[0][0]
                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(sendToTokens).to.include(FCMTokenOne)
                expect(_.keys(payload)).to.not.include('notification')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })
            
            it('Should send notification with IOS payload if FCM_tokens specify the context of IOS', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {}

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                                }
                            }
                        }
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)

                const sendToTokens = messagingSendToDeviceSpy.args[0][0]
                const payload = messagingSendToDeviceSpy.args[0][1]

                expect(sendToTokens).to.include(FCMTokenOne)
                expect(_.keys(payload)).to.include('notification')
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(1)
            })

            it('Should send two notifications if the context of some FCM_tokens specified as IOS and Android', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`] = {}

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [userOneData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                                }
                            }
                        },
                        [userTwoData.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenTwo] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.ANDROID
                                }
                            }
                        }

                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).is.deep.equal(expectedSensorDoc)
                
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
        })
    })
})