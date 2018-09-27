import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'

const assert = chai.assert;
const expect = chai.expect;

describe('ONLINE', () => {

    var test;
    var myFunctions;

    beforeEach((done) => {
        
        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
          databaseURL: `https://${stageProjectId}.firebaseio.com`,
          projectId: stageProjectId,
        }, `./../${stageProjectId}.serviceAccountKey.json`);
        
        myFunctions = require('../lib/index');
        done();
    });

    describe('User', () => {
        it('sign in', (done) => {
          const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord({uid: "1234", name: "Tobias", email: "tobias@mail.com"});
          const wrappedUserSignin = test.wrap(myFunctions.userSignin);
          wrappedUserSignin(userRecord);
          done();
        });
    });
});