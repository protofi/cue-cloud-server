import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'

import DataORMImpl from "./lib/ORM"
import { asyncForEach } from './lib/util'
import Sensor from './lib/ORM/Models/Sensor'
import ModelImpl, { Models } from './lib/ORM/Models'
import Room from './lib/ORM/Models/Room'
import Event from './lib/ORM/Models/Event'
import { ActionableFieldCommandStub, Stubs, ModelCommandStub } from './stubs'
import { Many2ManyRelation, One2ManyRelation, N2OneRelation } from './lib/ORM/Relation'
import { Pivot } from './lib/ORM/Relation/Pivot'
import { Change } from 'firebase-functions'
import { unflatten, flatten } from 'flat'
import * as _ from 'lodash'
import { Relations } from './lib/const'
import Car from './stubs/Car'
import Wheel from './stubs/Wheel'
import Driver from './stubs/Driver'

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('STAGE', () => {

    let test: FeaturesList
    let adminFs: FirebaseFirestore.Firestore
    let db: DataORMImpl
    let stubFs
    let firestoreMockData

    before(async () => {

        const stageProjectId = "staging-cue-iot-cloud"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        try {
            admin.initializeApp()
        } catch (e) {}
        
        try {
            adminFs = admin.firestore()
            adminFs.settings({ timestampsInSnapshots: true })
        } catch (e) {}

        db = new DataORMImpl(adminFs)

        stubFs = {
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
                                        [`${col}/${id}`] : unflatten(data)
                                    })
                                }
                                else firestoreMockData[`${col}/${id}`] = unflatten(data)
    
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
                                            console.error(`Mock data is missing: ${e.message} [${`${col}/${id}`}]`)
                                            return undefined
                                        }
                                    },
                                    exists : (!_.isUndefined(firestoreMockData[`${col}/${id}`]))
                                }
                            },
                            update: (data) => {
                                
                                if(!firestoreMockData[`${col}/${id}`]) throw Error(`Mock data is missing: [${`${col}/${id}`}]`)

                                //Handle field deletion
                                const flattenData = flatten(data)
                                
                                _.forOwn(flattenData, (value, key) => {
                                    if(value !== admin.firestore.FieldValue.delete()) return
                                    
                                    _.unset(data, key)
                                    _.unset(firestoreMockData[`${col}/${id}`], key)
                                })

                                firestoreMockData = _.merge(firestoreMockData, {
                                    [`${col}/${id}`] : unflatten(data)
                                })
    
                                return null
                            },

                            delete: () => {
                                _.unset(firestoreMockData, `${col}/${id}`)
                            }
                        }
                    },
                    where: (field: string, operator: string, value: string) => {
                        return {
                            get: () => {

                                const docs: Array<Object> = new Array<Object>()

                                _.forOwn(firestoreMockData, (collection, path) => {

                                    if(!path.includes(col)) return

                                    if(!_.has(collection, field)) return
                                    
                                    if(_.get(collection, field) !== value) return

                                    docs.push(_.merge(firestoreMockData[path], {
                                        ref: {
                                            delete: () => {
                                                _.unset(firestoreMockData, path)
                                            }
                                        }
                                    }))
                                })

                                return docs
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

    describe('ORM', async () => {

        let docsToBeDeleted

        beforeEach(() => {
            docsToBeDeleted = []
            firestoreMockData = {}
        })

        afterEach(async () => {
            await asyncForEach(docsToBeDeleted, async (path: string) => {
                await adminFs.doc(path).delete()
            })
        })

        describe('CRUD', async () => {

            it('Create doc new ref', async () => {
                const docRef = db.user().getDocRef()

                expect(docRef).exist
                expect(docRef.id).exist
                expect(docRef.path).exist

                expect(docRef.path).to.equals(`${Models.USER}/${docRef.id}`)
            })

            it('Create doc new ref with certain id', async () => {
                const uid: string = uniqid()

                const docRef: FirebaseFirestore.DocumentReference = db.user().getDocRef(uid)
                expect(docRef).exist
                expect(docRef.id).to.equals(uid)
                expect(docRef.path).exist

                expect(docRef.path).to.equals(`${Models.USER}/${uid}`)
            })

            it('Create model based on doc id', async () => {
                const uid = uniqid()

                const car = new Car(stubFs, null, uid)

                const docRef = car.getDocRef()
           
                expect(uid).to.equal(docRef.id)
            })

            it('Create model based on doc snap', async () => {
                const snap = test.firestore.exampleDocumentSnapshot()
           
                const car = new Car(stubFs, snap)
                const docRef = car.getDocRef()
           
                expect(snap.ref.id).to.equal(docRef.id)
            })

            it('Get ref returns the same ref after initialization', async () => {
                const car = new Car(stubFs)
                const docRef1 = car.getDocRef()
                const docRef2 = car.getDocRef()

                expect(docRef1.id).to.equals(docRef2.id)
            })

            it('it should be possible to retrieve the Id of a model though method getId', async () => {
                const car = new Car(stubFs)
                const id = car.getId()

                expect(id).exist
            })

            it('GetId should return the same id a model was created with', async () => {
                const carId = uniqid()
                const car = new Car(stubFs, null, carId)
                const id = car.getId()

                expect(id).to.be.equal(carId)
            })

            it('Get ID of created docRef', async () => {
                const carId = uniqid()

                const car = await new Car(stubFs, null, carId).create({
                    name : 'Mustang'
                })

                const carId2 = car.getId()
                
                expect(carId).to.be.equal(carId2)
            })

            it('Creating a model with data should be possible', async () => {
                const carId = uniqid()
                const carName = 'Mustang'

                const car = new Car(stubFs, null, carId)

                await car.create({
                    name: carName
                })

                const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                const expectedCarDoc = {
                    name : carName
                }

                expect(carDoc).to.deep.equals(expectedCarDoc)
            })

            it('Creating a model using Batch should be possible', async () => {
                const carId = uniqid()
                const carName = 'Mustang'

                const batch = adminFs.batch()
                const car = new Car(adminFs, null, carId)

                //Clean up
                docsToBeDeleted.push(car.getDocRef().path)

                await car.create({
                    name: carName
                }, batch)

                await batch.commit()

                const carDoc = await adminFs.collection(Stubs.CAR).doc(carId).get()
                const carData = carDoc.data()
                const expectedCarData = {
                    name : carName
                }

                expect(carData).to.deep.equals(expectedCarData)
            })

            it('Creating a model using Batch should fail if Batch is not commited', async () => {
                const carId = uniqid()
                const carName = 'Mustang'

                const batch = adminFs.batch()
                const car = new Car(adminFs, null, carId)

                await car.create({
                    name: carName
                }, batch)

                const carDoc = await adminFs.collection(Stubs.CAR).doc(carId).get()

                expect(carDoc.exists).to.false
            })

            it('Method Find should be able to retrive one particular model by id', async () => {
                const carId = uniqid()
                const carId2 = uniqid()
                const car = new Car(stubFs, null, carId)

                const car2 = await car.find(carId2)

                expect(car2.getId()).to.be.equal(carId2)
            })

            it('Method Find should be able to set the Id of an already instantiated model', async () => {
                const carId = uniqid()
                const car = new Car(stubFs)

                await car.find(carId)

                expect(car.getId()).to.be.equal(carId)
            })

            it('Single data fields on a model should be retrievable through method getField', async () => {
                const carId = uniqid()
                const carName = 'Mustang'

                firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                    name : carName
                }

                const car = new Car(stubFs, null, carId)

                const fetchedName = await car.getField('name')

                expect(carName).to.be.equal(fetchedName)
            })

            it('GetField should return undefined id field does not exist', async () => {
                const carId = uniqid()

                const car = new Car(stubFs, null, carId)

                const fetchedName = await car.getField('name')

                expect(fetchedName).to.be.undefined
            })

            it('It should be possible to update data on an already existing model', async () => {
                const carId = uniqid()
                const car = new Car(stubFs, null, carId)

                firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                    name : 'Mustang'
                }

                await car.update({
                    name : 'Fiesta'
                })

                const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                const expectedCarDoc = {
                    name : 'Fiesta'
                }
                expect(carDoc).to.be.deep.equal(expectedCarDoc)
            })

            it('It should be possible to update data on an already existing model in batch', async () => {
                const carId = uniqid()

                await adminFs.collection(Stubs.CAR).doc(carId).create({
                    name : 'Mustang'
                })

                const car = await new Car(adminFs, null, carId)
                
                //Clean up
                docsToBeDeleted.push((car.getDocRef()).path)

                const batch = adminFs.batch()

                await car.update({
                    name : 'Fiesta'
                }, batch)

                await batch.commit()

                const carDoc = await adminFs.collection(Stubs.CAR).doc(carId).get()

                const expectedCarDocData = {
                    name : 'Fiesta'
                }
                expect(carDoc.data()).to.be.deep.equal(expectedCarDocData)
            })

            it('If batch commit is not invoked not data should be updated on the model', async () => {
                const carId = uniqid()

                await adminFs.collection(Stubs.CAR).doc(carId).create({
                    name : 'Mustang'
                })

                const car = await new Car(adminFs, null, carId)
                
                //Clean up
                docsToBeDeleted.push((car.getDocRef()).path)

                const batch = adminFs.batch()

                await car.update({
                    name : 'Fiesta'
                }, batch)

                const carDoc = await adminFs.collection(Stubs.CAR).doc(carId).get()

                const expectedCarDocData = {
                    name : 'Mustang'
                }
                expect(carDoc.data()).to.be.deep.equal(expectedCarDocData)
            })

            it('It should be possible to delete a model', async () => {
                const carId = uniqid()
                const car = new Car(stubFs, null, carId)

                firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                    name : 'Mustang'
                }

                await car.delete()

                const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]

                expect(carDoc).to.not.exist
            })

            it('It should be possible to define actions to be executed onCreate', async () => {

                const command = new ModelCommandStub()
                const commandSpy = sinon.spy(command, 'execute')
                class ModelStub extends ModelImpl
                {
                    getModelAction()
                    {
                        return this.onCreateAction
                    }
                }

                const model = new ModelStub('', stubFs)

                model.addOnCreateAction(command)
                
                const modelAction = model.getModelAction()
                
                expect(modelAction).to.not.be.null
                expect(modelAction).equal(command)
                await modelAction.execute(model)
                expect(commandSpy.callCount).to.equals(1)
            })

            it('onCreate actions should be executed when .created on Model is invoked', async () => {

                const command = new ModelCommandStub()
                const commandSpy = sinon.spy(command, 'execute')

                const model = new ModelImpl('', stubFs)

                model.addOnCreateAction(command)
                
                model.onCreate()
                
                expect(commandSpy.callCount).to.equals(1)
            })

            it('If no action is defined invokation of .created should be ignored', async () => {

                const model = new ModelImpl('', stubFs)
                let error

                try{
                    await model.onCreate()
                }
                catch(e)
                {
                    error = e
                }

                expect(error).is.undefined
            })

            it('If a model is instatiated not already existing in the DB the method exists should return false', async () => {
                const car = new Car(stubFs)

                expect(await car.exists()).to.be.false
            })

            it('If a model is instatiated with an ID not already existing in the DB the method exists should return false', async () => {
                const carId = uniqid()
                const car = new Car(stubFs, null, carId)

                expect(await car.exists()).to.be.false
            })

            it('If a model is instatiated already existing in the DB the method exists should return true', async () => {

                const carId = uniqid()

                firestoreMockData[`${Stubs.CAR}/${carId}`] = {}

                // await adminFs.collection(Stubs.CAR).doc(carId).create({})

                const car = new Car(stubFs, null, carId)

                expect(await car.exists()).to.be.true
            })

            it('If a model is fetch with method find() already existing in the DB the method exists should return true', async () => {
                const carId = uniqid()
                firestoreMockData[`${Stubs.CAR}/${carId}`] = { id: carId }

                const car = await new Car(stubFs).find(carId)

                expect(await car.exists()).to.be.true
            })

            it('If a model is fetch with method find() not already existing in the DB the method exists should return false', async () => {
                const carId = uniqid()

                const car = await new Car(stubFs).find(carId)

                expect(await car.exists()).to.be.false
            })

            describe('Actionable fields', () => {

                it('Actionable fields should be defined on the relation between the owner model and property model', async () => {

                    const actionableField = 'flat'

                    const command = new ActionableFieldCommandStub()
                    const commandSpy = sinon.spy(command, 'execute')

                    class ModelStub extends ModelImpl
                    {
                        getFieldActions()
                        {
                            return this.actionableFields
                        }
                    }

                    const model = new ModelStub('', stubFs)

                    model.defineActionableField(actionableField, command)

                    const fieldActions = model.getFieldActions()

                    expect(fieldActions.get(actionableField)).to.not.be.null

                    await fieldActions.get(actionableField).execute(model, 'true')

                    expect(commandSpy.callCount).to.equals(1)
                })
                
                it('TakeActionOn should be able to react to changes when before snap is empty', async () => {

                    const wheelId1 = uniqid()
                    const wheel = new Wheel(stubFs, null, wheelId1)

                    const actionableField = 'flat'

                    const command = new ActionableFieldCommandStub()
                    const commandSpy = sinon.spy(command, 'execute')

                    wheel.defineActionableField(actionableField, command)
                    const data = {
                        [actionableField] : true
                    }
                   
                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await wheel.takeActionOn(change)

                    expect(commandSpy.callCount).to.equals(1)
                    expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof wheel)
                    expect(commandSpy.firstCall.args[1]).to.be.true
                })

                it('TakeActionOn should be able to handle if no changes has been made to the model data', async () => {

                    const actionableField = 'flat'

                    const model = new Wheel(stubFs)

                    const command = new ActionableFieldCommandStub()
                    const commandSpy = sinon.spy(command, 'execute')

                    model.defineActionableField(actionableField, command)

                    const data = {
                        [Relations.PIVOT] : {
                            [Stubs.CAR] : {
                                [actionableField] : 'bob'
                            }
                        }
                    }
                   
                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await model.takeActionOn(change)
                    
                    expect(commandSpy.callCount).to.equals(0)
                })

                it('A defined field action should be executed when changes to the particular field are passed to takeActionOn', async () => {

                    const wheel = new Wheel(stubFs)
                    const actionableField = 'flat'

                    const command = new ActionableFieldCommandStub()
                    const commandSpy = sinon.spy(command, 'execute')

                    wheel.defineActionableField(actionableField, command)

                    const data = {
                        name : 'spare'
                    }
                   
                    const before = test.firestore.makeDocumentSnapshot(data, '')

                    data[actionableField] = true

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await wheel.takeActionOn(change)
                    
                    expect(commandSpy.callCount).to.equals(1)
                    expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof wheel)
                    expect(commandSpy.firstCall.args[1]).to.be.true
                })

                it('Changes made the fields on the owner model with simular names should not course a action on pivot to execute', async () => {

                    const wheel = new Wheel(stubFs)

                    const actionableField = 'flat'

                    const command = new ActionableFieldCommandStub()
                    const commandSpy = sinon.spy(command, 'execute')

                    wheel.defineActionableField(actionableField, command)

                    const data = {
                        'name' : 'front-left'
                    }

                    const before = test.firestore.makeDocumentSnapshot(data, '')

                    data[Relations.PIVOT] = true

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await wheel.takeActionOn(change)
                    
                    expect(commandSpy.callCount).to.equals(0)
                })
            })
        })

        describe('Relations', () => {

            describe('One-to-One', async () => {
                
                it('Related models method should return the same relation every time', async () => {

                    const sensor: Sensor = db.sensor()

                    const room1 = sensor.room()
                    const room2 = sensor.room()

                    expect(room1).to.deep.equals(room2)
                })

                it('Save model to an other', async () => {
                    
                    const sensor: Sensor = db.sensor()
                    const room: Room = db.room()

                    await sensor.room().set(room)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                    const roomId = await room.getId()
                    
                    const attRoom = await sensor.getField(room.name)
                    
                    expect(roomId).to.deep.equals(attRoom.id)
                })

                it('Save model to an other inverse I2M', async () => {
                    
                    const sensor: Sensor = db.sensor()
                    const room: Room = db.room()

                    await sensor.room().set(room)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                    const roomId = await room.getId()
                    const sensorId = await sensor.getId()
                    
                    const attRoom = await sensor.getField(room.name)
                    const attSensors = await room.getField(sensor.name)

                    expect(roomId).to.deep.equals(attRoom.id)
                    expect(Object.keys(attSensors), 'Foreign key on room').to.include(sensorId)
                })
               
                it('A model can have multiple relations', async () => {
                    const sensor: Sensor = db.sensor()
                    const room: Room = db.room()
                    const event: Event = db.event()

                    await event.sensor().set(sensor)
                    await room.sensors().attach(sensor)

                    //clean up
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(room.getDocRef().path)
                    docsToBeDeleted.push(event.getDocRef().path)
                    
                    const attRoom = await sensor.getField(room.name)
                    const attEvents = await sensor.getField(event.name)

                    const attSensors = await room.getField(sensor.name)
                    const attSensor = await event.getField(sensor.name)

                    const sensorId = sensor.getId()
                    const roomId = room.getId()
                    const eventId = event.getId()

                    expect(roomId).to.deep.equals(attRoom.id)
                    expect(sensorId).to.deep.equals(attSensor.id)
                    expect(Object.keys(attEvents), 'Foreign key on sensor').to.include(eventId)
                    expect(Object.keys(attSensors), 'Foreign key on room').to.include(sensorId)
                })

                it('Save model to an other inverse I2M BATCH', async () => {
                    
                    const sensor: Sensor = db.sensor()
                    const room: Room = db.room()

                    const batch = db.batch()

                    await sensor.room().set(room, batch)

                    //clean up
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(room.getDocRef().path)
                    
                    await batch.commit()

                    const roomId = room.getId()
                    const sensorId = sensor.getId()
                    
                    const attRoom = await sensor.getField(room.name)
                    const attSensors = await room.getField(sensor.name)

                    expect(roomId).to.deep.equals(attRoom.id)
                    expect(Object.keys(attSensors), 'Foreign key on room').to.include(sensorId)
                })

                it('Save model to an other inverse I2M BATCH SHOULD FAIL', async () => {
                    const sensor: Sensor = db.sensor()
                    const room: Room = db.room()

                    const batch = db.batch()

                    await sensor.room().set(room, batch)

                    const roomId = room.getId()
                    const sensorId = sensor.getId()
                    
                    const sensorDoc = await adminFs.doc(`${Models.SENSOR}/${sensorId}`).get()
                    const roomDoc = await adminFs.doc(`${Models.ROOM}/${roomId}`).get()
                    const attRoom = sensorDoc.get(Models.ROOM)
                    const attSensors = roomDoc.get(Models.SENSOR)

                    expect(attRoom).not.exist
                    expect(attSensors).not.exist  
                })
            })

            describe('One-to-many', async () => {

                it('Retrieving a relation on a Model should return the same Relation every time', async () => {
                    
                    const car: Car = new Car(stubFs)

                    const rel1 = car.wheels()
                    const rel2 = car.wheels()
                    
                    expect(rel1).to.equals(rel2)
                })

                it('Retrieving properties from a relation should return and array of Models of the correct type', async () => {

                    const wheelId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.WHEEL] : {
                            [wheelId] : true
                        }
                    }
                    
                    firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                        [Stubs.CAR] : {
                            id : wheelId
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    const wheels = await car.wheels().get() as Array<Wheel>

                    expect(wheels[0].car).to.exist
                    expect(typeof wheels[0].car).to.be.equal(typeof Function)
                })

                it('The pivot should be updatable trough the relation', async () => {
           
                    const car = new Car(adminFs)
                    const wheel = new Wheel(adminFs)

                    await car.wheels().attach(wheel)

                    const dataName = 'Spare'

                    //clean up
                    docsToBeDeleted.push(wheel.getDocRef().path)
                    docsToBeDeleted.push(car.getDocRef().path)

                    const wheelId1 = wheel.getId()
                    
                    await car.wheels().updatePivot(wheelId1, {
                        name : dataName,
                        flat: true
                    })

                    await car.wheels().updatePivot(wheelId1, {
                        flat : true
                    })

                    const doc: FirebaseFirestore.DocumentSnapshot = await adminFs.collection(Stubs.WHEEL).doc(wheelId1).get()

                    expect(doc.get(`${Stubs.CAR}.${Relations.PIVOT}.name`)).to.be.equal(dataName)
                })

                it('The pivot should be updatable trough the inverse relation', async () => {
                    
                    const carId = uniqid()
                    const wheelId = uniqid()

                    const car = new Car(stubFs, null, carId)
                    const wheel = new Wheel(stubFs, null, wheelId)

                    const dataName = 'Spare'

                    await car.wheels().attach(wheel)

                    await wheel.car().updatePivot({
                        name : dataName
                    })

                    const wheelDoc = firestoreMockData[`${Stubs.WHEEL}/${wheelId}`]
                    const expectedWheelDoc = {
                        [Stubs.CAR] : {
                            id : carId,
                            [Relations.PIVOT] : {
                                name : dataName
                            }
                        }
                    }

                    expect(wheelDoc).to.deep.include(expectedWheelDoc)
                })

                it('Create root documents and relation by attaching two models', async () => {
                    const room = db.room()
                    const sensor = db.sensor()

                    await room.sensors().attach(sensor)

                    //clean up
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(room.getDocRef().path)
                    
                    const roomSensors = await room.getField(sensor.name)
                    const sensorRoom = await sensor.getField(room.name)

                    const roomId = room.getId()
                    const sensorId = sensor.getId()

                    expect(Object.keys(roomSensors), 'Foreign key on room').to.include(sensorId)
                    expect(roomId, 'Foreign key on sensor').equals(sensorRoom.id)
                })

                it('Make sure models can be attached and retrieved "inverse"', async () => {

                    const room: Room = db.room()
                    const sensor: Sensor = db.sensor()

                    const roomId = room.getId()

                    await room.sensors().attach(sensor)

                    //clean up
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(room.getDocRef().path)
                    
                    const attRoom = await sensor.room().get()

                    expect(roomId).to.equal(attRoom.getId())
                })

                it('If no models are attached retrieving "inverse" should return null', async () => {

                    const sensor: Sensor = db.sensor()

                    const attRoom = await sensor.room().get()
                    expect(attRoom).to.be.null
                })

                it('When models are attached by id relation to the property model should be made on the owner', async () => {
          
                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const wheel = new Wheel(stubFs)

                    await car.wheels().attachById(wheel.getId())
                    
                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.WHEEL] : { [wheel.getId()] : true }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                })
                
                it('When models are attached by id relation to the owner model should be made on the property model', async () => {
                    
                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const wheel = new Wheel(stubFs)

                    await car.wheels().attachById(wheel.getId())
                    
                    const wheelDoc = firestoreMockData[`${Stubs.WHEEL}/${wheel.getId()}`]
                    const expectedWheelDoc = {
                        [Stubs.CAR] : { id : carId }
                    }

                    expect(wheelDoc).to.deep.equal(expectedWheelDoc)
                })

                it('When a write batch are passed to attachbyId the relations should be made when commit on batch is invoked', async () => {
                    
                    const carId = uniqid()
                    const car = new Car(adminFs, null, carId)

                    const wheel = new Wheel(adminFs)

                    //clean up
                    docsToBeDeleted.push(car.getDocRef().path)
                    docsToBeDeleted.push(wheel.getDocRef().path)

                    const batch = adminFs.batch()

                    await car.wheels().attachById(wheel.getId(), batch)
                    
                    await batch.commit()

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w = await adminFs.doc(`${Stubs.WHEEL}/${wheel.getId()}`).get()

                    expect(c.data()).to.deep.equal({ [Stubs.WHEEL] : { [wheel.getId()] : true }})
                    expect(w.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                })

                it('When a write batch are passed to attachById and commit on batch is not invoked the relations should not be made', async () => {
                    
                    const carId = uniqid()
                    const car = new Car(adminFs, null, carId)

                    const wheel = new Wheel(adminFs)

                    //clean up
                    docsToBeDeleted.push(car.getDocRef().path)
                    docsToBeDeleted.push(wheel.getDocRef().path)

                    const batch = adminFs.batch()

                    await car.wheels().attachById(wheel.getId(), batch)
                    
                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w = await adminFs.doc(`${Stubs.WHEEL}/${wheel.getId()}`).get()

                    expect(c.exists).to.be.false
                    expect(w.exists).to.be.false
                })

                it('When models are attached in bulk relations to all property models should be made on the owner', async () => {

                    const carId = uniqid()

                    const wheelId1 = uniqid()
                    const wheelId2 = uniqid()
                    const wheelId3 = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(stubFs, null, wheelId1),
                        new Wheel(stubFs, null, wheelId2),
                        new Wheel(stubFs, null, wheelId3)
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId1]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId2]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId3]).to.exist
                })

                it('When models are attached in bulk relations to the owner model should be made on the properties', async () => {

                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(stubFs, null, wheelId1),
                        new Wheel(stubFs, null, wheelId2),
                        new Wheel(stubFs, null, wheelId3)
                    ])

                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId1}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId2}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId3}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                })

                it('AttachByIdBulk should not update any collection if id array is empty', async () => {
                    const carId = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachByIdBulk([])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`]).to.not.exist
                })

                it('When a write batch are passed to attachBulk the relations should be made when commit on batch is invoked', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(adminFs, null, wheelId1),
                        new Wheel(adminFs, null, wheelId2),
                        new Wheel(adminFs, null, wheelId3)
                    ], batch)

                    //clean up
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId1}`)
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId2}`)
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId3}`)
                    docsToBeDeleted.push(`${Stubs.CAR}/${carId}`)

                    await batch.commit()

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w1 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId1}`).get()
                    const w2 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId2}`).get()
                    const w3 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId3}`).get()

                    expect(c.data()).to.deep.include({ [Stubs.WHEEL] : {
                            [wheelId1] : true,
                            [wheelId2] : true,
                            [wheelId3] : true
                        }
                    })

                    expect(w1.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                    expect(w2.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                    expect(w3.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                })

                it('When a write batch are passed to attachBulk and commit on batch is not invoked the relations should not be made', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(adminFs, null, wheelId1),
                        new Wheel(adminFs, null, wheelId2),
                        new Wheel(adminFs, null, wheelId3)
                    ], batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w1 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId1}`).get()
                    const w2 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId2}`).get()
                    const w3 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId3}`).get()

                    expect(c.exists).to.be.false
                    expect(w1.exists).to.be.false
                    expect(w2.exists).to.be.false
                    expect(w3.exists).to.be.false
                })

                it('When models are attached in bulk relations to all property models should be made on the owner', async () => {

                    const carId = uniqid()

                    const wheelId1 = uniqid()
                    const wheelId2 = uniqid()
                    const wheelId3 = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(stubFs, null, wheelId1),
                        new Wheel(stubFs, null, wheelId2),
                        new Wheel(stubFs, null, wheelId3)
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId1]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId2]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId3]).to.exist
                })

                it('When models are attached in bulk relations to the owner model should be made on the properties', async () => {

                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(stubFs, null, wheelId1),
                        new Wheel(stubFs, null, wheelId2),
                        new Wheel(stubFs, null, wheelId3)
                    ])

                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId1}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId2}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId3}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                })

                it('AttachByIdBulk should not update any collection if id array is empty', async () => {
                    const carId = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachByIdBulk([])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`]).to.not.exist
                })

                it('When a write batch are passed to attachBulk the relations should be made when commit on batch is invoked', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(adminFs, null, wheelId1),
                        new Wheel(adminFs, null, wheelId2),
                        new Wheel(adminFs, null, wheelId3)
                    ], batch)

                    //clean up
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId1}`)
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId2}`)
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId3}`)
                    docsToBeDeleted.push(`${Stubs.CAR}/${carId}`)

                    await batch.commit()

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w1 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId1}`).get()
                    const w2 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId2}`).get()
                    const w3 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId3}`).get()

                    expect(c.data()).to.deep.include({ [Stubs.WHEEL] : {
                            [wheelId1] : true,
                            [wheelId2] : true,
                            [wheelId3] : true
                        }
                    })

                    expect(w1.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                    expect(w2.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                    expect(w3.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                })

                it('When a write batch are passed to attachBulk and commit on batch is not invoked the relations should not be made', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.wheels().attachBulk([
                        new Wheel(adminFs, null, wheelId1),
                        new Wheel(adminFs, null, wheelId2),
                        new Wheel(adminFs, null, wheelId3)
                    ], batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w1 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId1}`).get()
                    const w2 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId2}`).get()
                    const w3 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId3}`).get()

                    expect(c.exists).to.be.false
                    expect(w1.exists).to.be.false
                    expect(w2.exists).to.be.false
                    expect(w3.exists).to.be.false
                })

                it('When models are attached in bulk relations to all property models should be made on the owner', async () => {

                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachByIdBulk([
                        wheelId1,
                        wheelId2,
                        wheelId3
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId1]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId2]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.WHEEL][wheelId3]).to.exist
                })

                it('When models are attached in bulk relations to the owner model should be made on the properties', async () => {

                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.wheels().attachByIdBulk([
                        wheelId1,
                        wheelId2,
                        wheelId3
                    ])

                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId1}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId2}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                    expect(firestoreMockData[`${Stubs.WHEEL}/${wheelId3}`][`${Stubs.CAR}`]['id']).to.equal(carId)
                })

                it('When a write batch are passed to attachBulk the relations should be made when commit on batch is invoked', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.wheels().attachByIdBulk([
                        wheelId1,
                        wheelId2,
                        wheelId3
                    ], batch)

                    //clean up
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId1}`)
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId2}`)
                    docsToBeDeleted.push(`${Stubs.WHEEL}/${wheelId3}`)
                    docsToBeDeleted.push(`${Stubs.CAR}/${carId}`)

                    await batch.commit()

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w1 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId1}`).get()
                    const w2 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId2}`).get()
                    const w3 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId3}`).get()

                    expect(c.data()).to.deep.include({ [Stubs.WHEEL] : {
                            [wheelId1] : true,
                            [wheelId2] : true,
                            [wheelId3] : true
                        }
                    })

                    expect(w1.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                    expect(w2.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                    expect(w3.data()).to.deep.equal({ [Stubs.CAR] : { id : carId }})
                })

                it('When a write batch are passed to attachBulk and commit on batch is not invoked the relations should not be made', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const wheelId1  = uniqid()
                    const wheelId2  = uniqid()
                    const wheelId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.wheels().attachByIdBulk([
                        wheelId1,
                        wheelId2,
                        wheelId3
                    ], batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const w1 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId1}`).get()
                    const w2 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId2}`).get()
                    const w3 = await adminFs.doc(`${Stubs.WHEEL}/${wheelId3}`).get()

                    expect(c.exists).to.be.false
                    expect(w1.exists).to.be.false
                    expect(w2.exists).to.be.false
                    expect(w3.exists).to.be.false
                })

                it('Retrieve cached relational data', async () => {
                    const sensor = db.sensor()
                    const room = db.room()
                    const sensorId = sensor.getId();

                    await room.sensors().attach(sensor)
                    
                    //clean up
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(room.getDocRef().path)
                    
                    const sensorData = {[sensorId] : {
                        name: 'Doorbell'
                    }}

                    await room.update({
                        [sensor.name] : { 
                            [sensorId] : {
                                name: 'Doorbell'
                            },
                            '123' : {
                                name: 'Dryer'
                            }
                        }
                    })

                    const cache1 = await room.sensors().cache()
                    const cache2 = await room.sensors().cache(sensorId)

                    expect(cache1).to.deep.include(sensorData)
                    expect(cache2).to.deep.equal(sensorData[sensorId])
                })

                it('When properties are detached from the owner, the relations link on the owner should be deleteted', async () => {
                    const wheelId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.WHEEL] : {
                            [wheelId] : true
                        }
                    }
                    
                    firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                        [Stubs.CAR] : {
                            id : wheelId
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    
                    const wheels: Array<Wheel> = await car.wheels().get() as Array<Wheel>

                    expect(wheels[0].getId()).to.be.equal(wheelId)

                    await car.wheels().detach()

                    const wheels2 = await car.wheels().get()
                    expect(wheels2[0]).to.not.exist

                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    expect(carDoc).to.be.empty
                })

                it('When properties are detached from the owner, the relations link on the properties should be deleteted', async () => {
                    const wheelId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.WHEEL] : {
                            [wheelId] : true
                        }
                    }
                    
                    firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }

                    const wheel = new Wheel(stubFs, null, wheelId)
                    
                    const car: Car = await wheel.car().get() as Car

                    expect(car.getId()).to.be.equal(carId)

                    await car.wheels().detach()

                    const car2: Car = await wheel.car().get() as Car

                    expect(car2).to.not.exist
                })

                describe('Actionable fields', () => {

                    it('Action should be defined on the relation between the owner model and property model', async () => {

                        const car = new Car(stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')
                        class One2ManyRelationStub extends One2ManyRelation
                        {
                            getOnUpdateActions()
                            {
                                return this.onUpdateAction
                            }
                        }

                        const rel = new One2ManyRelationStub(car, Stubs.WHEEL, stubFs)

                        rel.defineActionOnUpdate(command)

                        const fieldActions = rel.getOnUpdateActions()

                        expect(fieldActions).to.not.be.null

                        await fieldActions.execute(car, {})

                        expect(commandSpy.callCount).to.equals(1)
                    })
                    
                    it('TakeActionOn should be able to react to changes when before snap is empty', async () => {

                        const car = new Car(stubFs)

                        const wheelId1 = uniqid()

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        const rel = new One2ManyRelation(car, Stubs.WHEEL, stubFs)

                        rel.defineActionOnUpdate(command)

                        const data = {
                            [Stubs.WHEEL] : {
                                [wheelId1] :  true
                            }
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot({}, '')

                        const after = test.firestore.makeDocumentSnapshot(data, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(commandSpy.callCount).to.equals(1)
                        expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof car)
                        expect(commandSpy.firstCall.args[1]).to.be.deep.equal(data[Stubs.WHEEL])
                    })

                    it('TakeActionOn should be able to handle if no changes has been made to the relational data', async () => {

                        const rel = new One2ManyRelation(new Car(stubFs), Stubs.WHEEL, stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        rel.defineActionOnUpdate(command)

                        const data = {
                            name : 'Mustang'
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot({}, '')
                        const after = test.firestore.makeDocumentSnapshot(data, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(commandSpy.callCount).to.equals(0)
                    })

                    it('A defined onUpdate action should be executed when changes to the relation link field are passed to takeActionOn', async () => {

                        const car = new Car(stubFs)

                        const rel = new One2ManyRelation(car, Stubs.WHEEL, stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        rel.defineActionOnUpdate(command)

                        const data = {
                            name : 'spare'
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        data[Stubs.WHEEL] = {
                            [Relations.PIVOT] : true
                        }

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(commandSpy.callCount).to.equals(1)
                        expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof car)
                        expect(commandSpy.firstCall.args[1]).to.be.deep.equal(data[Stubs.WHEEL])
                    })

                    it('Changes made to the fields on the owner model should not course the onUpdate action to execute', async () => {

                        const car = new Car(stubFs)

                        const rel = new One2ManyRelation(car, Stubs.WHEEL, stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        rel.defineActionOnUpdate(command)

                        const data = {
                            'name' : 'front-left'
                        }

                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        data[Relations.PIVOT] = true

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(commandSpy.callCount).to.equals(0)
                    })

                    it('If no changes are made to the relation link it should not course onUpdate action to execute', async () => {

                        const car = new Car(stubFs)
                        const wheelId1 = uniqid()
                        const rel = new One2ManyRelation(car, Stubs.WHEEL, stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        rel.defineActionOnUpdate(command)

                        const data = {
                            name : 'spare',
                            [Stubs.WHEEL] : {
                                [wheelId1] : true
                            }
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(commandSpy.callCount).to.equals(0)
                    })

                    it('If new relational links are added those should be passes to the action', async () => {

                        const car = new Car(stubFs)
                        const wheelId1 = uniqid()
                        const wheelId2 = uniqid()
                        const rel = new One2ManyRelation(car, Stubs.WHEEL, stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        rel.defineActionOnUpdate(command)

                        const data = {
                            name : 'spare',
                            [Stubs.WHEEL] : {
                                [wheelId1] : true
                            }
                        }

                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        data[Stubs.WHEEL][wheelId2] = true

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        const passedChange = commandSpy.firstCall.args[1]
                        const expectedChange = {
                            [wheelId2] : true
                        }

                        expect(commandSpy.callCount).to.equals(1)
                        expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof car)
                        expect(passedChange).to.be.deep.equal(expectedChange)
                    })

                    it('If relational links are changed those should be passes to the action', async () => {

                        const car = new Car(stubFs)
                        const wheelId1 = uniqid()
                        const wheelId2 = uniqid()
                        const rel = new One2ManyRelation(car, Stubs.WHEEL, stubFs)

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')

                        rel.defineActionOnUpdate(command)

                        const data = {
                            name : 'spare',
                            [Stubs.WHEEL] : {
                                [wheelId1] : true,
                                [wheelId2] : {
                                    flat : false
                                }
                            }
                        }

                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        data[Stubs.WHEEL][wheelId2] = {
                            flat : true
                        }

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        const passedChange = commandSpy.firstCall.args[1]
                        const expectedChange = {
                            [wheelId2] : {
                                flat : true
                            }
                        }

                        expect(commandSpy.callCount).to.equals(1)
                        expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof car)
                        expect(passedChange).to.be.deep.equal(expectedChange)
                    })
                })

                describe('Inverse One-to-Many', () => {

                    it('Retrieving a relation on a Model should return the same Relation every time', async () => {
                    
                        const wheel: Wheel = new Wheel(stubFs)
    
                        const rel1 = wheel.car()
                        const rel2 = wheel.car()
                        
                        expect(rel1).to.equals(rel2)
                    })
    
                    it('Retrieving properties from a relation should return and array of Models of the correct type', async () => {
    
                        const wheelId = uniqid()
                        const carId = uniqid()
    
                        firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true
                            }
                        }
                        
                        firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                id : wheelId
                            }
                        }

                        class WheelM extends Wheel {
                            car(): N2OneRelation
                            {
                                return this.belongsTo(Stubs.CAR)
                            }
                        }
    
                        const wheel = new Wheel(stubFs, null, wheelId)
                        const car = await wheel.car().get() as Car
    
                        expect(car.wheels).to.exist
                        expect(typeof car.wheels).to.be.equal(typeof Function)
                    })

                    it('Field on the pivot should be accessable through relation', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(stubFs, null, wheelId)

                        const pivotField = 'flat'
                        
                        firestoreMockData[`${wheel.name}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                [Relations.PIVOT] : {
                                    [pivotField] : true
                                }
                            }
                        }

                        const fieldValue = await wheel.car().getPivotField(pivotField)

                        expect(fieldValue).to.be.true
                    })

                    it('If field on pivot does not exist getPivotField should return null', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(stubFs, null, wheelId)

                        const pivotField = 'flat'
                        
                        firestoreMockData[`${wheel.name}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                [Relations.PIVOT] : {
                                    id : uniqid()
                                }
                            }
                        }

                        const fieldValue = await wheel.car().getPivotField(pivotField)

                        expect(fieldValue).to.be.null
                    })

                    it('If relation link does not exist getPivotField should return null', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(stubFs, null, wheelId)

                        firestoreMockData[`${wheel.name}/${wheelId}`] = {}

                        const fieldValue = await wheel.car().getPivotField('flat')

                        expect(fieldValue).to.be.null
                    })

                    it('When property is unset on the owner, the relation link on the owner should be deleteted', async () => {
                        const wheelId = uniqid()
                        const carId = uniqid()
    
                        firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true
                            }
                        }
                        
                        firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        const wheel = new Wheel(stubFs, null, wheelId)
                        
                        const car = await wheel.car().get() as Car
    
                        expect(car.getId()).to.be.equal(carId)
    
                        await wheel.car().unset()
    
                        const car2 = await wheel.car().get() as Car
                        expect(car2).to.not.exist
    
                        const wheelDoc = firestoreMockData[`${Stubs.WHEEL}/${wheelId}`]
                        expect(wheelDoc).to.be.empty
                    })
    
                    it('When property is unset on the owner, the relation link on the property should be deleteted', async () => {
                        const wheelId = uniqid()
                        const carId = uniqid()
    
                        firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true
                            }
                        }
                        
                        firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        const wheel = new Wheel(stubFs, null, wheelId)
                        
                        const car = await wheel.car().get() as Car
    
                        expect(car.getId()).to.be.equal(carId)
    
                        await wheel.car().unset()

                        const wheels = await car.wheels().get() as Array<Wheel>
                        
                        expect(wheels).to.be.empty
                        
                        const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {}
                        }
                        expect(carDoc).to.be.deep.equal(expectedCarDoc)
                    })

                    it('When property is unset on the owner, only the relation link to the owner on the property should be deleteted', async () => {
                        const wheelId = uniqid()
                        const wheelId2 = uniqid()
                        const carId = uniqid()
    
                        firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelId2] : true
                            }
                        }
                        
                        firestoreMockData[`${Stubs.WHEEL}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        const wheel = new Wheel(stubFs, null, wheelId)
                        
                        const car = await wheel.car().get() as Car
    
                        expect(car.getId()).to.be.equal(carId)
    
                        await wheel.car().unset()

                        const wheels = await car.wheels().get() as Array<Wheel>
                        
                        const wheelIds = wheels.map((w) => {
                            return w.getId()
                        })

                        expect(wheelIds).to.be.include(wheelId2)
                        
                        const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId2] : true
                            }
                        }
                        expect(carDoc).to.be.deep.equal(expectedCarDoc)
                    })

                    describe('Actionable fields', () => {

                        it('Actionable fields should be defined on the relation between the owner model and property model', async () => {

                            const wheel = new Wheel(stubFs)

                            const actionableField = 'flat'

                            const command = new ActionableFieldCommandStub()
                            const commandSpy = sinon.spy(command, 'execute')

                            class N2OneRelationStub extends N2OneRelation
                            {
                                getFieldActions()
                                {
                                    return this.actionableFields
                                }
                            }

                            const rel = new N2OneRelationStub(wheel, Stubs.CAR, stubFs)

                            rel.defineActionableField(actionableField, command)

                            const fieldActions = rel.getFieldActions()

                            expect(fieldActions.get(actionableField)).to.not.be.null

                            await fieldActions.get(actionableField).execute(wheel, 'true')

                            expect(commandSpy.callCount).to.equals(1)
                        })
                        
                        it('TakeActionOn should be able to react to changes when before snap is empty', async () => {

                            const wheel = new Wheel(stubFs)

                            const actionableField = 'flat'

                            const command = new ActionableFieldCommandStub()
                            const commandSpy = sinon.spy(command, 'execute')

                            const rel = new N2OneRelation(wheel, Stubs.CAR, stubFs)

                            rel.defineActionableField(actionableField, command)

                            const data = {
                                [Stubs.CAR] : {
                                    [Relations.PIVOT] : {
                                        [actionableField] : true
                                    }
                                }
                            }
                        
                            const before = test.firestore.makeDocumentSnapshot({}, '')

                            const after = test.firestore.makeDocumentSnapshot(data, '')

                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                            await rel.takeActionOn(change)
                            
                            expect(commandSpy.callCount).to.equals(1)
                            expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof wheel)
                            expect(commandSpy.firstCall.args[1]).to.be.true
                        })

                        it('TakeActionOn should be able to handle if no changes has been made to the pivot data', async () => {

                            const actionableField = 'flat'

                            const rel = new N2OneRelation(new Wheel(stubFs), Stubs.CAR, stubFs)

                            const command = new ActionableFieldCommandStub()
                            const commandSpy = sinon.spy(command, 'execute')

                            rel.defineActionableField(actionableField, command)

                            const data = {
                                name : 'bob'
                            }
                        
                            const before = test.firestore.makeDocumentSnapshot({}, '')

                            const after = test.firestore.makeDocumentSnapshot(data, '')

                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                            await rel.takeActionOn(change)
                            
                            expect(commandSpy.callCount).to.equals(0)
                        })

                        it('A defined field action should be executed when changes to the particular field are passed to takeActionOn', async () => {

                            const wheel = new Wheel(stubFs)
                            const actionableField = 'flat'

                            const rel = new N2OneRelation(wheel, Stubs.CAR, stubFs)

                            const command = new ActionableFieldCommandStub()
                            const commandSpy = sinon.spy(command, 'execute')

                            rel.defineActionableField(actionableField, command)

                            const data = {
                                name : 'spare'
                            }
                        
                            const before = test.firestore.makeDocumentSnapshot(data, '')

                            data[Stubs.CAR] = {
                                [Relations.PIVOT] : {
                                    [actionableField] : true
                                }
                            }

                            const after = test.firestore.makeDocumentSnapshot(data, '')
        
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                            await rel.takeActionOn(change)
                            
                            expect(commandSpy.callCount).to.equals(1)
                            expect(typeof commandSpy.firstCall.args[0]).to.equals(typeof wheel)
                            expect(commandSpy.firstCall.args[1]).to.be.true
                        })

                        it('Changes made the fields on the owner model with simular names should not course a action on pivot to execute', async () => {

                            const wheel = new Wheel(stubFs)

                            const actionableField = 'flat'

                            const rel = new N2OneRelation(wheel, Stubs.CAR, stubFs)

                            const command = new ActionableFieldCommandStub()
                            const commandSpy = sinon.spy(command, 'execute')

                            rel.defineActionableField(actionableField, command)

                            const data = {
                                'name' : 'front-left'
                            }

                            const before = test.firestore.makeDocumentSnapshot(data, '')

                            data[Relations.PIVOT] = true

                            const after = test.firestore.makeDocumentSnapshot(data, '')
        
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                            await rel.takeActionOn(change)
                            
                            expect(commandSpy.callCount).to.equals(0)
                        })
                    })
                })
            })

            describe('Many-to-many', () => {

                it('Related models method should return the same relation every time', async () => {
                    const car = new Car(stubFs)

                    const drivers1 = car.drivers()
                    const drivers2 = car.drivers()

                    expect(drivers1).to.equals(drivers2)
                })

                it('Attaching a model to another should create an owner collection with a relation to the property', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId], 'Foreign key on owner').to.be.true
                })
                
                it('Attaching a model to another should create a Property Collection with a relation to the Owner', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId], 'Foreign key on property').to.be.true
                })

                it('Attaching a model to another should create a Pivot Collection with a relation to both Owner and Property', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.DRIVER]['id']).to.be.equals(driverId)
                })

                it('Attaching two models should work with batch', async () => {

                    const driverId = uniqid()
                    const driver = new Driver(adminFs, null, driverId)

                    const carId = uniqid()
                    const car = new Car(adminFs, null, carId)

                    const batch = db.batch()

                    await car.drivers().attach(driver, batch)

                    await batch.commit()
                    
                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const d = await adminFs.doc(`${Stubs.DRIVER}/${driverId}`).get()
                    const cd = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`).get()

                    //clean up
                    docsToBeDeleted.push(c.ref.path)
                    docsToBeDeleted.push(d.ref.path)
                    docsToBeDeleted.push(cd.ref.path)

                    expect(c.exists).to.be.true
                    expect(d.exists).to.be.true
                    expect(cd.exists).to.be.true
                })

                it('Attaching two models with Write Batch without commiting should not create any collections', async () => {

                    const driverId = uniqid()
                    const driver = new Driver(adminFs, null, driverId)

                    const carId = uniqid()
                    const car = new Car(adminFs, null, carId)

                    const batch = db.batch()

                    await car.drivers().attach(driver, batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                    const d = await adminFs.doc(`${Stubs.DRIVER}/${driverId}`).get()

                    const cd = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`).get()

                    expect(c.exists).to.be.false
                    expect(d.exists).to.be.false
                    expect(cd.exists).to.be.false
                })

                it('Attach multiple models to one many-to-many related model', async () => {
                    const user = db.user()
                    const sensor1 = db.sensor()
                    const sensor2 = db.sensor()

                    await user.sensors().attach(sensor1)
                    await user.sensors().attach(sensor2)

                    const userSensors = await user.getField(sensor1.name)
                    const sensor1Users = await sensor1.getField(user.name)
                    const sensor2Users = await sensor2.getField(user.name)

                    const userId: string = user.getId()
                    const sensor1Id: string = sensor1.getId()
                    const sensor2Id: string = sensor2.getId()

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor1.getDocRef().path)
                    docsToBeDeleted.push(sensor2.getDocRef().path)
                    docsToBeDeleted.push(`${sensor1.name}_${user.name}/${sensor1Id}_${userId}`)
                    docsToBeDeleted.push(`${sensor2.name}_${user.name}/${sensor2Id}_${userId}`)

                    expect(Object.keys(userSensors), 'Foreign key from sensor1 on user').to.include(sensor1Id)
                    expect(Object.keys(userSensors), 'Foreign key from sensor2 on user').to.include(sensor2Id)
                    expect(Object.keys(sensor1Users), 'Foreign key on sensor1').to.include(userId)
                    expect(Object.keys(sensor2Users), 'Foreign key on sensor2').to.include(userId)
                })

                it('When attaching models to each other writing data directly to the relation on the Property to the Owner should be possible', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const carName = 'Mustang'
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver, null, {
                        owner : {
                            name : carName
                        }
                    })

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedDriverDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                name : carName
                            }
                        }
                    }

                    expect(driverDoc).to.deep.equal(expectedDriverDoc)
                })

                it('When attaching models to each other writing data directly to the relation on the Owner to the Property should be possible', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const driverName = 'Bob'
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver, null, {
                        property : {
                            name : driverName
                        }
                    })

                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    const expectedcarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                name : driverName
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedcarDoc)
                })

                it('When models are attached in bulk relations to all property models should be made on the owner', async () => {

                    const carId = uniqid()

                    const driverId1 = uniqid()
                    const driverId2 = uniqid()
                    const driverId3 = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachBulk([
                        new Driver(stubFs, null, driverId1),
                        new Driver(stubFs, null, driverId2),
                        new Driver(stubFs, null, driverId3)
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]).to.exist
                })

                it('When models are attached in bulk relations to the owner model should be made on the property models', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachBulk([
                        new Driver(stubFs, null, driverId1),
                        new Driver(stubFs, null, driverId2),
                        new Driver(stubFs, null, driverId3)
                    ])

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]).to.be.true
                })

                it('When models are attached in bulk relations to all property models should create pivot collections', async () => {

                    const carId = uniqid()

                    const driverId1 = uniqid()
                    const driverId2 = uniqid()
                    const driverId3 = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachBulk([
                        new Driver(stubFs, null, driverId1),
                        new Driver(stubFs, null, driverId2),
                        new Driver(stubFs, null, driverId3)
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.DRIVER]['id']).to.be.equals(driverId1)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.DRIVER]['id']).to.be.equals(driverId2)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.DRIVER]['id']).to.be.equals(driverId3)

                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.CAR]['id']).to.be.equals(carId)
                })

                it('AttachBulk should not update any collection if id array is empty', async () => {
                    const carId = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachBulk([])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`]).to.not.exist
                })

                it('When a Write Batch is passed to attachBulk the relations should be made when commit on batch is invoked', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.drivers().attachBulk([
                        new Driver(adminFs, null, driverId1),
                        new Driver(adminFs, null, driverId2),
                        new Driver(adminFs, null, driverId3)
                    ], batch)

                    //clean up
                    docsToBeDeleted.push(`${Stubs.DRIVER}/${driverId1}`)
                    docsToBeDeleted.push(`${Stubs.DRIVER}/${driverId2}`)
                    docsToBeDeleted.push(`${Stubs.DRIVER}/${driverId3}`)
                    docsToBeDeleted.push(`${Stubs.CAR}/${carId}`)

                    docsToBeDeleted.push(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`)
                    docsToBeDeleted.push(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`)
                    docsToBeDeleted.push(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`)

                    await batch.commit()

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                    const d1 = await adminFs.doc(`${Stubs.DRIVER}/${driverId1}`).get()
                    const d2 = await adminFs.doc(`${Stubs.DRIVER}/${driverId2}`).get()
                    const d3 = await adminFs.doc(`${Stubs.DRIVER}/${driverId3}`).get()

                    const cd1 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`).get()
                    const cd2 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`).get()
                    const cd3 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`).get()

                    expect(c.data()).to.deep.include({ [Stubs.DRIVER] : {
                            [driverId1] : true,
                            [driverId2] : true,
                            [driverId3] : true
                        }
                    })

                    expect(d1.data()).to.deep.equal({ [Stubs.CAR] : { [carId] : true }})
                    expect(d2.data()).to.deep.equal({ [Stubs.CAR] : { [carId] : true }})
                    expect(d3.data()).to.deep.equal({ [Stubs.CAR] : { [carId] : true }})

                    expect(cd1.exists).to.be.true
                    expect(cd2.exists).to.be.true
                    expect(cd3.exists).to.be.true
                })

                it('When a write batch are passed to attachBulk and commit on batch is not invoked the relations should not be made', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(adminFs, null, carId)

                    await car.drivers().attachBulk([
                        new Driver(adminFs, null, driverId1),
                        new Driver(adminFs, null, driverId2),
                        new Driver(adminFs, null, driverId3)
                    ], batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                    const d1 = await adminFs.doc(`${Stubs.DRIVER}/${driverId1}`).get()
                    const d2 = await adminFs.doc(`${Stubs.DRIVER}/${driverId2}`).get()
                    const d3 = await adminFs.doc(`${Stubs.DRIVER}/${driverId3}`).get()

                    const cd1 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`).get()
                    const cd2 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`).get()
                    const cd3 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`).get()

                    expect(c.exists).to.be.false

                    expect(d1.exists).to.be.false
                    expect(d2.exists).to.be.false
                    expect(d3.exists).to.be.false

                    expect(cd1.exists).to.be.false
                    expect(cd2.exists).to.be.false
                    expect(cd3.exists).to.be.false
                })

                it('When attaching models in bulk to another model writing data directly to the relation on the Properties to the Owner should be possible', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)
                    const carName = 'Bob'

                    await car.drivers().attachBulk([
                        new Driver(stubFs, null, driverId1),
                        new Driver(stubFs, null, driverId2),
                        new Driver(stubFs, null, driverId3)
                    ], null, {
                        owner : {
                            name : carName
                        }
                    })

                    const carRelations1 = firestoreMockData[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreMockData[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreMockData[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

                    const expectedCarRelation = {
                        name : carName
                    }

                    expect(carRelations1).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations2).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations3).to.be.deep.equal(expectedCarRelation)
                })

                it('When attaching models in bulk to another model writing data directly to the relation on the Owner to the Properties should be possible', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachBulk([
                        new Driver(stubFs, null, driverId1),
                        new Driver(stubFs, null, driverId2),
                        new Driver(stubFs, null, driverId3)
                    ], null, {
                        properties : [
                            {
                                id : driverId1
                            },
                            {
                                id : driverId2
                            },
                            {
                                id : driverId3
                            }
                        ]
                    })

                    const driverRelations1 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

                    const expectedDriverRelation1 = {
                        id : driverId1
                    }

                    const expectedDriverRelation2 = {
                        id : driverId2
                    }

                    const expectedDriverRelation3 = {
                        id : driverId3
                    }

                    expect(driverRelations1).to.be.deep.equal(expectedDriverRelation1)
                    expect(driverRelations2).to.be.deep.equal(expectedDriverRelation2)
                    expect(driverRelations3).to.be.deep.equal(expectedDriverRelation3)
                })

                it('When attaching models in bulk to another model writing data directly to the relations', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)
                    const carName = 'Bob'

                    await car.drivers().attachBulk([
                        new Driver(stubFs, null, driverId1),
                        new Driver(stubFs, null, driverId2),
                        new Driver(stubFs, null, driverId3)
                    ], null, {
                        owner : {
                            name : carName
                        },
                        properties : [
                            { id : driverId1 },
                            { id : driverId2 },
                            { id : driverId3 }
                        ]
                    })

                    const carRelations1 = firestoreMockData[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreMockData[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreMockData[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

                    const expectedCarRelation = {
                        name : carName
                    }

                    expect(carRelations1).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations2).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations3).to.be.deep.equal(expectedCarRelation)

                    const driverRelations1 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

                    const expectedDriverRelation1 = {
                        id : driverId1
                    }

                    const expectedDriverRelation2 = {
                        id : driverId2
                    }

                    const expectedDriverRelation3 = {
                        id : driverId3
                    }

                    expect(driverRelations1).to.be.deep.equal(expectedDriverRelation1)
                    expect(driverRelations2).to.be.deep.equal(expectedDriverRelation2)
                    expect(driverRelations3).to.be.deep.equal(expectedDriverRelation3)
                })

                it('Attaching a model to another by id should create an owner collection with a relation to the property', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    // const driver = new Driver(firestoreStub, null, driverId)

                    await car.drivers().attachById(driverId)

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId], 'Foreign key on owner').to.be.true
                })
                
                it('Attaching a model to another by id should create a Property Collection with a relation to the Owner', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attachById(driverId)

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId], 'Foreign key on property').to.be.true
                })

                it('Attaching a model to another by id should create a Pivot Collection with a relation to both Owner and Property', async () => {

                    const carId = uniqid()
                    const car = new Car(stubFs, null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attachById(driverId)

                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.DRIVER]['id']).to.be.equals(driverId)
                })

                it('Attaching two models by id should work with batch', async () => {

                    const driverId = uniqid()
                    const driver = new Driver(adminFs, null, driverId)

                    const carId = uniqid()
                    const car = new Car(adminFs, null, carId)

                    const batch = db.batch()

                    await car.drivers().attachById(driverId, batch)

                    await batch.commit()
                    
                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()
                    const d = await adminFs.doc(`${Stubs.DRIVER}/${driverId}`).get()
                    const cd = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`).get()

                    //clean up
                    docsToBeDeleted.push(c.ref.path)
                    docsToBeDeleted.push(d.ref.path)
                    docsToBeDeleted.push(cd.ref.path)

                    expect(c.exists).to.be.true
                    expect(d.exists).to.be.true
                    expect(cd.exists).to.be.true
                })

                it('Attaching two models by id with Write Batch without commiting should not create any collections', async () => {

                    const driverId = uniqid()
                    const driver = new Driver(adminFs, null, driverId)

                    const carId = uniqid()
                    const car = new Car(adminFs, null, carId)

                    const batch = db.batch()

                    await car.drivers().attachById(driverId, batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                    const d = await adminFs.doc(`${Stubs.DRIVER}/${driverId}`).get()

                    const cd = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`).get()

                    expect(c.exists).to.be.false
                    expect(d.exists).to.be.false
                    expect(cd.exists).to.be.false
                })
                
                it('When models are attached in bulk by id relations to all property models should be made on the owner', async () => {

                    const carId = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]).to.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]).to.exist
                })

                it('When models are attached in bulk by id relations to the owner model should be made on the property models', async () => {

                    const carId     = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ])

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]).to.be.true
                })

                it('When models are attached in bulk by id relations to all property models should create pivot collections', async () => {

                    const carId = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ])

                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.DRIVER]['id']).to.be.equals(driverId1)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.DRIVER]['id']).to.be.equals(driverId2)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.DRIVER]['id']).to.be.equals(driverId3)

                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.CAR]['id']).to.be.equals(carId)
                })

                it('AttachByIdBulk should not update any collection if id array is empty', async () => {
                    const carId = uniqid()
                    
                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachByIdBulk([])

                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`]).to.not.exist
                })

                it('When attaching models in bulk by id to another model writing data directly to the relation on the Properties to the Owner should be possible', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)
                    const carName = 'Bob'

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ], null, {
                        owner : {
                            name : carName
                        }
                    })

                    const carRelations1 = firestoreMockData[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreMockData[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreMockData[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

                    const expectedCarRelation = {
                        name : carName
                    }

                    expect(carRelations1).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations2).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations3).to.be.deep.equal(expectedCarRelation)
                })

                it('When attaching models in bulk by id to another model writing data directly to the relation on the Owner to the Properties should be possible', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ], null, {
                        properties : [
                            { id : driverId1 },
                            { id : driverId2 },
                            { id : driverId3 }
                        ]
                    })

                    const driverRelations1 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

                    const expectedDriverRelation1 = {
                        id : driverId1
                    }

                    const expectedDriverRelation2 = {
                        id : driverId2
                    }

                    const expectedDriverRelation3 = {
                        id : driverId3
                    }

                    expect(driverRelations1).to.be.deep.equal(expectedDriverRelation1)
                    expect(driverRelations2).to.be.deep.equal(expectedDriverRelation2)
                    expect(driverRelations3).to.be.deep.equal(expectedDriverRelation3)
                })

                it('When attaching models in bulk by id to another model writing data directly to the relations', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(stubFs, null, carId)
                    const carName = 'Bob'

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ], null, {
                        owner : {
                            name : carName
                        },
                        properties : [
                            { id : driverId1 },
                            { id : driverId2 },
                            { id : driverId3 }
                        ]

                    })

                    const carRelations1 = firestoreMockData[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreMockData[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreMockData[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

                    const expectedCarRelation = {
                        name : carName
                    }

                    expect(carRelations1).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations2).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations3).to.be.deep.equal(expectedCarRelation)

                    const driverRelations1 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreMockData[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

                    const expectedDriverRelation1 = {
                        id : driverId1
                    }

                    const expectedDriverRelation2 = {
                        id : driverId2
                    }

                    const expectedDriverRelation3 = {
                        id : driverId3
                    }

                    expect(driverRelations1).to.be.deep.equal(expectedDriverRelation1)
                    expect(driverRelations2).to.be.deep.equal(expectedDriverRelation2)
                    expect(driverRelations3).to.be.deep.equal(expectedDriverRelation3)
                })

                it('When a Write Batch is passed to attachByIdBulk the colletions should be created when commit on batch is invoked', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()
                    
                    const car = new Car(adminFs, null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ], batch)

                    //clean up
                    docsToBeDeleted.push(`${Stubs.DRIVER}/${driverId1}`)
                    docsToBeDeleted.push(`${Stubs.DRIVER}/${driverId2}`)
                    docsToBeDeleted.push(`${Stubs.DRIVER}/${driverId3}`)
                    docsToBeDeleted.push(`${Stubs.CAR}/${carId}`)

                    docsToBeDeleted.push(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`)
                    docsToBeDeleted.push(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`)
                    docsToBeDeleted.push(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`)

                    await batch.commit()

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                    const d1 = await adminFs.doc(`${Stubs.DRIVER}/${driverId1}`).get()
                    const d2 = await adminFs.doc(`${Stubs.DRIVER}/${driverId2}`).get()
                    const d3 = await adminFs.doc(`${Stubs.DRIVER}/${driverId3}`).get()

                    const cd1 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`).get()
                    const cd2 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`).get()
                    const cd3 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`).get()

                    expect(c.data()).to.deep.include({ [Stubs.DRIVER] : {
                            [driverId1] : true,
                            [driverId2] : true,
                            [driverId3] : true
                        }
                    })

                    expect(d1.data()).to.deep.equal({ [Stubs.CAR] : { [carId] : true }})
                    expect(d2.data()).to.deep.equal({ [Stubs.CAR] : { [carId] : true }})
                    expect(d3.data()).to.deep.equal({ [Stubs.CAR] : { [carId] : true }})

                    expect(cd1.exists).to.be.true
                    expect(cd2.exists).to.be.true
                    expect(cd3.exists).to.be.true
                })

                it('When a write batch are passed to attachByIdBulk and commit on batch is not invoked the collections should not be created', async () => {

                    const batch     = adminFs.batch()
                    const carId     = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()
                    
                    const car = new Car(adminFs, null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ], batch)

                    const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                    const d1 = await adminFs.doc(`${Stubs.DRIVER}/${driverId1}`).get()
                    const d2 = await adminFs.doc(`${Stubs.DRIVER}/${driverId2}`).get()
                    const d3 = await adminFs.doc(`${Stubs.DRIVER}/${driverId3}`).get()

                    const cd1 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`).get()
                    const cd2 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`).get()
                    const cd3 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`).get()

                    expect(c.exists).to.be.false

                    expect(d1.exists).to.be.false
                    expect(d2.exists).to.be.false
                    expect(d3.exists).to.be.false

                    expect(cd1.exists).to.be.false
                    expect(cd2.exists).to.be.false
                    expect(cd3.exists).to.be.false
                })

                // it('Write data directly to the collections the attaching', async () => {

                //     const batch     = adminFs.batch()
                //     const carId     = uniqid()

                //     const driverId1: string = uniqid()
                //     const driverId2: string = uniqid()
                //     const driverId3: string = uniqid()
                    
                //     const car = new Car(adminFs, null, carId)

                //     await car.drivers().attachByIdBulk([
                //         driverId1,
                //         driverId2,
                //         driverId3
                //     ], batch)

                //     const c = await adminFs.doc(`${Stubs.CAR}/${carId}`).get()

                //     const d1 = await adminFs.doc(`${Stubs.DRIVER}/${driverId1}`).get()
                //     const d2 = await adminFs.doc(`${Stubs.DRIVER}/${driverId2}`).get()
                //     const d3 = await adminFs.doc(`${Stubs.DRIVER}/${driverId3}`).get()

                //     const cd1 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`).get()
                //     const cd2 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`).get()
                //     const cd3 = await adminFs.doc(`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`).get()

                //     expect(c.exists).to.be.false

                //     expect(d1.exists).to.be.false
                //     expect(d2.exists).to.be.false
                //     expect(d3.exists).to.be.false

                //     expect(cd1.exists).to.be.false
                //     expect(cd2.exists).to.be.false
                //     expect(cd3.exists).to.be.false
                // })

                it('Retrieve attached blank model of relation', async () => {

                    const user = db.user()
                    const sensor = db.sensor()

                    await user.sensors().attach(sensor)

                    const sensors: Array<ModelImpl> = await user.sensors().get()

                    const attachedSensorId = sensors[0].getId()
                    const sensorId = sensor.getId()

                    expect(sensorId).to.equal(attachedSensorId)

                    const userId: string = user.getId()

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                it('Retrieve attached model with data of relation', async () => {
                    const user = db.user()
                    const sensor = db.sensor()

                    const location: string = 'Office'

                    await sensor.create({
                        location: location
                    })

                    await user.sensors().attach(sensor)

                    const sensors: Array<ModelImpl> = await user.sensors().get()
                    const attachedSensor = sensors[0]
                    const attLocation: string = await attachedSensor.getField('location')

                    expect(attLocation).to.equal(location)

                    //clean up
                    const senorId = sensor.getId()
                    const userId: string = user.getId()

                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${senorId}_${userId}`)
                })

                it('Retrieve cached relational data', async () => {
                    const user = db.user()
                    const sensor = db.sensor()
                    const sensorId = sensor.getId()

                    await user.sensors().attach(sensor)
                    
                    const sensorData = {[sensorId] : {
                        location: 'Office'
                    }}

                    await user.update({
                        [sensor.name] : { 
                            [sensorId] : {
                                location: 'Office'
                            },
                            '123' : {
                                location: 'Entrance'
                            }
                        }
                    })

                    const cache1 = await user.sensors().cache()
                    const cache2 = await user.sensors().cache(sensorId)

                    expect(cache1).to.deep.include(sensorData)
                    expect(cache2).to.deep.equal(sensorData[sensorId])

                    //clean up
                    const userId: string = user.getId()

                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                it('Attach pivot data to many-to-many relation', async () => {
                    const user = db.user()
                    const sensor = db.sensor()
                    const userId = user.getId()
                    const sensorId = sensor.getId()

                    await user.sensors().attach(sensor)

                    const pivot = await user.sensors().updatePivot(sensorId, {
                        settings: true
                    })

                    const pivotData = await adminFs.doc(`${Models.SENSOR}_${Models.USER}/${sensorId}_${userId}`).get()

                    expect(pivotData.get(`${Relations.PIVOT}.settings`)).to.be.true

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(pivot.getDocRef().path)
                })

                it('Returned Pivot of a relation should have a correct name of the to owner models', async () => {
                    const user = db.user()
                    const sensor = db.sensor()
                    const sensorId = sensor.getId()
                    const userId = user.getId()
                    
                    await user.sensors().attach(sensor)
                    await sensor.users().attach(user)

                    const pivot: Pivot = await user.sensors().pivot(sensorId)

                    expect(pivot.getName()).to.equal(`${sensor.name}_${user.name}`)

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                it('Returned Pivot of a relation should have a correct id of the to owner models', async () => {
                    const user = db.user()
                    const sensor = db.sensor()
                    const sensorId = sensor.getId()
                    const userId = user.getId()
                    
                    await user.sensors().attach(sensor)
                    await sensor.users().attach(user)

                    const pivot: Pivot = await user.sensors().pivot(sensorId)

                    expect(pivot.getId()).to.equal(`${sensorId}_${userId}`)

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                it('Make sure models can be attached in "inverse"', async () => {

                    const user = db.user()
                    const sensor = db.sensor()
                    const sensorId = sensor.getId()
                    const userId = user.getId()

                    await user.sensors().attach(sensor)
                    await sensor.users().attach(user)

                    const pivot1: Pivot = await user.sensors().pivot(sensorId)
                    const pivot2: Pivot = await sensor.users().pivot(userId)

                    expect(pivot1.getId()).to.equal(pivot2.getId())

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                // it('Fields to be cached from the owner on the pivot should be definable on the relation between the owner and the property', async () => {

                //     const driver = new Driver(firestoreStub)
                //     const car = new Car(adminFs)
                    
                //     class Many2ManyRelationStub extends Many2ManyRelation
                //     {
                //         constructor(owner: ModelImpl, propertyModelName: string, _db)
                //         {
                //             super(owner, propertyModelName, _db)
                //         }

                //         getCachableFields()
                //         {
                //             return this.cachedOnToPivot
                //         }
                //     }

                //     const rel = new Many2ManyRelationStub(car, Stubs.DRIVER, firestoreStub)

                //     const cachedOnPivot = [
                //         'brand',
                //         'year'
                //     ]

                //     rel.defineCachableFields(null, null, cachedOnPivot)

                //     const cachableFields = rel.getCachableFields()

                //     expect(cachedOnPivot).to.be.equal(cachableFields)
                // })

                it('Fields to be cached from the pivot to the owner should be definable on the relation between the owner and the property', async () => {

                    const driver = new Driver(stubFs)
                    const car = new Car(adminFs)
                    
                    class Many2ManyRelationStub extends Many2ManyRelation
                    {
                        constructor(owner: ModelImpl, propertyModelName: string, _db)
                        {
                            super(owner, propertyModelName, _db)
                        }

                        getCachableFields()
                        {
                            return this.cacheFromPivot
                        }
                    }

                    const rel = new Many2ManyRelationStub(car, Stubs.DRIVER, stubFs)

                    const cachedFromPivot = [
                        'brand',
                        'year'
                    ]

                    rel.defineCachableFields(null, cachedFromPivot)

                    const cache = rel.getCachableFields()

                    expect(cachedFromPivot).to.be.equal(cache)
                })
                
                it('Fields to be cached from the owner to the property should be definable on the relation between the owner and the property', async () => {

                    const driver = new Driver(stubFs)
                    const car = new Car(adminFs)
                    class Many2ManyRelationStub extends Many2ManyRelation
                    {
                        constructor(owner: ModelImpl, propertyModelName: string, _db)
                        {
                            super(owner, propertyModelName, _db)
                        }

                        getCachableFields()
                        {
                            return this.cacheOnToProperty
                        }
                    }

                    const rel = new Many2ManyRelationStub(car, Stubs.DRIVER, stubFs)

                    const cachedFromPivot = [
                        'brand',
                        'year'
                    ]

                    rel.defineCachableFields(cachedFromPivot)

                    const cache = rel.getCachableFields()

                    expect(cachedFromPivot).to.be.equal(cache)
                })

                it('Fields to be cached from the owner on to the property should be definable on the relation between the owner and the property', async () => {

                    const driver = new Driver(stubFs)
                    const car = new Car(adminFs)
                    
                    class Many2ManyRelationStub extends Many2ManyRelation
                    {
                        constructor(owner: ModelImpl, propertyModelName: string, _db)
                        {
                            super(owner, propertyModelName, _db)
                        }

                        getCachableFields()
                        {
                            return this.cacheOnToProperty
                        }
                    }

                    const rel = new Many2ManyRelationStub(car, Stubs.DRIVER, stubFs)

                    const cachedToProperty = [
                        'brand',
                        'year'
                    ]

                    rel.defineCachableFields(cachedToProperty)

                    const cache = rel.getCachableFields()

                    expect(cachedToProperty).to.be.equal(cache)
                })

                it('Fields defined as cachable from the owner to property should be cached when new field is added', async () => {

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany('drivers')
                                    .defineCachableFields([
                                        'name'
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(stubFs, null, carId)
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const data = {
                        name : 'Mustang'
                    }

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedCarDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                name : data.name
                            }
                        }
                    }

                    expect(driverDoc).to.deep.equal(expectedCarDoc)
                })

                it('Fields defined as cachable from the owner to property should be cached when new field is added', async () => {

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany('drivers')
                                    .defineCachableFields([
                                        `name${Models.SECURE_SURFIX}`,
                                        'name'
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(stubFs, null, carId)
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    firestoreMockData[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`] = {}

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const data = {
                        name : 'Mustang'
                    }

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedDriverDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                name : data.name
                            }
                        }
                    }

                    expect(driverDoc).to.deep.equal(expectedDriverDoc)

                    const driverSecureDoc = firestoreMockData[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`]
                    const expectedDriverSecureDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                name : data.name
                            }
                        }
                    }

                    expect(driverSecureDoc).to.deep.equal(expectedDriverSecureDoc)
                })

                it('Fields defined as cachable from the owner to property should not be cached data has not changed', async () => {

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany('drivers')
                                    .defineCachableFields([
                                        'name'
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(stubFs, null, carId)
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    const data = {
                        name : 'Mustang'
                    }

                    const before = test.firestore.makeDocumentSnapshot(data, '')

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId}`][`${Stubs.CAR}.${carId}.name`]).to.be.undefined
                })

                it('Fields defined as cachable from the owner to property should not be cached as null when deleted', async () => {

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany('drivers')
                                    .defineCachableFields([
                                        'name'
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(stubFs, null, carId)
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    const data = {
                        name : 'Mustang'
                    }

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedCarDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                name : data.name
                            }
                        }
                    }

                    expect(driverDoc).to.deep.equal(expectedCarDoc)

                    const change2 = new Change<FirebaseFirestore.DocumentSnapshot>(after, before)

                    await car.drivers().updateCache(change2)

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId].name)
                        .to.be.null
                })

                it('Fields defined as cachable on to the owner from the pivot should be cached when new field is added', async () => {

                    const cachedField = 'crashes'

                    const driverId = uniqid()
                    const driver = new Driver(stubFs, null, driverId)

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const car = new CarM(stubFs, null, carId)

                    await car.drivers().attach(driver)

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const pivotData = {
                        [Relations.PIVOT] : {
                            [cachedField] : 3
                        }
                    }

                    const after = test.firestore.makeDocumentSnapshot(pivotData, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                })

                it('Fields defined as cachable from the pivot on to the owner should be cached on field update', async () => {

                    const cachedField = 'crashes'

                    const driverId = uniqid()
                    const carId = uniqid()

                    const driver = new Driver(stubFs, null, driverId)

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(stubFs, null, carId)

                    await car.drivers().attach(driver)

                    const pivotData = {
                        [Relations.PIVOT]: {
                            [cachedField] : 2
                        }
                    }

                    const before = test.firestore.makeDocumentSnapshot(pivotData, '')

                    pivotData[Relations.PIVOT].crashes = 3 // change

                    const after = test.firestore.makeDocumentSnapshot(pivotData, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                })

                it('Fields defined as cachable from the pivot on to the owner ECURE COLLECTION should be cached on field update', async () => {

                    const cachedField = 'crashes'

                    const driverId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`] = {}

                    const driver = new Driver(stubFs, null, driverId)

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        `${cachedField}${Models.SECURE_SURFIX}`
                                    ])
                        }
                    }

                    const car = new CarM(stubFs, null, carId)

                    await car.drivers().attach(driver)

                    const pivotData = {
                        [Relations.PIVOT]: {
                            [cachedField] : 2
                        }
                    }

                    const before = test.firestore.makeDocumentSnapshot(pivotData, '')

                    pivotData[Relations.PIVOT].crashes = 3 // change

                    const after = test.firestore.makeDocumentSnapshot(pivotData, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const carDoc = firestoreMockData[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                })

                it('GetName of Pivot model should return a correct formatted name', async () => {
         
                    const driver = new Driver(stubFs)
                    const car = new Car(stubFs)
                    
                    const pivotId = `${car.getId()}_${driver.getId()}`

                    const pivot = new Pivot(stubFs, pivotId, car, driver)
    
                    expect(pivot.getName()).to.be.equal(`${Stubs.CAR}_${Stubs.DRIVER}`)
                })
               
                it('GetId of pivot model should return a correct formatted id', async () => {
    
                    const driver = new Driver(stubFs)
                    const car = new Car(stubFs)
    
                    const pivotId = `${car.getId()}_${driver.getId()}`

                    const pivot = new Pivot(stubFs, pivotId, car, driver)
    
                    expect(pivot.getId()).to.equal(pivotId)
                })

                it('Pivot should be initialiazable though ORM by a path', async () => {

                    const userId = uniqid()
                    const sensorId = uniqid()
                    
                    const pivotName = `${Models.SENSOR}_${Models.USER}`
                    const pivotId = `${sensorId}_${userId}`
                   
                    const path = `${pivotName}/${pivotId}`
                    const pivot: Pivot = db.pivot(path)

                    expect(pivot.getName()).to.be.equals(pivotName)
                    expect(pivot.getId()).to.be.equals(pivotId)
                })
                
                it('Pivot should be initialiazable though ORM by a path should fail if path contains name of pivot collection', async () => {

                    const pivotName = `${Models.SENSOR}_${Models.USER}`
                    
                    let error

                    try
                    {
                        const pivot: Pivot = db.pivot(pivotName)
                    }
                    catch(e)
                    {
                        error = e.message
                    }

                    expect(error).to.be.equals('Path must contain both name and id of pivot collection seperated with a slash')
                })

                it('Pivot should be initialiazable though ORM by a path should fail if path contains id of pivot collection', async () => {

                    const userId = uniqid()
                    const sensorId = uniqid()
                    
                    const pivotId = `${sensorId}_${userId}`
                    
                    let error

                    try
                    {
                        const pivot: Pivot = db.pivot(pivotId)
                    }
                    catch(e)
                    {
                        error = e.message
                    }

                    expect(error).to.be.equals('Path must contain both name and id of pivot collection seperated with a slash')
                })

                it('Pivot should be initialiazable though ORM by a path should fail if name of path of pivot collection does not contain underscore seperator', async () => {

                    const userId = uniqid()
                    const sensorId = uniqid()
                    
                    const pivotName = `${Models.SENSOR}${Models.USER}`
                    const pivotId = `${sensorId}_${userId}`
                   
                    const path = `${pivotName}/${pivotId}`

                    let error

                    try
                    {
                        const pivot: Pivot = db.pivot(path)
                    }
                    catch(e)
                    {
                        error = e.message
                    }

                    expect(error).to.be.equals('Name and id of path must contain parts from two collection seperated with an underscore')
                })

                it('Pivot should be initialiazable though ORM by a path should fail if id of path of pivot collection does not contain underscore seperator', async () => {

                    const userId = uniqid()
                    const sensorId = uniqid()
                    
                    const pivotName = `${Models.SENSOR}_${Models.USER}`
                    const pivotId = `${sensorId}${userId}`
                   
                    const path = `${pivotName}/${pivotId}`

                    let error

                    try
                    {
                        const pivot: Pivot = db.pivot(path)
                    }
                    catch(e)
                    {
                        error = e.message
                    }

                    expect(error).to.be.equals('Name and id of path must contain parts from two collection seperated with an underscore')
                })

                it('Cached data from pivot should be updated on owner model', async () => {
         
                    const cachedField = 'crashes'

                    const carId = uniqid()
                    const driverId = uniqid()

                    const driver = new Driver(stubFs, null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(stubFs, null, carId)

                    await car.drivers().attach(driver)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(stubFs, pivotId, car, driver)

                    const pivotData = {
                                [Relations.PIVOT]: {
                                    crashes : 2
                                }
                            }

                    const before = test.firestore.makeDocumentSnapshot(pivotData, '')

                    pivotData[Relations.PIVOT].crashes = 3 // change

                    const after = test.firestore.makeDocumentSnapshot(pivotData, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await pivot.updateCache(change)

                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                })

                it('Cached data from pivot should be updated on both owner models', async () => {
         
                    const cachedField = 'crashes'

                    class DriverM extends Driver {
                        cars(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.CAR)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const driverId = uniqid()
                    const driver = new DriverM(stubFs, null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const car = new CarM(stubFs, null, carId)

                    await car.drivers().attach(driver)
                    await driver.cars().attach(car)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(stubFs, pivotId, car, driver)

                    const pivotData = {
                                [Relations.PIVOT]: {
                                    crashes : 2
                                }
                            }

                    const before = test.firestore.makeDocumentSnapshot(pivotData, '')

                    pivotData[Relations.PIVOT].crashes = 3 // change

                    const after = test.firestore.makeDocumentSnapshot(pivotData, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await pivot.updateCache(change)

                    const carDoc = firestoreMockData[`${Stubs.CAR}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedDriverDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(driverDoc).to.deep.equal(expectedDriverDoc)
                })

                it('Fields defined as cachable from pivot should be updated on owner model also when cache from owner to property is defined', async () => {
         
                    const cachedField = 'crashes'

                    const carId = uniqid()
                    const driverId = uniqid()

                    const driver = new Driver(stubFs, null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(Stubs.DRIVER)
                                    .defineCachableFields([
                                        'model'
                                    ], [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(stubFs, null, carId)

                    await car.drivers().attach(driver)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(stubFs, pivotId, car, driver)

                    const pivotData = {
                                [Relations.PIVOT]: {
                                    [cachedField] : 2
                                }
                            }

                    const before = test.firestore.makeDocumentSnapshot(pivotData, '')

                    pivotData[Relations.PIVOT].crashes = 3 // change

                    const after = test.firestore.makeDocumentSnapshot(pivotData, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await pivot.updateCache(change)

                    const carDoc = firestoreMockData[`${car.name}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.DRIVER] : {
                            [driverId] : {
                                [Relations.PIVOT] : {
                                    [cachedField] : 3
                                }
                            }
                        }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                })

                it('Fields defined as cachable from the owner to property should be updated on property also when cache from pivot to owner is defined', async () => {

                    const cacheField = 'model'

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany('drivers')
                                    .defineCachableFields([
                                        cacheField
                                    ], [
                                        'crashes'
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(stubFs, null, carId)
                    const driver = new Driver(stubFs, null, driverId)

                    await car.drivers().attach(driver)

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const data = {
                        [cacheField] : 'Mustang'
                    }

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedDriverDoc = {
                        [Stubs.CAR] : {
                            [carId] : {
                                [cacheField] : data[cacheField]
                            }
                        }
                    }

                    expect(driverDoc).to.deep.equal(expectedDriverDoc)
                })

                it('When properties are detached from the owner, the relations link on the owner should be deleteted', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }
                    
                    firestoreMockData[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    const drivers = await car.drivers().get() as Array<Driver>
                    
                    expect(drivers[0].getId()).to.be.equal(driverId)

                    await car.drivers().detach()

                    const drivers2 = await car.drivers().get() as Array<Driver>
                    
                    expect(drivers2[0]).to.not.exist
                    expect(firestoreMockData[`${Stubs.CAR}/${carId}`]).to.be.empty
                })

                it('When properties are detached from the owner, the relations link on the properties should be deleteted', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }
                    
                    firestoreMockData[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    const drivers = await car.drivers().get() as Array<Driver>
                    
                    const cars = await drivers[0].cars().get() as Array<Car>
                    
                    const carIds = cars.map((c: Car) => {
                        return c.getId()
                    })

                    expect(carIds).to.include(carId)

                    await car.drivers().detach()

                    const cars2 = await drivers[0].cars().get() as Array<Car>

                    expect(cars2[0]).to.not.exist

                    const driverDoc = firestoreMockData[`${Stubs.DRIVER}/${driverId}`]
                    const expectedDriverDoc = {
                        [Stubs.CAR] : {}
                    }

                    expect(driverDoc).to.be.deep.equal(expectedDriverDoc)
                })

                it('When properties are detached from the owner, the pivot collection should be deleteted', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`] = {
                        [Stubs.DRIVER] : {
                            id : driverId
                        },
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }
                    
                    firestoreMockData[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    
                    const pivot = await car.drivers().pivot(driverId)

                    expect(pivot.getId()).to.be.equal(`${carId}_${driverId}`)

                    await car.drivers().detach()

                    const pivot2 = await car.drivers().pivot(driverId)

                    const pivotDoc = firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`]

                    expect(pivot2).to.not.exist
                    expect(pivotDoc).to.not.exist
                })

                it('When properties are detached from the owner, the owner link should be removed from the properties', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()
                    const carId2 = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }
                    
                    firestoreMockData[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true,
                            [carId2] : true
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    const drivers = await car.drivers().get() as Array<Driver>
                    
                    const cars = await drivers[0].cars().get() as Array<Car>
                    const carIds = cars.map((c: Car) => {
                        return c.getId()
                    })

                    expect(carIds).to.include(carId)
                    expect(carIds).to.include(carId2)

                    await car.drivers().detach()

                    const cars2 = await drivers[0].cars().get() as Array<Car>
                    const carIds2 = cars2.map((c: Car) => {
                        return c.getId()
                    })

                    expect(carIds2).to.not.include(carId)
                    expect(carIds2).to.include(carId2)

                    expect(firestoreMockData[`${Stubs.DRIVER}/${driverId}`]).to.not.be.empty
                })

                it('When properties are detached from the owner, only the pivot collection related to properties and owner should be deleteted', async () => {
                    const driverId  = uniqid()
                    const carId     = uniqid()
                    const carId2    = uniqid()

                    firestoreMockData[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreMockData[`${Stubs.CAR}/${carId2}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`] = {
                        [Stubs.DRIVER] : {
                            id : driverId
                        },
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }

                    firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId2}_${driverId}`] = {
                        [Stubs.DRIVER] : {
                            id : driverId
                        },
                        [Stubs.CAR] : {
                            id : carId2
                        }
                    }
                    
                    firestoreMockData[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true,
                            [carId2] : true
                        }
                    }

                    const car = new Car(stubFs, null, carId)
                    
                    const pivot = await car.drivers().pivot(driverId)

                    expect(pivot.getId()).to.be.equal(`${carId}_${driverId}`)

                    await car.drivers().detach()

                    const pivot2 = await car.drivers().pivot(driverId)

                    expect(pivot2).to.not.exist

                    const pivotDoc = firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`]
                    expect(pivotDoc).to.not.exist

                    const pivotDoc2 = firestoreMockData[`${Stubs.CAR}_${Stubs.DRIVER}/${carId2}_${driverId}`]
                    expect(pivotDoc2).to.exist
                })
            })
        })
    })
})