import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { UserRecord, user } from 'firebase-functions/lib/providers/auth'
import Database, { Datastore } from './lib/database'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import { Collection } from './lib/database/Collections'
import { DocumentSnapshot } from 'firebase-functions/lib/providers/firestore'
import { asyncForEach } from './lib/util'

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
    var db: Datastore
    var adminDb: Datastore

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

    beforeEach(async () => {

        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        myFunctions = require('../lib/index');
        fs = firebase.firestore()
        fs.settings({ timestampsInSnapshots: true })
        adminFs = admin.firestore();
        db = new Database(fs);
        adminDb = new Database(adminFs);

        testUserDataOne.token = await admin.auth().createCustomToken(testUserDataOne.uid)
        testUserDataTwo.token = await admin.auth().createCustomToken(testUserDataTwo.uid)
    })

    afterEach(async () => {
        await adminDb.users.delete(testUserDataOne.uid)
    })

    after(async () => {
        test.cleanup()
    })

    describe('User', () => {

        it('Sign up', async () => {

            const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(testUserDataOne)
            const wrappedAuthUsersOnCreate = test.wrap(myFunctions.authUsersOnCreate)

            await wrappedAuthUsersOnCreate(userRecord)

            const doc: FirebaseFirestore.DocumentSnapshot = await adminDb.users.get(testUserDataOne.uid)

            const comparisonData = {
                email: testUserDataOne.email
            }

            expect(doc.data()).to.include(comparisonData);
        })
    })

    // describe('Rules', () => {

        // describe('Households', () => {

        //     const householdIdsToBeDeleted = []

        //     after(async () => {

        //         await asyncForEach(householdIdsToBeDeleted, async (householdId) => {
        //             await adminDb.households.delete(householdId)
        //         })
        //     })

        //     afterEach(async () => {

        //         await firebase.auth().signOut()
        //     })

        //     it('Reject unauthorized creations.', async () => {

        //         var docRef: FirebaseFirestore.DocumentReference
        //         try {
        //             docRef = await db.households.add({})
        //             householdIdsToBeDeleted.push(docRef.id)
        //         }
        //         catch (e) {
        //             assert.include(e.message, 'PERMISSION_DENIED')
        //         }

        //         assert.notExists(docRef)
        //     })

        //     it('Reject unauthorized writes.', async () => {

        //         var docRef: FirebaseFirestore.DocumentReference;
        //         try {
        //             docRef = await db.households.add({})
        //             householdIdsToBeDeleted.push(docRef.id)
        //         }
        //         catch (e) {
        //             assert.include(e.message, 'PERMISSION_DENIED')
        //         }

        //         assert.notExists(docRef)
        //     })

        //     it('User cannot add others.', async () => {

        //         await firebase.auth().signInWithCustomToken(testUserDataOne.token)
        //         var docRef: FirebaseFirestore.DocumentReference;

        //         try {
        //             docRef = await db.households.create({ uid: testUserDataTwo.uid })
        //             householdIdsToBeDeleted.push(docRef.id)
        //         }
        //         catch (e) {
        //             assert.include(e.message, 'PERMISSION_DENIED')
        //         }

        //         assert.notExists(docRef)
        //     })

        //     it('User can create and add oneself.', async () => {

        //         await firebase.auth().signInWithCustomToken(testUserDataOne.token)

        //         const docRef: FirebaseFirestore.DocumentReference = await db.households.create({ uid: testUserDataOne.uid })

        //         assert.exists(docRef)
        //         householdIdsToBeDeleted.push(docRef.id)

        //         const snap: FirebaseFirestore.DocumentData = await db.households.getResidents(docRef.id)

        //         const residents = snap.docs.map((doc) => {
        //             return doc.data()
        //         })

        //         expect(residents).to.deep.include({ uid: testUserDataOne.uid });
        //     })

        //     it('User can add oneself.', async () => {

        //         const household: FirebaseFirestore.DocumentReference = await adminDb.households.create({ uid: testUserDataTwo.uid })
        //         householdIdsToBeDeleted.push(household.id)

        //         await firebase.auth().signInWithCustomToken(testUserDataOne.token)
        //         await db.households.addResident(household.id, { uid: testUserDataOne.uid })

        //         const householdSnap: FirebaseFirestore.DocumentData = await db.households.getResidents(household.id)
        //         const residents = householdSnap.docs.map((doc) => {
        //             return doc.data()
        //         })

        //         expect(residents).to.deep.include({ uid: testUserDataOne.uid });
        //         expect(residents).to.deep.include({ uid: testUserDataTwo.uid });
        //     })
        // })

        // describe('Sensors', () => {

        //     const sensorIdsToBeDeleted = []

        //     after(async () => {

        //         await asyncForEach(sensorIdsToBeDeleted, async (sensorId) => {
        //             await adminDb.sensors.delete(sensorId)
        //         })
        //     })

        //     afterEach(async () => {

        //         await firebase.auth().signOut()
        //     })

        //     it('Reject unautherized creation.', async () => {
        //         var docRef: FirebaseFirestore.DocumentReference
        //         try {
        //             docRef = await db.sensors.add({})
        //         }
        //         catch (e) {
        //             assert.include(e.message, 'PERMISSION_DENIED')
        //         }
        //         assert.notExists(docRef)
        //     })

        //     it('Autherized creation allowed.', async () => {

        //         await firebase.auth().signInWithCustomToken(testUserDataOne.token)

        //         const docRef: FirebaseFirestore.DocumentReference = await db.sensors.add({})

        //         sensorIdsToBeDeleted.push(docRef.id)

        //         assert.exists(docRef)
        //     })
        // })
    // })
})