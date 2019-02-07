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

describe('Integration_Test', () => {

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
                                else
                                {
                                    if(!_.isUndefined(firestoreMockData[`${col}/${_id}`])) throw Error('MODEL ALREADY EXISTS')
                                    
                                    firestoreMockData[`${col}/${_id}`] = unflatten(data)
                                }

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
                            update: async (data) => {
                                
                                if(!firestoreMockData[`${col}/${id}`]) throw Error(`Mock data is missing: [${`${col}/${id}`}]`)

                                _.forOwn(data, function(value, field) {
                                    if(!value)
                                    {
                                        delete firestoreMockData[`${col}/${id}`][field]
                                        delete data[field]
                                    }
                                })

                                firestoreMockData = _.merge(firestoreMockData, {
                                    [`${col}/${id}`] : unflatten(data)
                                })

                                return null
                            },
                            delete: async () => {
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

            it('Should not update Name cache on Household if Name is not changed', async () => {

                const cacheField = User.f.NAME
                const householdId = uniqid()

                firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
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
                    before : beforeDocSnap,
                    after : afterDocSnap
                }

                await wrappedUsersOnUpdate(change)
                
                const householdDoc = firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]
                const expectedHouseholdDoc = {}

                expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            })

            it('Name should be cached on related household when Name is added', async () => {

                const cacheField = User.f.NAME
                const householdId = uniqid()

                firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : testUserDataOne.uid,
                    }
                })

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
                    before : beforeDocSnap,
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

            it('Name should be cached on related household when Name is changed', async () => {

                const cacheField = User.f.NAME
                const householdId = uniqid()

                firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {}

                const beforeDocSnap = new OfflineDocumentSnapshotStub({
                    data : {
                        [cacheField] : 'Bobby',
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    },
                    ref : {
                        id : testUserDataOne.uid,
                    }
                })

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
                    before : beforeDocSnap,
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

            // it('Name should be cached on related Household when Household is linked to User', async () => {

            //     const cacheField = User.f.NAME
            //     const householdId = uniqid()

            //     firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {}

            //     const beforeDocSnap = new OfflineDocumentSnapshotStub({
            //         data : {
            //             [cacheField] : testUserDataOne.name,
            //         },
            //         ref : {
            //             id : testUserDataOne.uid,
            //         }
            //     })

            //     const afterDocSnap = new OfflineDocumentSnapshotStub({
            //         data : {
            //             [cacheField] : testUserDataOne.name,
            //             [Models.HOUSEHOLD] : {
            //                 id : householdId
            //             }
            //         },
            //         ref : {
            //             id : testUserDataOne.uid,
            //         }
            //     })

            //     const wrappedUsersOnUpdate = test.wrap(myFunctions.funcUsersOnUpdate)


            //     const change = {
            //         before : beforeDocSnap,
            //         after : afterDocSnap
            //     }

            //     await wrappedUsersOnUpdate(change)
                
            //     util.printFormattedJson(firestoreMockData)

            //     const householdDoc = firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]
            //     const expectedHouseholdDoc = {
            //         [Models.USER]: {
            //             [testUserDataOne.uid] : {
            //                 [cacheField] : testUserDataOne.name
            //             }
            //         }
            //     }

            //     expect(householdDoc).to.deep.equal(expectedHouseholdDoc)
            // })

            it('Changes to FCM_tokens should be cached onto Sensors_secure', async () => {
    
                const cacheField = User.f.FCM_TOKENS._
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

    describe('Households', () => {

        describe('On Create', () => { 
            
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

        describe('On Update', () => {

            it('Should create relation between newly added sensor and already added users if reation is accepted', async () => {
                const wrappedHouseholdsOnUpdate = test.wrap(myFunctions.funcHouseholdsOnUpdate)

                const householdId = uniqid()
                const sensorId = uniqid()
                const userId = uniqid()

                firestoreMockData[`${Models.USER}/${userId}`] = {
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

                const userDoc = firestoreMockData[`${Models.USER}/${userId}`]
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]

                expect(sensorDoc[Models.USER][userId]).to.exist

                const sensorUserDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]
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
                const wrappedHouseholdsOnUpdate = test.wrap(myFunctions.funcHouseholdsOnUpdate)

                const householdId = uniqid()
                const sensorId = uniqid()
                const userId = uniqid()

                firestoreMockData[`${Models.USER}/${userId}`] = {
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

                const userDoc = firestoreMockData[`${Models.USER}/${userId}`]

                expect(userDoc[Models.SENSOR]).to.be.undefined

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]

                expect(sensorDoc).to.not.exist

                const sensorUserDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                expect(sensorUserDoc).to.not.exist
            })

            it('Should be able to correct relations between newly added Sensor and Users that either have or have not accepted the relation to the Household', async () => {
                const wrappedHouseholdsOnUpdate = test.wrap(myFunctions.funcHouseholdsOnUpdate)

                const householdId = uniqid()
                const sensorId = uniqid()
                const userId = uniqid()
                const userTwoId = uniqid()

                firestoreMockData[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.USER}/${userTwoId}`] = {
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

                const userDoc = firestoreMockData[`${Models.USER}/${userId}`]

                expect(userDoc[Models.SENSOR]).to.be.undefined

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]

                expect(sensorDoc[Models.USER][userId]).to.undefined

                const sensorUserDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                expect(sensorUserDoc).to.not.exist

                const userTwoDoc = firestoreMockData[`${Models.USER}/${userTwoId}`]
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

                const sensorUserTwoDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userTwoId}`]
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
                const wrappedHouseholdsOnDelete = test.wrap(myFunctions.funcHouseholdsOnDelete)

                const userId = uniqid()
                const userIdTwo = uniqid()
                const householdId = uniqid()

                firestoreMockData[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.USER}/${userIdTwo}`] = {
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
 
                const userDoc = firestoreMockData[`${Models.USER}/${userId}`]
                const expectedUserDoc = {}

                const userTwoDoc = firestoreMockData[`${Models.USER}/${userIdTwo}`]
                const expectedUserTwoDoc = {}

                expect(userDoc).to.be.deep.equal(expectedUserDoc)
                expect(userTwoDoc).to.be.deep.equal(expectedUserTwoDoc)
            })
            
            it('Should delete relations to all Sensors when deleted and delete Sensors', async () => {
                const wrappedHouseholdsOnDelete = test.wrap(myFunctions.funcHouseholdsOnDelete)

                const householdId = uniqid()
                const sensorId = uniqid()
                const sensorIdTwo = uniqid()

                firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.SENSOR}/${sensorIdTwo}`] = {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]

                const sensorTwoDoc = firestoreMockData[`${Models.SENSOR}/${sensorIdTwo}`]

                expect(sensorDoc).to.be.undefined
                expect(sensorTwoDoc).to.be.undefined
            })

            it('Should delete relations to all Base Station when deleted', async () => {
                const wrappedHouseholdsOnDelete = test.wrap(myFunctions.funcHouseholdsOnDelete)

                const householdId = uniqid()
                const baseStationId = uniqid()
                const baseStationIdTwo = uniqid()

                firestoreMockData[`${Models.BASE_STATION}/${baseStationId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.BASE_STATION}/${baseStationIdTwo}`] = {
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

                const baseStationDoc = firestoreMockData[`${Models.BASE_STATION}/${baseStationId}`]
                const expectedBaseStationDoc = {}

                const baseStationTwoDoc = firestoreMockData[`${Models.BASE_STATION}/${baseStationIdTwo}`]
                const expectedBaseStationTwoDoc = {}

                expect(baseStationDoc).to.be.deep.equal(expectedBaseStationDoc)
                expect(baseStationTwoDoc).to.be.deep.equal(expectedBaseStationTwoDoc)
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
            const cacheField    = Sensor.f.USERS.MUTED
            const pivotId       = `${sensorId}_${userId}`

            const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.funcSensorsUsersOnUpdate)

            // mock data
            firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                [Models.USER] : {
                    [userId] : true
                }
            }

            firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
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

        it('Should cache Muted field to Sensor Secure data', async () => {
            
            const userId        = uniqid()
            const sensorId      = uniqid()
            const pivotId       = `${sensorId}_${userId}`

            const wrappedSensorsUsersOnUpdate = test.wrap(myFunctions.funcSensorsUsersOnUpdate)

            // mock data
            firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                [Models.USER] : {
                    [userId] : true
                }
            }
            firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`] = {
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
            
            const sensorSecureDoc = firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorId}`]
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
        
        const nullBuffer = new Buffer('')       
        const householdId       = uniqid()
        const baseStationUUID   = fakeUUID()
        const sensorOneUUID        = fakeUUID()

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
                                sensor_UUID: sensorOneUUID
                            }}
                        )
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.MODEL_NOT_FOUND)

                expect(firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
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

                expect(firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]).to.not.exist
            })

            it('Sending a message with no attributes should fail', async () => {

                // mock data
                firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
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
                expect(firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
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
                                sensor_UUID: sensorOneUUID
                            }}
                        )
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.MODEL_NOT_FOUND)

                expect(firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
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
                                sensor_UUID: sensorOneUUID
                            }
                        })
                }
                catch(e) {
                    error = e.message
                }

                expect(error).to.be.equal(Errors.BASE_STATION_NOT_CLAIMED)

                expect(firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]).to.not.exist
                expect(firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`]).to.exist
            })

            it('Should not override Sensor if Sensor with UUID is already created', async () => {

                // mock data
                firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]

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
                firestoreMockData[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                injectionIds = [
                    sensorOneUUID,
                    sensorOneUUID,
                    sensorOneUUID
                ]

                const wrappedPubsubBaseStationNewSensor = test.wrap(myFunctions.pubsubBaseStationNewSensor)

                await wrappedPubsubBaseStationNewSensor({
                        data: nullBuffer,
                        attributes: {
                            base_station_UUID : baseStationUUID,
                            sensor_UUID: sensorOneUUID
                        }}
                    )
                
                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                const householdDoc = firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`]
                const expectedHouseholdDoc = {
                    [Models.SENSOR] : {
                        [sensorOneUUID] : true
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
                    attributes: {}
                })

                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('If user has muted sensor, no notification should be send, but event should be registered on sensor', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Should not send notification if FCM tokens are not cached to the Sensor secure data', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {}
                    }
                }

                await wrappedPubsubSensorNotification({
                    data: new Buffer(''),
                    attributes: {
                        sensor_UUID : sensorOneUUID
                    }
                })

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
                const expectedSensorDoc = {
                    [Sensor.f.EVENT] : true
                }

                expect(sensorDoc).to.be.deep.equal(expectedSensorDoc)
                expect(messagingSendToDeviceSpy.callCount).to.be.equal(0)
            })

            it('Should send notification with `Unconfigured sensor` title if sensor has no Name field (Android)', async () => {
                const wrappedPubsubSensorNotification = test.wrap(myFunctions.pubsubSensorNotification)

                // mock data
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.LOCATION] : 'living room'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.LOCATION] : 'living room'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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
                
                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : 'sensor'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : 'sensor'
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {
                    [Sensor.f.NAME] : sensorName,
                    [Sensor.f.LOCATION] : sensorLocation
                }

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {}

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {}

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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
                firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`] = {}

                firestoreMockData[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneUUID}`] = {
                    [Models.USER] : {
                        [testUserDataOne.uid] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMTokenOne] : {
                                    [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                                }
                            }
                        },
                        [testUserDataTwo.uid] : {
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

                const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorOneUUID}`]
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