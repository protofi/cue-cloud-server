import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firestore from '@firebase/testing'
import { Models } from './lib/ORM/Models';
import { setup } from './helpers'
import { Roles } from './lib/const';

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('Emulated_Rules', () => {

    const testAdminUserData = {
        uid: "admin-user",
        name: "Admin",
        email: "admin@mail.com",
        isAdmin : true
    }

    const testSuperAdminUserData = {
        uid: "super-admin-user",
        name: "Super Admin",
        email: "superadmin@mail.com",
        isSuperAdmin : true
    }

    const testUserDataOne = {
        uid: "test-user-1",
        name: "Andy",
        email: "andy@mail.com",
    }

    const testUserDataTwo = {
        uid: "test-user-2",
        name: "Benny",
        email: "Benny@mail.com",
    }

    const testUserDataThree = {
        uid: "test-user-3",
        name: "Charlie",
        email: "Charlie@mail.com",
    }
    
    const testHouseDataOne = {
        uid: "test-household-1"
    }

    const testSensorDataOne = {
        uid: "test-sensor-1"
    }

    after(async () => {
        Promise.all(firestore.apps().map(app => app.delete()))
    })

    it('Writes to a random collection should fail', async () => {
        const db = await setup()

        const ref = db.collection('random-collection')
        expect(await firestore.assertFails(ref.add({})))
    })

    it('Reads from a random collection should fail', async () => {
        const db = await setup()

        const ref = db.collection('random-collection')
        expect(await firestore.assertFails(ref.get()))
    })

    describe('Users', async () => {

        describe('Create', async () => {
            
            it('Unautherized users should not be able to create new Users', async () => {
                const db = await setup()
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Users should not be able to create new Users', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Admin Users should not be able to create new Users', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Super Admin Users should not be able to create new Users', async () => {
                const db = await setup(testSuperAdminUserData)
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.add({})))
            })
        })

        describe('Read', async () => {
            
            it('Unautherized users should not be able to read data from users', async () => {
                const db = await setup(null, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataTwo.uid).get()))
            })

            it('Users should be able to read their own data', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).get()))
            })

            it('Users should not be able to read data on other users', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataTwo.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataTwo.uid).get()))
            })

            it('Admin users should be able to read data on other users', async () => {
                const db = await setup(testAdminUserData, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).get()))
            })

            it('Super Admin users should be able to read data on other users', async () => {
                const db = await setup(testSuperAdminUserData, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).get()))
            })
        })

        describe('Update', async () => {

            it('Unautherized Users should not be able to update data on users', async () => {
                const db = await setup(null, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataOne.uid).update({})))
            })

            it('Users should not be able to update data on other users', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataTwo.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataTwo.uid).update({
                    randomData : true
                })))
            })

            it('Users should not be able to update field: id', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataOne.uid).update({
                    id : '123'
                })))
            })

            it('Users should not be able to update field: claims', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataOne.uid).update({
                    claims : {}
                })))
            })

            it('Users should not be able to update field: email', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const userDoc = db.collection(Models.USER).doc(testUserDataOne.uid)

                expect(await firestore.assertFails(userDoc.update({
                    email : 'mail@mail.com'
                })))
            })

            it('Users should be able to update field: name', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const userDoc = db.collection(Models.USER).doc(testUserDataOne.uid)

                expect(await firestore.assertSucceeds(userDoc.update({
                    name : testUserDataOne.name
                })))
            })

            it('Users should be able to update data on the relation to a household', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            pivot : {}
                        }
                    }
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).update({
                    [Models.HOUSEHOLD]: {
                        pivot : {
                            randomData : true
                        }
                    }
                })))
            })

            it('Users should not be able to update their role in relation to a household', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            pivot : {
                                role : 'res'
                            }
                        }
                    }
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataOne.uid).update({
                    [Models.HOUSEHOLD]: {
                        pivot : {
                            role : Roles.ADMIN
                        }
                    }
                })))
            })

            it('Users should not be able to update the accecpted property in relation to a household to false', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : true
                    }
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(testUserDataOne.uid).update({
                    [Models.HOUSEHOLD]: {
                        pivot : {
                            accepted: false
                        }
                    }
                })))
            })

            it('Users should be able to change the accecpted property in relation to a household to true', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : true
                    }
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).update({
                    [Models.HOUSEHOLD]: {
                        pivot : {
                            accepted: true
                        }
                    }
                })))
            })

            it('Super Admin users should be able to update data on other users', async () => {
                const db = await setup(testSuperAdminUserData, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).get()))
            })
        })

        describe('Delete', async () => {

            it('Unautherized users should not be able the delete users', async () => {
                const db = await setup()

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Users should not be able the delete users', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc().delete()))
            })
        })
    })

    describe('Households', async () => {

        describe('Create', async () => {
        
            it('Unautherized users should not be able to create households', async () => {
                const db = await setup()
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Users should not be able to create households without a users property', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({})))
            })
            
            it('Users should be able to create households with a users property including ID ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertSucceeds(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true
                    }
                })))
            })

            it('Users should not be able to create households without a users property including ID ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataTwo.uid] : true
                    }
                })))
            })

            it('Users should not be able to create households with a users property including ID refs to other users', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true,
                        [testUserDataThree.uid] : true
                    }
                })))
            })
        })

        describe('Read', async () => {
            
            it('Unautherized users should not be able to read from Households', async () => {
                const db = await setup()

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc().get()
                ))
            })

            it('Users not included in a household should not be able to read data about it', async () => {
                const db = await setup(testUserDataOne)

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc().get()))
            })
        })

        describe('Update', async () => {

            it('User possessing the role of ADMIN should be able to add other users to a household', async () => {
            
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    },
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            pivot : {
                                role : Roles.ADMIN
                            }
                        }
                    }
                })

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertSucceeds(ref.doc(testHouseDataOne.uid).update({
                    [Models.USER]: {
                        [testUserDataTwo.uid] : true
                    }
                })))
            })
        })

        describe('Delete', async () => {

            it('Unautherized users should not be able the delete households', async () => {
                const db = await setup()

                const ref = db.collection(Models.HOUSEHOLD).doc(testHouseDataOne.uid)

                expect(await firestore.assertFails(ref.delete()))
            })

            it('Users should not be able the delete households', async () => {
                const db = await setup(testUserDataOne)

                const ref = db.collection(Models.HOUSEHOLD).doc()

                expect(await firestore.assertFails(ref.delete()))
            })

            it('Users should not be able the delete households', async () => {
                const db = await setup(testAdminUserData)

                const ref = db.collection(Models.HOUSEHOLD).doc(testHouseDataOne.uid)

                expect(await firestore.assertSucceeds(ref.delete()))
            })
        })
    })

    describe('Sensors', async () => {

        describe('Create', async () => {

            it('Unautherized users should not be able to create Sensors', async () => {
                const db = await setup()
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Users should not be able to create Sensors', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Admin Users should not be able to create Sensors', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Super Admin Users should not be able to create Sensors', async () => {
                const db = await setup(testSuperAdminUserData)
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })
        })
        
        describe('Read', async () => {

            it('Unautherized users should not be able to read data from Sensors', async () => {
                const db = await setup(null, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : {}
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc(testSensorDataOne.uid).get()))
            })

            it('Users should not be able to read data from non-related Sensors', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : {}
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc(testSensorDataOne.uid).get()))
            })

            it('Users should be able to read data from related Sensors', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertSucceeds(ref.doc(testSensorDataOne.uid).get()))
            })

            it('Admin users should be able to read data from Sensors', async () => {
                const db = await setup(testAdminUserData, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : {}
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertSucceeds(ref.doc(testSensorDataOne.uid).get()))
            })
        })
        
        describe('Update', async () => {
            
            it('Unautherized users should not be able to update data on Sensors', async () => {
                const db = await setup(null, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {}
                })
                
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc(testSensorDataOne.uid).update({})))
            })

            it('Users should not be able to update data on non-related Sensors', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : {}
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc(testSensorDataOne.uid).update({})))
            })

            it('Users should not be able to update field: id', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : { [testUserDataOne.uid] : true }
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc(testSensorDataOne.uid).update({
                    id : '123'
                })))
            })

            it('Users should not be able to update field: users', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : { [testUserDataOne.uid] : true }
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc(testSensorDataOne.uid).update({
                    users : {}
                })))
            })

            it('Users should be able to update data on related Sensors', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : { [testUserDataOne.uid] : true },
                    }
                })

                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertSucceeds(ref.doc(testSensorDataOne.uid).update({})))
            })

            it('Admin users should be able to update data on Sensors', async () => {
                const db = await setup(testAdminUserData, {
                    [`${Models.SENSOR}/${testSensorDataOne.uid}`] : {
                        users : {}
                    }
                })
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertSucceeds(ref.doc(testSensorDataOne.uid).update({})))
            })
        })
        
        describe('Delete', async () => {
            return
        })
    })

    describe('Sensors_Users', async () => {

        describe('Create', async () => {
            return
        })
        
        describe('Read', async () => {
            return
        })
        
        describe('Update', async () => {
            it('Unautherized users should not be able to update data on Sensors_Users relation', async () => {
                const db = await setup(null, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).update({})))
            })
        })
        
        describe('Delete', async () => {
            return
        })
    })
})