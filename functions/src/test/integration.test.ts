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
import { CreateUserNewSensorRelationsCommand } from './lib/Command/CreateUserNewSensorRelationsCommand';
import Household from './lib/ORM/Models/Household';
import { Relations } from './lib/const';

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
                                    try{
                                        if(data)
                                            return firestoreMockData[`${col}/${id}`][data]
                                        else
                                            return firestoreMockData[`${col}/${id}`]
                                    }
                                    catch(e)
                                    {
                                        throw Error(`Mock data is missing: ${e} [${`${col}/${id}`}]`)
                                    }
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

                    const pivotDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                    const expectedPivotDoc = {
                        [Models.USER] : {
                            id : userId
                        },
                        [Models.SENSOR] : {
                            id : sensorId
                        }
                    }

                    expect(pivotDoc).to.deep.equals(expectedPivotDoc)
                })
            })

            describe('Create-User-New-Sensor-Relations-Command', () => {
                
                const userId        = uniqid()
                const householdId   = uniqid()
                const sensorId      = uniqid()
                const command       = new CreateUserNewSensorRelationsCommand()
                let household

                beforeEach(() => {

                    household = new Household(firestoreStub, null, householdId)

                    firestoreMockData[`${Models.HOUSEHOLD}/${householdId}`] = {
                        [Models.USER] : {
                            [userId] : true
                        }
                    }

                    firestoreMockData[`${Models.USER}/${userId}`] = {
                        [Models.HOUSEHOLD] : {
                            [Relations.PIVOT] : {
                                accepted : true
                            }
                        }
                    }
                })

                it('Execution should add relational links from the User to the Sensors of the Household', async () => {

                    await command.execute(household, {[sensorId] : true})

                    const userDoc = firestoreMockData[`${Models.USER}/${userId}`]

                    const expectedUserDoc = {
                        [Models.HOUSEHOLD] : {
                            [Relations.PIVOT] : {
                                accepted : true
                            }
                        },
                        [Models.SENSOR] : {
                            [sensorId] : true
                        }
                    }

                    expect(expectedUserDoc).to.be.deep.equal(userDoc)
                })

                it('Execution should add relational links from the Sensors to the Users of the Household', async () => {

                    await command.execute(household, {[sensorId] : true})

                    const sensorDoc = firestoreMockData[`${Models.SENSOR}/${sensorId}`]

                    const expectedSensorDoc = {
                        [Models.USER] : {
                            [userId] : true
                        }
                    }

                    expect(expectedSensorDoc).to.be.deep.equal(sensorDoc)
                })

                it('Execution should create Pivot collections between Sensors and Users of the Household', async () => {

                    await command.execute(household, {[sensorId] : true})

                    const sensorUserDoc = firestoreMockData[`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`]

                    const expectedSensorUserDoc = {
                        [Models.USER] : {
                            id : userId
                        },
                        [Models.SENSOR] : {
                            id : sensorId
                        }
                    }

                    expect(expectedSensorUserDoc).to.be.deep.equal(sensorUserDoc)
                })
            })
        })
    })
})