import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { UserRecord, user } from 'firebase-functions/lib/providers/auth';
import { DocumentData } from '@google-cloud/firestore';

const assert = chai.assert;
const expect = chai.expect;

describe('STAGE', () => {

    var test;
    var myFunctions;
    var db;

    beforeEach((done) => {
        
        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
          databaseURL: `https://${stageProjectId}.firebaseio.com`,
          projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`);
        
        
        myFunctions = require('../lib/index');
        
        db = admin.firestore();

        done();
    });

    describe('User', () => {
        
        it('Sign up', (done) => {
            
            const userData = {uid: "1234", name: "Tobias", email: "tobias@mail.com"};
            const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord(userData);
            const wrappedUserSignin = test.wrap(myFunctions.userSignin);
            wrappedUserSignin(userRecord)

            db.collection('users').doc(userData.uid).get().then((doc: DocumentData) => {
                
                try
                {
                    expect(doc.data()).to.include({name: userData.name, email: userData.email});

                    done()
                }
                catch(e)
                {
                    return done(e)
                }
            })
        })
    })
})