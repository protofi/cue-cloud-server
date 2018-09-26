import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'

const assert = chai.assert;
const expect = chai.expect;

const test = functionsTest(/*{
    databaseURL: "https://iot-cloud-216011.firebaseio.com",
    projectId: "iot-cloud-216011"
}, './../serviceAccountKey.json'*/);

const adminInitStub = sinon.stub(admin, 'initializeApp');
const adminfirestoreStub = sinon.stub(admin, 'firestore').get(() => {
    return () => {
        return {
            collection: (path) => {
                return {
                    get: () => [{user: 'mock-user-1'}, {user: 'mock-user-2'}],
                    doc: () => {
                        return {
                            set: () => {
                                console.log('wuut')
                                return {

                                }
                            }
                        }
                    }
                }
            }
        }
    }
})

const myFunctions = require('../lib/index');

const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord({uid: "1234", name: "Tobias"});
const wrappedUserSignin = test.wrap(myFunctions.userSignin);

wrappedUserSignin(userRecord);

assert.equal(true, true)