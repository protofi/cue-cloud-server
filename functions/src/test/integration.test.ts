import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'
import User from './lib/ORM/Models/User';
import { Models } from './lib/ORM/Models';
import * as _ from 'lodash'
import { unflatten } from 'flat'
import Household from './lib/ORM/Models/Household';
import { Relations, Roles, Errors } from './lib/const';
import GrandOneUserHouseholdAdminPrivileges from './lib/Command/GrandOneUserHouseholdAdminPrivileges';
import UpdateCustomClaims from './lib/Command/UpdateCustomClaims';
import UpdateFCMTokenSecureCache from './lib/Command/UpdateFCMTokenSecureCache';
import CreateUserNewSensorRelationsCommand from './lib/Command/CreateUserNewSensorRelationsCommand';
import CreateUserSensorRelationsCommand from './lib/Command/CreateUserSensorRelationsCommand';
import { printFormattedJson } from './lib/util';
import { FirestoreStub } from './stubs';

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('Integration_Test', () => {

    const firestoreStub = new FirestoreStub()
    let adminInitStub: sinon.SinonStub
    let adminFirestoreStub: sinon.SinonStub
    let adminAuthStub: sinon.SinonStub
    const setCustomUserClaimsSpy = sinon.spy()

    before(async () => {

        adminInitStub = sinon.stub(admin, 'initializeApp')

        adminFirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return firestoreStub.get()
            }
        })

        adminAuthStub = sinon.stub(admin, 'auth')
        .get(() => {
            return () => {
                return {
                    setCustomUserClaims : setCustomUserClaimsSpy
                }
            }
        })

    })

    afterEach(async () => {
        firestoreStub.reset()
    })

    after(async () => {
        adminInitStub.restore()
        adminFirestoreStub.restore()
        adminAuthStub.restore()
    })

    describe('Actionable Field Commands', async () => {

        describe('Create-User-Sensor-Relations-Command', () => {

            const command       = new CreateUserSensorRelationsCommand()
            const householdId   = uniqid()
            const sensorId      = uniqid()
            const userId        = uniqid()
            let user: User

            beforeEach(() => {

                user = new User(firestoreStub.get(), null, userId)

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.SENSOR}/${sensorId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {
                    [Models.SENSOR] : {
                        [sensorId] : true
                    }
                }
            })

            it('Should not create relation between Users and Sensors of Household if value is not string:true', async () => {
                await command.execute(user, 'false')

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                expect(userDoc).to.deep.equals(expectedUserDoc)
            })

            it('Should throw error if value of not a Stringified boolean', async () => {

                let error = null

                try{
                    await command.execute(user, 'some-value')
                }
                catch(e)
                {
                    error = e
                }

                expect(error).to.not.be.null

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                expect(userDoc).to.deep.equals(expectedUserDoc)
            })

            it('Should not create relation between Users and Sensors of Household if Household relation does not exist', async () => {

                //delete mock data
                delete firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`][Models.SENSOR]

                await command.execute(user, 'true')

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                expect(userDoc).to.deep.equals(expectedUserDoc)
            })

            it('Should not create relation between Users and Sensors of Household if no Sensor relations exists', async () => {

                //delete mock data
                delete firestoreStub.data()[`${Models.USER}/${userId}`][Models.HOUSEHOLD]

                await command.execute(user, 'true')

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {}

                expect(userDoc).to.deep.equals(expectedUserDoc)
            })

            it('Should not create relation between Users and Sensors of Household if value is true', async () => {

                await command.execute(user, 'true')

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`][Models.SENSOR]

                const expectedUserDoc = {
                    [sensorId] : true
                }

                expect(userDoc).to.deep.equals(expectedUserDoc)

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`][Models.USER]

                const expectedSensorDoc = {
                    [userId] : {
                        id : userId
                    }
                }

                expect(sensorDoc).to.deep.equals(expectedSensorDoc)

                const pivotDoc = firestoreStub.data()[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                const expectedPivotDoc = {
                    [Models.USER] : {
                        id : userId
                    },
                    [Models.SENSOR] : {
                        id : sensorId
                    }
                }

                expect(pivotDoc).to.deep.equals(expectedPivotDoc)
            })
        })

        describe('Create-User-New-Sensor-Relations-Command', () => {
            
            const userId        = uniqid()
            const householdId   = uniqid()
            const sensorId      = uniqid()
            const command       = new CreateUserNewSensorRelationsCommand()
            let household: Household

            beforeEach(() => {

                household = new Household(firestoreStub.get(), null, householdId)

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {
                    [Models.USER] : {
                        [userId] : true
                    }
                }

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        [Relations.PIVOT] : {
                            accepted : true
                        }
                    }
                }
            })

            it('Execution should add relational links from the User to the Sensors of the Household', async () => {

                await command.execute(household, {[sensorId] : true})

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {
                    [Models.HOUSEHOLD] : {
                        [Relations.PIVOT] : {
                            accepted : true
                        }
                    },
                    [Models.SENSOR] : {
                        [sensorId] : true
                    }
                }

                expect(expectedUserDoc).to.be.deep.equal(userDoc)
            })

            it('Execution should add relational links from the Sensors to the Users of the Household', async () => {

                await command.execute(household, {[sensorId] : true})

                const sensorDoc = firestoreStub.data()[`${Models.SENSOR}/${sensorId}`]

                const expectedSensorDoc = {
                    [Models.USER] : {
                        [userId] : {
                            id : userId
                        }
                    }
                }

                expect(expectedSensorDoc).to.be.deep.equal(sensorDoc)
            })

            it('Execution should create Pivot collections between Sensors and Users of the Household', async () => {

                await command.execute(household, {[sensorId] : true})

                const sensorUserDoc = firestoreStub.data()[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                const expectedSensorUserDoc = {
                    [Models.USER] : {
                        id : userId
                    },
                    [Models.SENSOR] : {
                        id : sensorId
                    }
                }

                expect(expectedSensorUserDoc).to.be.deep.equal(sensorUserDoc)
            })

            it('New sensors added to the Household should not be added to Users not having accepted the Household invitaion' , async () => {
                firestoreStub.data()[`${Models.USER}/${userId}`] = {}

                await command.execute(household, {[sensorId] : true})

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]
                const expectedUserDoc = {}

                expect(userDoc).to.be.deep.equal(expectedUserDoc)
            })
        })
    })

    describe('Model Commands', async () => {

        describe('Grand One User Household Admin Privileges', () => {

            const householdId   = uniqid()
            const userId        = uniqid()
            const command       = new GrandOneUserHouseholdAdminPrivileges()
            let household : Household

            beforeEach(() => {

                household = new Household(firestoreStub.get(), null, householdId)

                firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`] = {
                    [Models.USER] : {
                        [userId] : true
                    }
                }
            })
            
            it('Execution should not create a Pivot field between the first User and the Household if the User is not member of any household', async () => {

                firestoreStub.data()[`${Models.USER}/${userId}`] = {}

                let error: Error

                try{
                    await command.execute(household)
                }
                catch(e)
                {
                    error = e
                }

                expect(error).to.exist
                expect(error.message).to.be.equal(Errors.NOT_RELATED)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {}

                expect(expectedUserDoc).to.be.deep.equal(userDoc)
            })

            it('Execution should delete the newly created Household if the User is not member of any household', async () => {

                firestoreStub.data()[`${Models.USER}/${userId}`] = {}

                let error: Error

                try{
                    await command.execute(household)
                }
                catch(e)
                {
                    error = e
                }

                expect(error).to.exist
                expect(error.message).to.be.equal(Errors.NOT_RELATED)

                const householdDoc = firestoreStub.data()[`${Models.HOUSEHOLD}/${householdId}`]

                expect(householdDoc).to.not.exist
            })

            it('Execution should not create a Pivot field between the first User and the Household if the User already are member of another household', async () => {

                const differentHousehold = uniqid()
                
                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : differentHousehold
                    }
                }

                let error: Error

                try{
                    await command.execute(household)
                }
                catch(e)
                {
                    error = e
                }

                expect(error.message).to.be.equal(Errors.UNAUTHORIZED)

                const sensorUserDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedSensorUserDoc = {
                    [Models.HOUSEHOLD] : {
                        id : differentHousehold
                    }
                }

                expect(expectedSensorUserDoc).to.be.deep.equal(sensorUserDoc)
            })

                it('Execution should create a Pivot field between the first User and the household', async () => {

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        id : householdId
                    }
                }

                await command.execute(household)

                const userDoc = firestoreStub.data()[`${Models.USER}/${userId}`]

                const expectedUserDoc = {
                    [Models.HOUSEHOLD] : {
                        id : householdId,
                        [Relations.PIVOT] : {
                            role: Roles.ADMIN,
                            accepted: true
                        }
                    }
                }

                expect(expectedUserDoc).to.be.deep.equal(userDoc)
            })
        })

        describe('Update FCM Token Secure Cache', () => {
            const command       = new UpdateFCMTokenSecureCache()

            const userId        = uniqid()
            const sensorOneId   = uniqid()
            const FCMToken      = uniqid()
            const sensorTwoId   = uniqid()
            const user : User   = new User(firestoreStub.get(), null, userId)

            it('When a new sensor is added to the User, FCM token should be cached to the Sensors secure data', async () => {

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.SENSOR] : {
                        [sensorOneId] : true
                    },
                    FCM_tokens : {
                        [FCMToken] : true
                    }
                }

                firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneId}`] = {}

                const changes = {
                    [sensorOneId] : true
                }

                await command.execute(user, changes)

                const sensorSecureDoc = firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneId}`]
                const expectedSensorSecureDoc = {
                    [Models.USER] : {
                        [userId] : {
                            [User.f.FCM_TOKENS._] : {
                                [FCMToken] : true      
                            }
                        }
                    }
                }

                expect(sensorSecureDoc).to.be.deep.equal(expectedSensorSecureDoc)                    
            })

            // it('When a sensor is removed from a User, FCM tokens should be removed from the Sensors secure data', async () => {
                
            //     firestoreStub.data()[`${Models.USER}/${userId}`] = {
            //         [Models.SENSOR] : {
            //             [sensorOneId] : true
            //         },
            //         FCM_tokens : {
            //             [FCMToken] : true
            //         }
            //     }

            //     firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneId}`] = {
            //         [Models.USER] : {
            //             [userId] : {
            //                 FCM_tokens : {
            //                     [FCMToken] : true
            //                 }       
            //             }   
            //         }
            //     }

            //     const changes = {}

            //     await command.execute(user, changes)

            //     const sensorSecureDoc = firestoreStub.data()[`${Models.SENSOR}${Models.SECURE_SURFIX}/${sensorOneId}`]
            //     const expectedSensorSecureDoc = {
            //         [Models.USER] : {
            //             [userId] : {
            //                 [User.f.FCM_TOKENS._] : {
            //                     [FCMToken] : true      
            //                 }
            //             }
            //         }
            //     }

            //     expect(sensorSecureDoc).to.be.deep.equal(expectedSensorSecureDoc)                    
            // })
        })
        
        // describe('Update Custom Claims', () => {

        //     const command       = new UpdateCustomClaims()
        //     const userId        = uniqid()
        //     let user : User

        //     beforeEach(() => {

        //         user = new User(firestoreStub.get(), null, userId)
        //         firestoreStub.data()[`${Models.HOUSEHOLD}/${userId}`] = {}
        //     })

        //     it('', async () => {

        //         await command.execute(user, {}, {})
        //         return
        //     })
        // })
    })
})