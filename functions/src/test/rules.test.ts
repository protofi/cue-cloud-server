import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'

import DataORMImpl from "./lib/ORM"
import { asyncForEach } from './lib/util'
import { Models } from './lib/ORM/Models'
import { Roles } from './lib/const'

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('STAGE', () => {

    var test: FeaturesList
    var myFunctions
    var adminFs: FirebaseFirestore.Firestore
    var fs: firebase.firestore.Firestore

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

    const testUserDataThree = {
        uid: "test-user-3",
        name: "Charlie",
        email: "Charlie@mail.com",
        token: null
    }

    before(async () => {

        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        try {
            admin.initializeApp();
          } catch (e) {}

        myFunctions = require('../lib/index')
        adminFs = admin.firestore()

        try {
            adminFs.settings({ timestampsInSnapshots: true })
        } catch (e) {}
        
        fs = firebase.firestore()
        fs.settings({ timestampsInSnapshots: true })
        
        testUserDataOne.token = await admin.auth().createCustomToken(testUserDataOne.uid)
        testUserDataTwo.token = await admin.auth().createCustomToken(testUserDataTwo.uid)
    })

    after(async () => {
        test.cleanup()
    })

    describe('Rules', () => {

        var docsToBeDeleted

        beforeEach(() => {
            docsToBeDeleted = []
        })

        afterEach(async () => {
            await asyncForEach(docsToBeDeleted, async (path: string) => {
                await adminFs.doc(path).delete()
            })
        
            await firebase.auth().signOut()
        })

        describe('Households', () => {

            it('Users can create households', async () => {
                await firebase.auth().signInWithCustomToken(testUserDataOne.token)

                const docRef: firebase.firestore.DocumentReference = await fs.collection(Models.HOUSEHOLD).add({ [Models.USER] : true})

                expect(docRef).to.exist

                //clean up
                docsToBeDeleted.push(docRef.path)
            })

            it('Users can add themselves to a newly created household as admin', async () => {
                await firebase.auth().signInWithCustomToken(testUserDataOne.token)

                const docRef: firebase.firestore.DocumentReference = await fs.collection(Models.HOUSEHOLD).add({ [Models.USER] : {
                    [testUserDataOne.uid] : {
                        role : Roles.ADMIN
                    }
                }})

                const docSnap : FirebaseFirestore.DocumentSnapshot = await adminFs.collection(Models.HOUSEHOLD).doc(docRef.id).get()
                const users = docSnap.get(Models.USER)

                expect(Object.keys(users)).to.deep.equal([testUserDataOne.uid])

                //clean up
                docsToBeDeleted.push(docRef.path)
            })

            it('Users not autherized cannot create households', async () => {
                var docRef: firebase.firestore.DocumentReference
                
                try
                {
                    docRef = await fs.collection(Models.HOUSEHOLD).add({})
                }
                catch (e) {
                    assert.include(e.message, 'PERMISSION_DENIED')
                }

                expect(docRef).to.not.exist
            })

            it('Users cannot add other users to households', async () => {

                var docRef: FirebaseFirestore.DocumentReference = await adminFs.collection(Models.HOUSEHOLD).add({
                    [Models.USER] : {[testUserDataOne.uid] : true}
                })
        
                await firebase.auth().signInWithCustomToken(testUserDataOne.token)

                try
                {
                    await fs.collection(Models.HOUSEHOLD).doc(docRef.id).set({
                        [Models.USER] : {[testUserDataTwo.uid] : true}
                    }, {merge: true})
                }
                catch (e) {
                    assert.include(e.message, 'PERMISSION_DENIED')
                }

                const docSnap : FirebaseFirestore.DocumentSnapshot = await adminFs.collection(Models.HOUSEHOLD).doc(docRef.id).get()
                const users = docSnap.get(Models.USER)

                expect([testUserDataTwo.uid]).to.not.include.members(Object.keys(users))

                //clean up
                docsToBeDeleted.push(docRef.path)
            })

            it('Admins of households should be able to add other users to the household', async () => {
                await firebase.auth().signInWithCustomToken(testUserDataOne.token)

                var docRef: FirebaseFirestore.DocumentReference = await adminFs.collection(Models.HOUSEHOLD).add({
                    [Models.USER] : {[testUserDataOne.uid] : {
                        role : Roles.ADMIN
                    }}
                })
                
                await fs.collection(Models.HOUSEHOLD).doc(docRef.id).update({
                    [Models.USER] : {[testUserDataTwo.uid] : true}
                })

                const docSnap : FirebaseFirestore.DocumentSnapshot = await adminFs.collection(Models.HOUSEHOLD).doc(docRef.id).get()
                const users = docSnap.get(Models.USER)

                expect([testUserDataOne.uid, testUserDataTwo.uid]).to.include.members(Object.keys(users))

                //clean up
                docsToBeDeleted.push(docRef.path)
            })

            it('Users should not be able to change their role in a home', async () => {

                var docRef: FirebaseFirestore.DocumentReference = await adminFs.collection(Models.HOUSEHOLD).add({
                    users : {[testUserDataOne.uid] : true}
                })

                try
                {
                    await fs.collection(Models.HOUSEHOLD).doc(docRef.id).set({
                        [testUserDataOne.uid] : {
                            role : Roles.ADMIN
                        }
                    }, {merge: true})
                }
                catch (e) {
                    assert.include(e.message, 'PERMISSION_DENIED')
                }

                const docSnap : FirebaseFirestore.DocumentSnapshot = await adminFs.collection(Models.HOUSEHOLD).doc(docRef.id).get()
                const users = docSnap.get(Models.USER)

                expect(users[testUserDataOne.uid].role).to.not.equal([Roles.ADMIN])

                //clean up
                docsToBeDeleted.push(docRef.path)
            })
        })
    })
})