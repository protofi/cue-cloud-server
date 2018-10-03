import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { UserRecord, user } from 'firebase-functions/lib/providers/auth';
import Database, { Datastore } from './lib/database'

const assert = chai.assert;
const expect = chai.expect;

describe('STAGE', () => {

    var test;
    var myFunctions;
    var db: Datastore;

    beforeEach((done) => {
        
        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
          databaseURL: `https://${stageProjectId}.firebaseio.com`,
          projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`);
        
        myFunctions = require('../lib/index');

        const adminFs = admin.firestore();
        db = new Database(adminFs);

        done();
    });

    describe('User', () => {
        
        it('Sign up', (done) => {
            
            const userData = {
                uid: "1234",
                name: "Tobias",
                email: "tobias@mail.com"
            };
            const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(userData);
            const wrappedUserSignin = test.wrap(myFunctions.userSignin);

            wrappedUserSignin(userRecord)
            db.users.get(userData.uid).then((doc) => {
                
                try
                {
                    const comparisonData = {
                        name: userData.name,
                        email: userData.email
                    };
                    
                    expect(doc.data()).to.include(comparisonData);

                    done()
                }
                catch(e)
                {
                    return done(e)
                }
            })
        })
    })


    describe('Households', () => {
        
        it('Created', (done) => {

            done()
        })
    })
})