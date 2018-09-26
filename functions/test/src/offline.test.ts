import * as chai from 'chai'
import * as sinon from 'sinon'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'

const assert = chai.assert;
const expect = chai.expect;

describe('OFFLINE', () => {

    var test;
    var firestoreMockData;
    var adminfirestoreStub;
    var myFunctions;
    
    beforeEach((done) => {
        
        firestoreMockData = {}

        test = functionsTest();

        const adminInitStub = sinon.stub(admin, 'initializeApp');

        adminfirestoreStub = sinon.stub(admin, 'firestore').get(() => {
            return () => {
                return {
                    settings: () => {return null},
                    collection: (col) => {
                        return {
                            doc: (doc) => {
                                return {
                                    set: (data) => {
                                        console.log(col,doc)
                                        return null
                                    },
                                    get: () => {
                                        console.log(col,doc)
                                        return null
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })
        
        myFunctions = require('../lib/index');
        
        done();
    });

    describe('User', () => {
        it('Sign in', () => {
            const userRecord: admin.auth.UserRecord = test.auth.makeUserRecord({uid: "1234", name: "Tobias", email: "tobias@mail.com"});
            const wrappedUserSignin = test.wrap(myFunctions.userSignin);

            wrappedUserSignin(userRecord);
        });
    });
});