import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { UserRecord, user } from 'firebase-functions/lib/providers/auth';
import Database, { Datastore } from './lib/database'
import { FeaturesList } from 'firebase-functions-test/lib/features';
import { Collection } from './lib/database/Collections';
import { DocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { asyncForEach } from './lib/util';

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised");

chai.should();
chai.use(chaiThings);
chai.use(chaiAsPromised);

const assert = chai.assert;
const expect = chai.expect;

describe('STAGE', () => {

    var test: FeaturesList
    var myFunctions
    var adminFs: FirebaseFirestore.Firestore
    var fs: firebase.firestore.Firestore
    var db: Datastore
    var adminDb: Datastore
    var testUsertokenOne
    
    const testUserDataOne = {
        uid: "test-user-1",
        name: "Andy",
        email: "andy@mail.com"
    }

    const testUserDataTwo = {
        uid: "test-user-2",
        name: "Benny",
        email: "Benny@mail.com"
    }
    

    before(async () => {
        
        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
          databaseURL: `https://${stageProjectId}.firebaseio.com`,
          projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`);
        
        myFunctions = require('../lib/index');
        fs = firebase.firestore()
        fs.settings({timestampsInSnapshots: true})
        adminFs = admin.firestore();
        db = new Database(fs);
        adminDb = new Database(adminFs);

        testUsertokenOne = await admin.auth().createCustomToken(testUserDataOne.uid)
    });

    afterEach(async () => {
        await adminDb.users.delete(testUserDataOne.uid)
    });

    describe('User', () => {

        it('Sign up', async () => {

            const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(testUserDataOne)
            const wrappedUserSignin = test.wrap(myFunctions.userSignin)

            await wrappedUserSignin(userRecord)
            
            const doc: FirebaseFirestore.DocumentSnapshot = await adminDb.users.get(testUserDataOne.uid)
                
            const comparisonData = {
                email: testUserDataOne.email
            }

            expect(doc.data()).to.include(comparisonData);
        })
    })

    describe('Rules', () => {
        
        describe('Households', () => {

            const householdIdsToBeDeleted = []

            after( async () => {

                await asyncForEach(householdIdsToBeDeleted, async (householdId) => {
                    await adminDb.households.delete(householdId)
                })

                // await householdIdsToBeDeleted.map(async (householdId) => {
                //     await adminDb.households.delete(householdId)
                // })
            })

            it('Reject unauthorized creations.', async () => {

                try
                {
                    const docRef: FirebaseFirestore.DocumentReference = await db.households.add({})
                    householdIdsToBeDeleted.push(docRef.id)
                    assert.notExists(docRef)
                }
                catch(e)
                {
                    assert.include(e.message, 'PERMISSION_DENIED')
                }
            })

            it('Reject unauthorized writes.', async () => {

                try
                {
                    const docRef: FirebaseFirestore.DocumentReference = await db.households.set('123', {})
                    householdIdsToBeDeleted.push(docRef.id)
                    assert.notExists(docRef)

                }
                catch(e)
                {
                    assert.include(e.message, 'PERMISSION_DENIED')
                }
            })

            it('User cannot add others.', async () => {

                await firebase.auth().signInWithCustomToken(testUsertokenOne)
                var docRef: FirebaseFirestore.DocumentReference;

                try
                {
                    docRef = await db.households.create({uid: testUserDataTwo.uid})
                    householdIdsToBeDeleted.push(docRef.id)
                }
                catch(e)
                {
                    assert.include(e.message, 'PERMISSION_DENIED')
                }

                assert.notExists(docRef)
            })

            it('User can create and add oneself.', async () => {

                await firebase.auth().signInWithCustomToken(testUsertokenOne)
                    
                const docRef: FirebaseFirestore.DocumentReference = await db.households.create({uid: testUserDataOne.uid})
                        
                assert.exists(docRef)
                householdIdsToBeDeleted.push(docRef.id)

                const snap: FirebaseFirestore.DocumentData = await db.households.getResidents(docRef.id)
                    
                const residents = snap.docs.map((doc) => {
                    return doc.data()
                })

                expect(residents).to.deep.include({uid: testUserDataOne.uid});
            })
            
            it('User can add oneself.', async () => {

                const household: FirebaseFirestore.DocumentReference = await adminDb.households.create({uid: testUserDataTwo.uid})
                householdIdsToBeDeleted.push(household.id)

                await firebase.auth().signInWithCustomToken(testUsertokenOne)
                await db.households.addResident(household.id, {uid: testUserDataOne.uid})

                const householdSnap: FirebaseFirestore.DocumentData = await db.households.getResidents(household.id)
                const residents = householdSnap.docs.map((doc) => {
                    return doc.data()
                })

                expect(residents).to.deep.include({uid: testUserDataOne.uid});
                expect(residents).to.deep.include({uid: testUserDataTwo.uid});
            })
        })
    })
})