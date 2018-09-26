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
    
        test = functionsTest({
          databaseURL: 'https://test-iot-cloud.firebaseio.com',
          projectId: 'test-iot-cloud',
        }, './test/serviceAccountKey.test.json');
        
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