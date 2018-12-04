import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'
import CreateUserSensorRelationsCommand from './lib/Command/CreateUserSensorRelationsCommand';
import User from './lib/ORM/Models/User';
import { Models } from './lib/ORM/Models';
import * as _ from 'lodash'

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('OFFLINE', () => {

    let test: FeaturesList
    let firestoreMockData

    let firestoreStub

    firestoreStub = {
        settings: () => { return null },
        collection: (col) => {
            return {
                doc: (id) => {
                    return {
                        id: (id) ? id : uniqid(),
                        set: (data, {merge}) => {

                            if(merge)
                            {
                                firestoreMockData = _.merge(firestoreMockData, {
                                    [`${col}/${id}`] : data
                                })
                            }
                            else firestoreMockData[`${col}/${id}`] = data

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
                            if(!firestoreMockData[`${col}/${id}`]) return null

                            firestoreMockData = _.merge(firestoreMockData, {
                                [`${col}/${id}`] : data
                            })

                            return null
                        }
                    }
                }
            }
        }
    }

    beforeEach(() => {
        firestoreMockData = {}
        test = functionsTest()
    })

    after(async () => {
        test.cleanup()
    })

    describe('Integration_Test', async () => {

        describe('Actionable Field Commands', async () => {

            describe('Create-User-Sensor-Relations-Command', () => {

                const userId        = uniqid()
                const householdId   = uniqid()
                const sensorId      = uniqid()
                const command       = new CreateUserSensorRelationsCommand()
                let user          

                beforeEach(() => {

                    user = new User(firestoreStub, null, userId)

                    firestoreMockData[`${Models.USER}/${userId}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    }

                    firestoreMockData[`${Models.SENSOR}/${sensorId}`] = {
                        [Models.HOUSEHOLD] : {
                            id : householdId
                        }
                    }

                    firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {
                        [Models.SENSOR] : {
                            [sensorId] : true
                        }
                    }

                })

                it('Execution with a Value of true should create relations on User to all Sensors attached to the Household', async () => {

                    await command.execute(user, 'true')

                    const userDoc = firestoreMockData[`${Models.USER}/${userId}`][Models.SENSOR]

                    const expectedUserDoc = {
                        [sensorId] : true
                    }

                    expect(userDoc).to.deep.equals(expectedUserDoc)
                })

                it('Execution with a Value of true should create relations on all Sensors attached to the Household to the User', async () => {

                    await command.execute(user, 'true')

                    const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`][Models.USER]

                    const expectedSensorDoc = {
                        [userId] : {
                            id : userId
                        }
                    }

                    expect(sensorDoc).to.deep.equals(expectedSensorDoc)
                })

                it('Execution with a Value of true should create Pivot Collections between all Sensors attached to the Household to the User', async () => {

                    await command.execute(user, 'true')

                    const sensorDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                    const expectedPivotDoc = {
                        [Models.USER] : {
                            id : userId
                        },
                        [Models.SENSOR] : {
                            id : sensorId
                        }
                    }

                    expect(sensorDoc).to.deep.equals(expectedPivotDoc)
                })
            })
        })
    })
})