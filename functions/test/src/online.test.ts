import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'

const assert = chai.assert;
const expect = chai.expect;

// const test = functionsTest({
//     databaseURL: 'https://test-iot-cloud.firebaseio.com',
//     projectId: 'test-iot-cloud',
// }, './test/serviceAccountKey.test.json');

// sinon.stub(admin, 'initializeApp');

// const myFunctions = require('../lib/index');

// const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord({uid: "1234", name: "Tobias", email: "tobias@mail.com"});
// const wrappedUserSignin = test.wrap(myFunctions.userSignin);

// wrappedUserSignin(userRecord);

describe('Array', function() {
    describe('#indexOf()', function() {
      it('should return -1 when the value is not present', function() {
        assert.equal([1,2,3].indexOf(4), -1);
      });
    });
  });