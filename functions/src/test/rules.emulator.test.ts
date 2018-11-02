import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as functionsTest from 'firebase-functions-test'
import firebase from '@firebase/testing'
import * as fs from 'fs'

import { FeaturesList } from 'firebase-functions-test/lib/features'

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe.only('OFFLINE', () => {

    var test: FeaturesList
    var myFunctions

    const testUserDataOne = {
        uid: "test-user-1",
        name: "Andy",
        email: "andy@mail.com",
    }

    const testUserDataTwo = {
        uid: "test-user-2",
        name: "Benny",
        email: "Benny@mail.com",
    }

    const testUserDataThree = {
        uid: "test-user-3",
        name: "Charlie",
        email: "Charlie@mail.com",
    }

    before(async () => {
        return
       
    })

    after(async () => {
        return
    })

    describe('Emulated Rules', () => {
        return
    })
})