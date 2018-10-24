import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { Models } from './lib/ORM/Models';

const assert = chai.assert;
const expect = chai.expect;

describe.only('OFFLINE', () => {

    var test;
    var adminInitStub;
    var firestoreMockData;
    var adminfirestoreStub;
    var myFunctions;

    const testUserDataOne = {
        uid: "test-user-1",
        name: "Andy",
        email: "andy@mail.com",
        token: null
    }

    const testUserDataTwo = {
        uid: "test-user-2",
        name: "Benny",
        email: "Benny@mail.com",
        token: null
    }
    
    beforeEach(async () => {
        
        firestoreMockData = {}
        test = functionsTest()
        adminInitStub = sinon.stub(admin, 'initializeApp');

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
    });

    describe('Functions', async () => {
        
        describe('Households', async () => {

            it('On Create', async () => {
                
                // const householdSnap = test.firestore.makeDocumentSnapshot({[Models.USER]: {123: true}}, `${Models.HOUSEHOLD}/`)
                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                wrappedHouseholdsOnCreate()

                // const beforeSnap = test.firestore.makeDocumentSnapshot({foo: 'bar'}, 'households/123');
            })
        })
    })
})