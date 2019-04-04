import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as _ from 'lodash'
import * as functionsTest from 'firebase-functions-test'
import * as express from 'express'

import * as request from 'supertest';
import { FeaturesList } from 'firebase-functions-test/lib/features';

const assert = chai.assert
const expect = chai.expect

const baseUrl: string = '/api/v1'

describe('Api_Test', () => {

    let test: FeaturesList
    let api: Express.Application

    before(() => {
        const stageProjectId = 'staging-cue-iot-cloud'

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        try {
            admin.initializeApp()
        } catch (e) {}

        api = require('../lib/index').api
    })

    after(async () => {
        test.cleanup()
        admin.app().delete()
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

    // describe('Auth', () => {

    //     describe('', () => {
    //         it('Should', async () => {

    //             const id = 'FGFKV4YTC9XD5bG1e4QCHlTWQez2'
    //             const baseStationId = 124
    //             const token = await admin.auth().createCustomToken(id, {
    //                 isAdmin : true
    //             })

    //             console.log(token)

    //             const expectedBody = {
    //                 "success" : true
    //             }

    //             await request(api)
    //                 // .delete(`${baseUrl}/base-stations/${baseStationId}`)
    //                 .get(`${baseUrl}/me`)
    //                 .set('Accept', 'application/json')
    //                 .set('Authorization', token)
    //                 .expect('Content-Type', /json/)
    //                 .expect(200, expectedBody)
    //         })
    //     })
    // })
})