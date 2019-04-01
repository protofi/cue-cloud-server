import * as chai from 'chai'
import * as sinon from 'sinon'
import * as _ from 'lodash'

import * as request from 'supertest';

const assert = chai.assert
const expect = chai.expect

const baseUrl = '/api/v1/'

describe.only('Api_Test', () => {
    let app

    before(() => {
        app = require('../lib/index')
    })

    describe('GET /api/v1/', () =>
    {
        it('Should respond with welcome message', async () =>
        {
            const expectedBody = {
                "message" : "Welcome to the Cue API."
            }
            await request(app.api)
                .get(baseUrl)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200, expectedBody)
        })
    })
})