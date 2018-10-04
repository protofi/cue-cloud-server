import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { UserRecord, user } from 'firebase-functions/lib/providers/auth';
import Database, { Datastore } from './lib/database'
import { FeaturesList } from 'firebase-functions-test/lib/features';
import { DocumentSnapshot, DocumentReference, Firestore } from '@google-cloud/firestore';
import { Collection } from './lib/database/Collections';

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
    var db: Datastore
    var adminFs: FirebaseFirestore.Firestore
    var fs: firebase.firestore.Firestore
    var adminDb: Datastore

    beforeEach((done) => {
        
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

        done();
    });

    afterEach(() => {
        adminDb.users.delete('abc123')
    });

    describe('User', () => {

        const userData = {
            uid: "abc123",
            name: "Tobias",
            email: "tobias@mail.com"
        }
        
        it('Sign up', (done) => {

            const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(userData)
            const wrappedUserSignin = test.wrap(myFunctions.userSignin)

            wrappedUserSignin(userRecord)
            .then(() => {
            
                adminDb.users.get(userData.uid)
                .then((doc: DocumentSnapshot) => {
                    
                    try
                    {
                        const comparisonData = {
                            name: userData.name,
                            email: userData.email,
                        }

                        expect(doc.data()).to.include(comparisonData);

                        return done()
                    }
                    catch(e)
                    {
                        return done(e)
                    }
                })

            }).catch((e) => {
                done(e)
            })
        })
    })

    describe('Rules', () => {
        
        describe('Households', () => {
            it('Reject unauthorized writes', (done) => {

                db.households
                    .add({})
                    .then((docRef) => {
                        try
                        {
                            assert.notExists(docRef)
                        }
                        catch(e)
                        {
                            done(e)
                        }
                    }).catch((e) => {
                        assert.include(e.message, 'PERMISSION_DENIED')
                        done();
                    })
                })
        })
    })
})