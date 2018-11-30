import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'
import CreateUserSensorRelationsCommand from './lib/Command/CreateUserSensorRelationsCommand';
import User from './lib/ORM/Models/User';
import { Models } from './lib/ORM/Models';

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('OFFLINE', () => {

    let test: FeaturesList
    let firestoreStub
    let firestoreMockData

    before(async () => {

        test = functionsTest()

        firestoreStub = {
            settings: () => { return null },
            collection: (col) => {
                return {
                    doc: (id) => {
                        return {
                            id: (id) ? id : uniqid(),
                            set: (data) => {
                                firestoreMockData[`${col}/${id}`] = data
                                return null
                            },
                            get: () => {
                                return {
                                    get: (data) => {
                                        if(data)
                                            return firestoreMockData[`${col}/${id}`][data]
                                        else
                                            return firestoreMockData[`${col}/${id}`]
                                    }
                                }
                            },
                            update: (data) => {
                                firestoreMockData[`${col}/${id}`] = data
                                return null
                            }
                        }
                    }
                }
            }
        }
    })

    after(async () => {
        test.cleanup()
    })

    describe('Integration_Test', async () => {

        // let docsToBeDeleted

        beforeEach(() => {
            // docsToBeDeleted = []
            firestoreMockData = {}
        })

        afterEach(async () => {
            // await asyncForEach(docsToBeDeleted, async (path: string ) => {
            //     await adminFs.doc(path).delete()
            // })
        })

        describe('Actionable Field Commands', async () => {

            // it('Execution of User Sensor Relations Command should ', async () => {
            //     const command = new CreateUserSensorRelationsCommand()

            //     const userId = uniqid()
            //     const householdId = uniqid()
            //     const sensorId = uniqid()

            //     firestoreMockData[`${Models.USER}/${userId}`] = {
            //         [Models.HOUSEHOLD] : {
            //             id : householdId
            //         }
            //     }

            //     firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
            //         [Models.HOUSEHOLD] : {
            //             id : householdId
            //         }
            //     }

            //     firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {
            //         [Models.SENSOR] : {
            //             [sensorId] : true
            //         }
            //     }

            //     const user = new User(firestoreStub, null, userId)

            //     await command.execute(user, 'true')

            //     console.log(firestoreMockData)
            // })
        })
    })
})