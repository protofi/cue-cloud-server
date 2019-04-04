import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as _ from 'lodash'
import * as firebase from 'firebase'
import * as functionsTest from 'firebase-functions-test'

import * as request from 'supertest';
import { FeaturesList } from 'firebase-functions-test/lib/features';
import * as faker from 'faker'
import { Models } from './lib/ORM/Models';
import { FirestoreStub } from './stubs';
import Household from './lib/ORM/Models/Household';
import { Relations, Roles } from './lib/const';
import User from './lib/ORM/Models/User';
const assert = chai.assert
const expect = chai.expect

const baseUrl: string = '/api/v1'

describe('Api_Test', () => {

    const firestoreStub = new FirestoreStub()
    let adminFirestoreStub: sinon.SinonStub
    
    let test: FeaturesList
    let api: Express.Application

    const userId        = faker.random.uuid()
    let userIdToken: string
    const adminUserId   = faker.random.uuid()
    let adminUserIdToken: string

    before(async () => {
        const stageProjectId = 'staging-cue-iot-cloud'

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        try {
            admin.initializeApp()
        } catch (e) {}

        firebase.initializeApp({
            apiKey: "AIzaSyBSOLIAOif1jZ80ukoTjsfTwQ9BEBXcmkc",
            authDomain: "staging-cue-iot-cloud.firebaseapp.com",
            databaseURL: "https://staging-cue-iot-cloud.firebaseio.com",
            projectId: "staging-cue-iot-cloud",
            storageBucket: "staging-cue-iot-cloud.appspot.com",
            messagingSenderId: "511550860680"
        })

        adminFirestoreStub = sinon.stub(admin, 'firestore')
        .get(() => {
            return () => {
                return firestoreStub.get()
            }
        })

        api = require('../lib/index').api

        adminUserIdToken = await (await firebase.auth().signInWithCustomToken(
            await admin.auth().createCustomToken(adminUserId, {
                isAdmin : true
            })
        )).user.getIdToken()

        userIdToken = await (await firebase.auth().signInWithCustomToken(
            await admin.auth().createCustomToken(userId)
        )).user.getIdToken()
    })

    after(async () => {
        test.cleanup()
        admin.app().delete()
        adminFirestoreStub.restore()
        await Promise.all(firebase.apps.map(app => app.delete()))
    })

    describe('GET /api/v1/', () =>
    {
        it('Should respond with welcome message', async () =>
        {
            const expectedBody = {
                "message" : "Welcome to the Cue API."
            }

            await request(api)
                .get(baseUrl)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200, expectedBody)
        })
    })

    describe('Auth', () => {

        describe('POST /households/:id/invitations', () => {

            it('Should response with 200', async () => {

                const householdId = faker.random.uuid()
                const userTwoId = faker.random.uuid()
                const userTwoEmail = faker.internet.email()

                firestoreStub.data()[`${Models.USER}/${userTwoId}`] = {
                    [User.f.EMAIL] : userTwoEmail
                }

                firestoreStub.data()[`${Models.USER}/${userId}`] = {
                    [Models.HOUSEHOLD] : {
                        [Household.f.ID] : householdId,
                        [Relations.PIVOT] : {
                            [User.f.HOUSEHOLDS.ROLE] : Roles.ADMIN
                        }
                    }
                }

                const expectedBody = {
                    success : true,
                    householdId: householdId,
                    inviteeId : userTwoId,
                    inviteeEmail : userTwoEmail
                }

                const data = {
                    email : userTwoEmail,
                }

                const { body } = await request(api)
                    .post(`${baseUrl}/${Models.HOUSEHOLD}/${householdId}/invitations`)
                    .set('Accept', 'application/json')
                    .send(data)
                    .set('Authorization', userIdToken)
                    .expect('Content-Type', /json/)
                    .expect(200, expectedBody)
            })
        })
    })
})