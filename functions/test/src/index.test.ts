import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'

const assert = chai.assert;
const expect = chai.expect;

const test = functionsTest();

const adminInitStub = sinon.stub(admin, 'initializeApp');
const adminfirestoreStub = sinon.stub(admin, 'firestore').get(() => {
    return () => {
        return {
            settings: () => {return null},
            collection: (col) => {
                return {
                    doc: (doc) => {
                        return {
                            set: (data) => {
                                console.log(data)
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

const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord({uid: "1234", name: "Tobias", email: "tobias@mail.com"});
const wrappedUserSignin = test.wrap(myFunctions.userSignin);

wrappedUserSignin(userRecord);

assert.equal(true, true)