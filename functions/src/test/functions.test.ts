import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { Models } from './lib/ORM/Models'
import { FeaturesList } from 'firebase-functions-test/lib/features'

const assert = chai.assert;
const expect = chai.expect;

describe('OFFLINE', () => {

    var test: FeaturesList;
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
    
    before(async () => {
        
        firestoreMockData = {}

        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        // adminInitStub = sinon.stub(admin, 'initializeApp');

        // adminfirestoreStub = sinon.stub(admin, 'firestore')
        // .get(() => {
        //     return () => {
        //         return {
        //             settings: () => {return null},
        //             collection: (col) => {
        //                 return {
        //                     doc: (doc) => {
        //                         return {
        //                             set: (data) => {
        //                                 console.log(col,doc)
        //                                 return null
        //                             },
        //                             get: () => {
        //                                 console.log(col,doc)
        //                                 return null
        //                             }
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // })
        
        myFunctions = require('../lib/index')
    });

    afterEach(async () => {
        test.cleanup()
        // adminInitStub.restore()
    })

    describe('Functions', async () => {
        
        describe('Households', async () => {

            it('On Create', async () => {
                
                const householdSnap = test.firestore.makeDocumentSnapshot({[Models.USER]: {123: true}}, `${Models.HOUSEHOLD}/`)

                const house = test.firestore.exampleDocumentSnapshot()

                const wrappedHouseholdsOnCreate = test.wrap(myFunctions.ctrlHouseholdsOnCreate)

                await wrappedHouseholdsOnCreate(householdSnap)

                // const beforeSnap = test.firestore.makeDocumentSnapshot({foo: 'bar'}, 'households/123');
            })
        })
    })
})