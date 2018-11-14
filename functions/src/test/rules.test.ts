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

describe('OFFLINE', () => {

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

    after(async () => {
        Promise.all(firestore.apps().map(app => app.delete()))
    })

    describe('Emulated_Rules', () => {

        it('Writes to a random collection should fail', async () => {
            const db = await setup()

            const ref = db.collection('random-collection')
            expect(await firestore.assertFails(ref.add({})))
        })

        describe('Households', async () => {

            it('Unautherized users should not be able to create households', async () => {
                const db = await setup()
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Autherized users should not be able to create households without a users property', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({})))
            })
            
            it('Autherized users should be able to create households with a users property including ID ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertSucceeds(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true
                    }
                })))
            })

            it('Autherized users should not be able to create households without a users property including ID ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataTwo.uid] : true
                    }
                })))
            })

            it('Autherized users should not be able to create households with a users property including ID refs to other users', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true,
                        [testUserDataThree.uid] : true
                    }
                })))
            })

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

            it('Unautherized users should not be able to retrieve data from households', async () => {
                const db = await setup()

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc().get()
                ))
            })

            it('Autherized users not included in a household should not be able to retrieve data about it', async () => {
                const db = await setup(testUserDataOne)

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc().get()))
            })

            it('Unautherized users should not be able the delete households', async () => {
                const db = await setup()

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Autherized users should not be able the delete households', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc().delete()))
            })
        })
        
        describe('Users', async () => {

            it('Unautherized users should not be able to create users', async () => {
                const db = await setup()
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Autherized users should not be able to create users', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Users should be able to update data about themselves', async () => {
                const db = await setup(testHouseDataOne, {
                    [`${Models.USER}/${testHouseDataOne.uid}`] : {
                        id : testHouseDataOne.uid
                    }
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testHouseDataOne.uid).update({
                    randomData : true
                })))
            })

            it('Users should be able to update their name', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        id : testUserDataOne.uid,
                    }
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).update({
                    name : testUserDataOne.name
                })))
            })

            it('Users should be able to update data on the relation to a household', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            
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

            it('Users should not be able to change their role in relation to a household', async () => {
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

            it('Users should not be able to change the accecpted property in relation to a household to false', async () => {
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

            it('Unautherized users should not be able the delete users', async () => {
                const db = await setup()

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Autherized users should not be able the delete users', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc().delete()))
            })
        })
    })
})