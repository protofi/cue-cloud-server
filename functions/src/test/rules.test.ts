import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firestore from '@firebase/testing'
import { Models } from './lib/ORM/Models';
import User from './lib/ORM/Models/User';
import { setup } from './helpers'
import { Roles, Relations } from './lib/const';

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

    const testBaseStationDataOne = {
        uid: "test-base-station-1"
    }

    const testSensorDataOne = {
        uid: "test-sensor-1"
    }

    after(async () => {
        Promise.all(firestore.apps().map(app => app.delete()))
    })

    it('Should not allow writes to a random collection', async () => {
        const db = await setup()

        const ref = db.collection('some-collection')
        expect(await firestore.assertFails(ref.add({})))
    })

    it('Shouls not allow reads from a random collection', async () => {
        const db = await setup()

        const ref = db.collection('some-collection')
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

            it('Users should be able to update field: FCM_tokens', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const userDoc = db.collection(Models.USER).doc(testUserDataOne.uid)

                expect(await firestore.assertSucceeds(userDoc.update({
                    [User.f.FCM_TOKENS._] : {
                        'abc' : {
                            [User.f.FCM_TOKENS.CONTEXT._] : User.f.FCM_TOKENS.CONTEXT.IOS
                        }
                    }
                })))
            })

            it('Users should be able to update data on the relation to a Household', async () => {
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

            it('Admin users should be able to update data on other users', async () => {
                const db = await setup(testAdminUserData, {
                    [`${Models.USER}/${testUserDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.USER)

                expect(await firestore.assertSucceeds(ref.doc(testUserDataOne.uid).get()))
            })
        })

        describe('Delete', async () => {

            it('Should not allow unautherized Users to delete Users', async () => {
                const db = await setup()

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Should not allow Users to delete Users', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(Models.USER)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

        })
    })

    describe('Base Stations', async () => {

        describe('Create', async () => {

            it(' Unautherized users should not be able to create Base Station', async () => {
                const db = await setup()
                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Users should not be able to create Base Station', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Admin Users should not be able to create Base Station', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Super Admin Users should not be able to create Base Station', async () => {
                const db = await setup(testSuperAdminUserData)
                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.add({})))
            })
        })

        describe('Read', async () => {
            
            it('Should not allow unautherized Users to read from Base Stations', async () => {
                const db = await setup()

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc().get()))
            })

            it('Should not allow Users to read from Base Stations claimed by other Household than the one they are resident in', async () => {
                const db = await setup(testUserDataOne, {

                        [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                            [Models.USER] : {
                                [testUserDataTwo.uid] : true
                            },
                            [Models.BASE_STATION] : {
                                [testBaseStationDataOne.uid] : true
                            }
                        },
                        [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                            [Models.HOUSEHOLD] : {
                                id : testHouseDataOne.uid
                            }
                        }
                    })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).get()))
            })

            it('Should allow Users to read from unclaimed Base Stations', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertSucceeds(ref.doc(testBaseStationDataOne.uid).get()))
            })

            
            it('Should allow Users to read from Base Stations related to their resident Household', async () => {
                const db = await setup(testUserDataOne, {

                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        },
                        [Models.BASE_STATION] : {
                            [testBaseStationDataOne.uid] : true
                        }
                    },
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            id : testHouseDataOne.uid
                        }
                    }
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertSucceeds(ref.doc(testBaseStationDataOne.uid).get()))
            })

            it('Admin Users should be able to read data', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertSucceeds(ref.get()))
            })

            it('Super Admin Users should not be able to read data', async () => {
                const db = await setup(testSuperAdminUserData)
                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertSucceeds(ref.get()))
            })
        })

        describe('Update', async () => {

            it('Should not allow unautherized Users to update data', async () => {
                const db = await setup()
                
                const ref = db.collection(Models.BASE_STATION)
                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({})))
            })

            it('Should not allow Users to update data on non-related Base Stations', async () => {
                const db = await setup(testUserDataOne, {

                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataTwo.uid] : true
                        },
                        [Models.BASE_STATION] : {
                            [testBaseStationDataOne.uid] : true
                        }
                    },
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            id : testHouseDataOne.uid
                        }
                    }
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({})))
            })

            it('Should not allow related Users to update field: id', async () => {

                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        },
                        [Models.BASE_STATION] : {
                            [testBaseStationDataOne.uid] : true
                        }
                    },
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            id : testHouseDataOne.uid
                        }
                    }
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    id : '123'
                })))
            })

            it('Should not allow related Users to update field: pin', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        },
                        [Models.BASE_STATION] : {
                            [testBaseStationDataOne.uid] : true
                        }
                    },
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            id : testHouseDataOne.uid
                        }
                    }
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    pin : '123'
                })))
            })
            
            it('Should not allow related Users to update field: websocket', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        },
                        [Models.BASE_STATION] : {
                            [testBaseStationDataOne.uid] : true
                        }
                    },
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            id : testHouseDataOne.uid
                        }
                    }
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    websocket : '123'
                })))
            })

            it('Should not allow related Users to update field: household', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        },
                        [Models.BASE_STATION] : {
                            [testBaseStationDataOne.uid] : true
                        }
                    },
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {
                        [Models.HOUSEHOLD] : {
                            id : testHouseDataOne.uid
                        }
                    }
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    household : '123'
                })))
            })

            it('Should not allow Users to update field "id" of unclaimed Base Stations', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    id : '123'
                })))
            })

            it('Should not allow Users to update field "pin" of unclaimed Base Stations', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    pin : '123'
                })))
            })

            it('Should not allow Users to update field "websocket" of unclaimed Base Stations', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    websocket : '123'
                })))
            })
            
            it('Should not allow Users to update field "households" of unclaimed Base Stations if field is no map only containing id:string', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc(testBaseStationDataOne.uid).update({
                    households : '123'
                })))
            })

            it('Should allow Users to update field "households" of unclaimed Base Stations', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.BASE_STATION}/${testBaseStationDataOne.uid}`] : {}
                })

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertSucceeds(ref.doc(testBaseStationDataOne.uid).update({
                    households : {
                        id : '123'
                    }
                })))
            })
        })

        describe('Delete', async () => {

            it('Should not allow unautherized Users to delete Base Stations', async () => {
                const db = await setup()

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Should not allow Users to delete Base Stations', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(Models.BASE_STATION)

                expect(await firestore.assertFails(ref.doc().delete()))
            })
        })
    })
    
    describe('Households', async () => {

        describe('Create', async () => {
        
            it('Should not allow unautherized Users to be able to create households', async () => {
                const db = await setup()
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow Users to create Households without an users field', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow Users to create Households without a users field including ID ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataTwo.uid] : true
                    }
                })))
            })

            it('Should not allow Users to create Households with a users field including multiple ID refs to other users', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true,
                        [testUserDataThree.uid] : true
                    }
                })))
            })

            it('Should not allow Users to create Households without an base_stations field', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true
                    }
                })))
            })

            it('Should allow Users to create Households with fields: "base_stations" and "users" including ID ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertSucceeds(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true
                    },
                    [Models.BASE_STATION]: {
                        '123' : true
                    }
                })))
            })

            it('Should allow Admin Users to create Household for other Users', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(Models.HOUSEHOLD)
                
                expect(await firestore.assertSucceeds(ref.add({
                    [Models.USER]: {
                        [testUserDataOne.uid] : true
                    }
                })))
            })
        })

        describe('Read', async () => {
            
            it('Should not allow Unautherized Users to read data', async () => {
                const db = await setup()

                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).get()))
            })

            it('Should not allow Users not resident of a Household to read data', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataTwo.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).get()))
            })

            it('Should allow resident Users to read data', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertSucceeds(ref.doc(testHouseDataOne.uid).get()))
            })

            it('Should allow Admin Users to read data from all Households', async () => {
                const db = await setup(testAdminUserData, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertSucceeds(ref.doc(testHouseDataOne.uid).get()))

            })
        })

        describe('Update', async () => {

            it('Should not allow unautherized Users to update data', async () => {
                const db = await setup(null, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).update({})))
            })

            it('Should not allow resident Users to update field: users', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).update({
                    [Models.USER] : {
                        id : '123'
                    }
                })))
            })

            it('Should not allow resident Users to update field: sensors', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).update({
                    [Models.SENSOR] : {
                        id : '123'
                    }
                })))
            })

            it('Should not allow resident users to update field: base_stations', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.HOUSEHOLD}/${testHouseDataOne.uid}`] : {
                        [Models.USER] : {
                            [testUserDataOne.uid] : true
                        }
                    }
                })
                const ref = db.collection(Models.HOUSEHOLD)

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).update({
                    [Models.BASE_STATION] : {
                        id : '123'
                    }
                })))
            })

            it('Should not allow Household Admins to update field: base_stations', async () => {
            
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

                expect(await firestore.assertFails(ref.doc(testHouseDataOne.uid).update({
                    [Models.BASE_STATION]: {
                        [testBaseStationDataOne.uid] : true
                    }
                })))
            })

            it('Should allow Household Admins to update field: users', async () => {
            
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

            it('Should allow Household Admins to update field: sensors', async () => {
            
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
                    [Models.SENSOR]: {
                        [testSensorDataOne.uid] : true
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

            it('Should not allow unautherized Users to create Sensors', async () => {
                const db = await setup()
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow Users to create Sensors', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow admin Users to create Sensors', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow super admin Users to create Sensors', async () => {
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
            it('Should not allow unautherized Users to delete Sensors', async () => {
                const db = await setup()

                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Should not allow Users to delete Sensors', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(Models.SENSOR)

                expect(await firestore.assertFails(ref.doc().delete()))
            })
        })
    })

    describe('Sensors_Users', async () => {

        describe('Create', async () => {

            it('Should not allow unautherized Users to create Sensors-Users collections', async () => {
                const db = await setup()
                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow Users to create Sensors-Users collections', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow admin Users to create Sensors-Users collections', async () => {
                const db = await setup(testAdminUserData)
                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.add({})))
            })

            it('Should not allow super admin Users to create Sensors-Users collections', async () => {
                const db = await setup(testSuperAdminUserData)
                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.add({})))
            })
        })
        
        describe('Read', async () => {

            it('Should not allow unautherized Users to read data from Sensors_Users', async () => {
                const db = await setup(testUserDataTwo, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id: testUserDataOne.uid
                        }
                    }
                })
                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).get()))
            })

            it('Should allow the User of the relation to read data from Sensors_Users', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id: testUserDataOne.uid
                        }
                    }
                })
                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertSucceeds(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).get()))
            })
        })
        
        describe('Update', async () => {

            it('Should not allow unautherized Users to update data on Sensors_Users', async () => {
                const db = await setup(null, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id : testUserDataOne.uid
                        }
                    }
                })

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).update({})))
            })
            
            it('Should not allow Users to update field: users', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id : testUserDataOne.uid
                        }
                    }
                })

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).update({
                    [Models.USER] : {}
                })))
            })

            it('Should not allow Users to update field: sensors', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id : testUserDataOne.uid
                        }
                    }
                })

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).update({
                    [Models.SENSOR] : {}
                })))
            })

            it('Should not allow not related Users to update field: pivot', async () => {
                const db = await setup(testUserDataTwo, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id : testUserDataOne.uid
                        }
                    }
                })

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).update({
                    [Relations.PIVOT] : {}
                })))
            })

            it('Should allow Users to update field: pivot', async () => {
                const db = await setup(testUserDataOne, {
                    [`${Models.SENSOR}_${Models.USER}/${testSensorDataOne.uid}_${testUserDataOne.uid}`] : {
                        [Models.USER] : {
                            id : testUserDataOne.uid
                        }
                    }
                })

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertSucceeds(ref.doc(`${testSensorDataOne.uid}_${testUserDataOne.uid}`).update({
                    [Relations.PIVOT] : {}
                })))
            })
        })
        
        describe('Delete', async () => {
            it('Should not allow unautherized Users to delete Sensors_Users', async () => {
                const db = await setup()

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc().delete()))
            })

            it('Should not allow Users to delete Sensors_Users', async () => {
                const db = await setup(testHouseDataOne)

                const ref = db.collection(`${Models.SENSOR}_${Models.USER}`)

                expect(await firestore.assertFails(ref.doc().delete()))
            })
        })
    })
})