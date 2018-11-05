import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firestore from '@firebase/testing'
import { Models } from './lib/ORM/Models';
import { setup } from './helpers'

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

    after(async () => {
        Promise.all(firestore.apps().map(app => app.delete()))
    })

    describe('Emulated Rules', () => {
        it('Writes to a random collection should fail', async () => {
            const db = await setup()

            const ref = db.collection('random-collection')
            expect(await firestore.assertFails(ref.doc().set({})))
        })

        describe('Households', async () => {

            it('Unautherized users should not be able to create households', async () => {
                const db = await setup()

                const ref = db.collection(Models.HOUSEHOLD)
                expect(await firestore.assertFails(ref.doc().set({})))
            })

            it('Autherized users should not be able to create households without a users property', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)
                expect(await firestore.assertFails(ref.doc().set({})))
            })
            
            it('Autherized users should be able to create households with a users property', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)
                expect(await firestore.assertSucceeds(ref.doc().set({users: {

                    [testUserDataOne.uid] : true

                }})))
            })

            it('Autherized users should not be able to create households with a users property including ref to themselves', async () => {
                const db = await setup(testUserDataOne)
                const ref = db.collection(Models.HOUSEHOLD)
                expect(await firestore.assertFails(ref.doc().set({users: {

                    [testUserDataTwo.uid] : true

                }})))
            })
        })
    })
})