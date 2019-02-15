import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'
import { FirestoreStub } from './stubs';
import BaseStation from './lib/ORM/Models/BaseStation';
import { Models } from './lib/ORM/Models';
import { Errors } from './lib/const';
const randomstring = require('randomstring')

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('Unit_Test', () => {

    let test: FeaturesList
    let adminFs: FirebaseFirestore.Firestore
    const firestoreStub = new FirestoreStub()

    before(async () => {

        const stageProjectId = 'staging-cue-iot-cloud'

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        try {
            admin.initializeApp()
        } catch (e) {}

    })

    after(async () => {
        test.cleanup()
    })

    let baseStationPins = []
    let baseStationPinCount = 0

    function getNextPinCode () {
        const code = (baseStationPins[baseStationPinCount]) ? baseStationPins[baseStationPinCount] : uniqid()
        baseStationPinCount++
        return code
    }

    before(() => {
        sinon.stub(randomstring, 'generate').get(() => {
            return () => {
                return getNextPinCode()
            }
        })
    })

    beforeEach(() => {
        firestoreStub.reset()
        baseStationPins = []
        baseStationPinCount = 0
    })

    describe('Base Station', () => {

        const baseStationUUID = uniqid()
        let baseStation : BaseStation

        const baseStationPin        = uniqid()
        const baseStationTwoPin     = uniqid()

        beforeEach(() => {
            baseStation = new BaseStation(firestoreStub.get(), null, baseStationUUID)
        })

        describe('Generate Unique Pin', () => {

            it('Should return string', async () => {
                const code = await baseStation.generateUniquePin()
                expect(code).to.be.string
            })

            it('Should generate different pin every time' , async () => {
                const code = await baseStation.generateUniquePin()
                const code2 = await baseStation.generateUniquePin()

                expect(code).to.not.be.equal(code2)
            })

            it('Should generate unique pin code in relation to the ones already assigned in other Base Stations', async () => {
                //mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [BaseStation.f.PIN] : baseStationPin
                }

                baseStationPins = [
                    baseStationPin
                ]

                const code = await baseStation.generateUniquePin()

                expect(code).to.not.be.equal(baseStationPin)
            })

            it('Should throw error after exceeding 10 attempts', async () => {
                
                //mock data
                firestoreStub.data()[`${Models.BASE_STATION}/${baseStationUUID}`] = {
                    [BaseStation.f.PIN] : baseStationPin
                }

                baseStationPins = [
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin,
                    baseStationPin
                ]

                let error = null
                let code = null

                try{
                    code = await baseStation.generateUniquePin()
                }
                catch(e)
                {
                    error = e
                }

                expect(code).to.be.null
                expect(error.message).to.be.equal(Errors.TOO_MANY_ATTEMPTS)
            })
        })
    })
})