import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'
import { union } from "lodash"

import DataORMImpl from "./lib/ORM"
import { asyncForEach, difference } from './lib/util'
import User from './lib/ORM/Models/User'
import Sensor from './lib/ORM/Models/Sensor'
import ModelImpl, { Models } from './lib/ORM/Models'
import Room from './lib/ORM/Models/Room'
import Event from './lib/ORM/Models/Event'
import { Car, Driver } from './stubs'
import { Many2ManyRelation, One2ManyRelation, N2ManyRelation, N2OneRelation, StandardModelImport, ModelImportStategy } from './lib/ORM/Relation'
import { Pivot } from './lib/ORM/Relation/Pivot'
import { Change, firestore } from 'firebase-functions'
import { Relations } from './lib/const'
import { singular } from 'pluralize';
import Wheel from './stubs/Wheel';

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
    let firestoreStub
    let firestoreMockData

    before(async () => {

        const stageProjectId = "staging-iot-cloud-server"

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

    describe('ORM', async () => {

        let docsToBeDeleted

        beforeEach(() => {
            docsToBeDeleted = []
            firestoreMockData = {}
        })

        afterEach(async () => {
            await asyncForEach(docsToBeDeleted, async (path: string ) => {
                await adminFs.doc(path).delete()
            })
        })

        describe('CRUD', async () => {

            it('Create doc new ref.', async () => {
                const docRef = db.user().getDocRef()

                expect(docRef).exist
                expect(docRef.id).exist
                expect(docRef.path).exist

                expect(docRef.path).to.equals(`${Models.USER}/${docRef.id}`)
            })

            it('Create doc new ref with certain id.', async () => {
                const id: string = '123';

                const docRef: FirebaseFirestore.DocumentReference = await db.user().getDocRef(id)
                expect(docRef).exist
                expect(docRef.id).to.equals(id)
                expect(docRef.path).exist

                expect(docRef.path).to.equals(`${Models.USER}/${id}`)
            })

            it('Create model based on doc id.', async () => {
                const id = '1234'

                const car = new Car(adminFs, null, id)

                const docRef = await car.getDocRef()
           
                expect(id).to.equal(docRef.id)
            })

            it('Create model based on doc snap.', async () => {
                const snap = test.firestore.exampleDocumentSnapshot()
           
                const car = new Car(adminFs, snap)
                const docRef = await car.getDocRef()
           
                expect(snap.ref.id).to.equal(docRef.id)
            })

            it('Get ref returns the same ref after initialization.', async () => {
                const car: ModelImpl = new Car(adminFs)
                const docRef1: FirebaseFirestore.DocumentReference = car.getDocRef()
                const docRef2: FirebaseFirestore.DocumentReference = car.getDocRef()

                expect(docRef1.id).to.equals(docRef2.id)
            })

            it('Get ID of new Model.', async () => {
                const car: ModelImpl = new Car(adminFs)
                const id: string = car.getId()

                expect(id).exist
            })

            it('Get ID of created docRef.', async () => {
                const car: ModelImpl = await new Car(adminFs).create({
                    name : 'Mustang'
                })

                const id: string = car.getId()
                
                // Clean up
                docsToBeDeleted.push((car.getDocRef()).path)
                
                expect(id).exist
            })

            it('Create.', async () => {

                const user: ModelImpl = db.user()
                await user.create({
                    name: 'Bob'
                })

                // Clean up
                docsToBeDeleted.push((user.getDocRef()).path)

                const name: string = await user.getField('name')
                expect(name).to.equals('Bob')
            })

            it('Create w. batch', async () => {
                const batch = db.batch()
                const user = await db.user().create({
                    name: 'Bob'
                }, batch)

                //Clean up
                docsToBeDeleted.push((user.getDocRef()).path)

                await batch.commit()
                
                const name: string = await user.getField('name')
                expect(name).to.equals('Bob')
            })

            it('Create w. batch should fail', async () => {
                const batch = db.batch()
                const user = await db.user().create({
                    name: 'Bob'
                }, batch)

                const name: string = await user.getField('name')
                expect(name).not.exist
            })

            it('Retrieve certain model.', async () => {
                const user: ModelImpl = await db.user().create({
                    name: 'Bob'
                })

                const uid: string = await user.getId()
                
                docsToBeDeleted.push((await user.getDocRef()).path)

                const u2: ModelImpl = await db.user().find(uid)
                const name = await u2.getField('name')

                expect(name).equals('Bob')
            })

            it('Retrieve certain data not existing.', async () => {
                const user: ModelImpl = await db.user().create({
                    name: 'Bob'
                })

                const age = await user.getField('age')

                docsToBeDeleted.push((user.getDocRef()).path)

                expect(age).to.not.exist
            })

            it('Update.', async () => {
                const user: ModelImpl = db.user()

                await user.create({
                    name: 'Bobby'
                })

                //Clean up
                docsToBeDeleted.push((await user.getDocRef()).path)

                await user.update({
                    age: 28
                })

                const name = await user.getField('name')
                const age = await user.getField('age')
                
                expect(name).equals('Bobby')
                expect(age).equals(28)
            })

            it('Update w. batch', async () => {
                const batch = db.batch()
                
                const user = await db.user().create({
                    name: 'Bobby'
                }, batch)

                //Clean up
                docsToBeDeleted.push((user.getDocRef()).path)

                await user.update({
                    age: 28
                }, batch)

                await batch.commit()

                const userId = user.getId()

                const doc = await adminFs.doc(`${Models.USER}/${userId}`).get()
                const name = doc.get('name')
                const age = doc.get('age')
                
                expect(name).equals('Bobby')
                expect(age).equals(28)
            })

            it('Update w. batch should fail', async () => {
                const batch = db.batch()
                
                const user = await db.user().create({
                    name: 'Bobby'
                }, batch)

                //Clean up
                docsToBeDeleted.push((user.getDocRef()).path)

                await user.update({
                    age: 28
                }, batch)

                const userId = user.getId()

                const doc = await adminFs.doc(`${Models.USER}/${userId}`).get()
                const name = doc.get('name')
                const age = doc.get('age')

                expect(name).not.exist
                expect(age).not.exist
            })

            it('Delete.', async () => {

                const user: ModelImpl = db.user()

                await user.create({
                    name: 'Bobby'
                })

                //Clean up
                docsToBeDeleted.push((user.getDocRef()).path)

                await user.update({
                    age: 28
                })

                const id = user.getId()
                const name = await user.getField('name')
                const age = await user.getField('age')

                docsToBeDeleted.push((user.getDocRef()).path)

                expect(name).equals('Bobby')
                expect(age).equals(28)

                await user.delete()

                await user.find(id)
                const age2 = await user.getField('age')
                
                expect(age2).to.not.exist
            })

            // describe('Actionable fields', () => {

            //     // it('Actionable field should be definable on the model along an action', async () => {

            //     //     const car = new Car(firestoreStub)

            //     //     car.defineActionableFields

            //     // })

            //     it('Test', async () => {
            //         const obj1 = {
            //             name : 'Bobby',
            //             age : 12,
            //             gender: 'male',
            //             pivot : {
            //                 name : 'lol'
            //             }
            //         }

            //         const obj2 = {
            //             name : 'Bob',
            //             height : 183,
            //             gender: 'null'
            //         }

            //         console.log(difference(obj1, obj2))
            //     })
            // })
        })


        describe('Relations', () => {

            describe('I2I', async () => {
                
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

                it('Save model to an other reverse I2M', async () => {
                    
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

                it('Save model to an other reverse I2M BATCH', async () => {
                    
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

                it('Save model to an other reverse I2M BATCH SHOULD FAIL', async () => {
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

            describe('I2M', async () => {

                it('Related models method should return the same relation every time', async () => {
                    
                    const room: Room = db.room()

                    const sensors1 = room.sensors()
                    const sensors2 = room.sensors()
                    
                    expect(sensors1).to.equals(sensors2)
                })

                it('The pivot should be updatable trough the relation', async () => {
           
                    const car = new Car(adminFs)
                    const wheel = new Wheel(adminFs)

                    await car.wheels().attach(wheel)

                    const dataName = 'Spare'

                    //clean up
                    docsToBeDeleted.push(wheel.getDocRef().path)
                    docsToBeDeleted.push(car.getDocRef().path)

                    const wheelId = wheel.getId()
                    
                    await car.wheels().updatePivot(wheelId, {
                        name : dataName,
                        flat: true
                    })

                    await car.wheels().updatePivot(wheelId, {
                        flat : true
                    })

                    const doc: FirebaseFirestore.DocumentSnapshot = await adminFs.collection(wheel.name).doc(wheelId).get()

                    expect(doc.get(`${car.name}.${Relations.PIVOT}.name`)).to.be.equal(dataName)
                })

                it('The pivot should be updatable trough the inverse relation', async () => {
                    
                    const carId = uniqid()
                    const wheelId = uniqid()
                    const car = new Car(firestoreStub, null, carId)
                    const wheel = new Wheel(firestoreStub, null, wheelId)

                    const dataName = 'Spare'

                    await car.wheels().attach(wheel)

                    await wheel.car().updatePivot({
                        name : dataName
                    })

                    const wheelDoc = firestoreMockData[`${wheel.name}/${wheelId}`]
                    const expectedWheelDoc = {
                        [`${car.name}.${Relations.PIVOT}.name`] : dataName
                    }

                    expect(wheelDoc).to.deep.equal(expectedWheelDoc)
                })

                it('Property model should be attachable by id', async () => {
                    
                    class ModelImportStub implements ModelImportStategy{
                        async import(db_: FirebaseFirestore.Firestore, name: string, id: string): Promise<ModelImpl> {
                            const model = await import('./stubs/Wheel')
                            const property = new model.default(db_, null, id)
                            return property
                        }
                    } 

                    class One2ManyRelationStub extends One2ManyRelation {
                        importStrategy = new ModelImportStub()
                    }

                    class CarM extends Car {

                        /**
                         * Attach one model to many others
                         */
                        protected hasMany(property: string): One2ManyRelation
                        {
                            if(!this.relations.has(property))
                            {
                                const relation: One2ManyRelation = new One2ManyRelationStub(this, property, this.db)
                                this.relations.set(property, relation)
                            }

                            return this.relations.get(property) as One2ManyRelation
                        }
                    }

                    const carId = uniqid()
                    const car = new CarM(firestoreStub, null, carId)

                    const wheel = new Wheel(firestoreStub)

                    await car.wheels().attachById(wheel.getId())
                    
                    const carDoc = firestoreMockData[`${car.name}/${carId}`]
                    const expectedCarDoc = {
                        [wheel.name] : { [wheel.getId()] : true }
                    }

                    const wheelDoc = firestoreMockData[`${wheel.name}/${wheel.getId()}`]
                    const expectedWheelDoc = {
                        [car.name] : { id : carId }
                    }

                    expect(carDoc).to.deep.equal(expectedCarDoc)
                    expect(wheelDoc).to.deep.equal(expectedWheelDoc)
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

                describe('Actionable fields', () => {

                    it('Actionable fields should be defined on the relation between the owner model and property model', async () => {

                        const actionableField = 'flat'
                        const spyAction = sinon.spy()

                        class N2OneRelationStub extends N2OneRelation
                        {
                            getFieldActions()
                            {
                                return this.actionableFields
                            }
                        }

                        const rel = new N2OneRelationStub(new Wheel(firestoreStub), 'Car', firestoreStub)

                        rel.defineActionableField(actionableField, spyAction)

                        const fieldActions = rel.getFieldActions()

                        expect(fieldActions.get(actionableField)).to.not.be.null

                        await fieldActions.get(actionableField)()

                        expect(spyAction.callCount).to.equals(1)
                    })
                    
                    it('TakeActionOn should be able to react to changes when before is empty', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(firestoreStub, null, wheelId)

                        const actionableField = 'flat'

                        const rel = new N2OneRelation(wheel, 'Car', firestoreStub)

                        const spyAction = sinon.spy()

                        rel.defineActionableField(actionableField, spyAction)

                        const data = {
                            [Relations.PIVOT] : { [actionableField] : true }
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot({}, '')

                        const after = test.firestore.makeDocumentSnapshot(data, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(spyAction.callCount).to.equals(1)
                        expect(typeof spyAction.firstCall.args[0]).to.equals(typeof wheel)
                        expect(spyAction.firstCall.args[1]).to.be.true
                    })

                    it('TakeActionOn should be able to handle if no changes has been made to the pivot data', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(firestoreStub, null, wheelId)

                        const actionableField = 'flat'

                        const rel = new N2OneRelation(wheel, 'Car', firestoreStub)

                        const spyAction = sinon.spy()

                        rel.defineActionableField(actionableField, spyAction)

                        const data = {
                            name : 'bob'
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot({}, '')

                        const after = test.firestore.makeDocumentSnapshot(data, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(spyAction.callCount).to.equals(0)
                    })


                    it('A defined field action should be executed when changes to the particular field are passed to takeActionOn', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(firestoreStub, null, wheelId)

                        const actionableField = 'flat'

                        const rel = new N2OneRelation(wheel, 'Car', firestoreStub)

                        const spyAction = sinon.spy()

                        rel.defineActionableField(actionableField, spyAction)

                        const before = test.firestore.makeDocumentSnapshot({}, '')

                        const data = {
                            [Relations.PIVOT] : { [actionableField] : true }
                        }

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(spyAction.callCount).to.equals(1)
                        expect(typeof spyAction.firstCall.args[0]).to.equals(typeof wheel)
                        expect(spyAction.firstCall.args[1]).to.be.true
                    })

                    it('A defined field action should be executed when changes to the particular field are passed to takeActionOn', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(firestoreStub, null, wheelId)

                        const actionableField = 'flat'

                        const rel = new N2OneRelation(wheel, 'Car', firestoreStub)

                        const spyAction = sinon.spy()

                        rel.defineActionableField(actionableField, spyAction)

                        const data = {
                            name : 'spare'
                        }
                       
                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        data[Relations.PIVOT] = { [actionableField] : true }

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(spyAction.callCount).to.equals(1)
                        expect(typeof spyAction.firstCall.args[0]).to.equals(typeof wheel)
                        expect(spyAction.firstCall.args[1]).to.be.true
                    })

                    it('Changes made the fields on the owner model with simular names should course a action on pivot to execute', async () => {

                        const wheelId = uniqid()
                        const wheel = new Wheel(firestoreStub, null, wheelId)

                        const actionableField = 'flat'

                        const rel = new N2OneRelation(wheel, 'Car', firestoreStub)

                        const spyAction = sinon.spy()

                        rel.defineActionableField(actionableField, spyAction)

                        const data = {
                            'name' : 'FL'
                        }

                        const before = test.firestore.makeDocumentSnapshot(data, '')

                        data[Relations.PIVOT] = true

                        const after = test.firestore.makeDocumentSnapshot(data, '')
    
                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                        await rel.takeActionOn(change)
                        
                        expect(spyAction.callCount).to.equals(0)
                    })
                })
            })

            describe('M2M', () => {

                it('Related models method should return the same relation every time', async () => {
                    const u = db.user() as User

                    const households1 = u.household()
                    const households2 = u.household()
                    
                    expect(households1).to.equals(households2)
                })

                it('Create root documents and relation by attaching two models', async () => {
                    const user = db.user()
                    const sensor = db.sensor()

                    await user.sensors().attach(sensor)

                    const userSensors = await user.getField(sensor.name)
                    const sensorUsers = await sensor.getField(user.name)

                    const sensorId = sensor.getId()
                    const userId = user.getId()

                    //clean up
                    docsToBeDeleted.push(user.getDocRef().path)
                    docsToBeDeleted.push(sensor.getDocRef().path)
                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                    
                    expect(Object.keys(userSensors), 'Foreign key on user').to.include(sensorId)
                    expect(Object.keys(sensorUsers), 'Foreign key on sensor').to.include(userId)
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

                it('Returned Pivot of a relation should have a correct name of the to owner models', async () => {
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

                //     const rel = new Many2ManyRelationStub(car, driver.name, firestoreStub)

                //     const cachedOnPivot = [
                //         'brand',
                //         'year'
                //     ]

                //     rel.defineCachableFields(null, null, cachedOnPivot)

                //     const cachableFields = rel.getCachableFields()

                //     expect(cachedOnPivot).to.be.equal(cachableFields)
                // })

                it('Fields to be cached from the pivot to the owner should be definable on the relation between the owner and the property', async () => {

                    const driver = new Driver(firestoreStub)
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

                    const rel = new Many2ManyRelationStub(car, driver.name, firestoreStub)

                    const cachedFromPivot = [
                        'brand',
                        'year'
                    ]

                    rel.defineCachableFields(null, cachedFromPivot)

                    const cache = rel.getCachableFields()

                    expect(cachedFromPivot).to.be.equal(cache)
                })

                
                it('Fields to be cached from the owner to the property should be definable on the relation between the owner and the property', async () => {

                    const driver = new Driver(firestoreStub)
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

                    const rel = new Many2ManyRelationStub(car, driver.name, firestoreStub)

                    const cachedFromPivot = [
                        'brand',
                        'year'
                    ]

                    rel.defineCachableFields(cachedFromPivot)

                    const cache = rel.getCachableFields()

                    expect(cachedFromPivot).to.be.equal(cache)
                })

                it('Fields to be cached from the owner on to the property should be definable on the relation between the owner and the property', async () => {

                    const driver = new Driver(firestoreStub)
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

                    const rel = new Many2ManyRelationStub(car, driver.name, firestoreStub)

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

                    const car = new CarM(firestoreStub, null, carId)
                    const driver = new Driver(firestoreStub, null, driverId)

                    await car.drivers().attach(driver)

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const data = {
                        name : 'Mustang'
                    }

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    expect(firestoreMockData[`${driver.name}/${driverId}`]).to.deep.equal({
                        [`${car.name}.${carId}.name`] : 'Mustang'
                    })
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

                    const car = new CarM(firestoreStub, null, carId)
                    const driver = new Driver(firestoreStub, null, driverId)

                    await car.drivers().attach(driver)

                    const data = {
                        name : 'Mustang'
                    }

                    const before = test.firestore.makeDocumentSnapshot(data, '')

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    expect(firestoreMockData[`${driver.name}/${driverId}`][`${car.name}.${carId}.name`]).to.be.undefined
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

                    const car = new CarM(firestoreStub, null, carId)
                    const driver = new Driver(firestoreStub, null, driverId)

                    await car.drivers().attach(driver)

                    const data = {
                        name : 'Mustang'
                    }

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    expect(firestoreMockData[`${driver.name}/${driverId}`]).to.deep.equal({
                            [`${car.name}.${carId}.name`] : 'Mustang'
                    })

                    const change2 = new Change<FirebaseFirestore.DocumentSnapshot>(after, before)

                    await car.drivers().updateCache(change2)

                    expect(firestoreMockData[`${driver.name}/${driverId}`][`${car.name}.${carId}.name`])
                        .to.be.null
                })

                it('Fields defined as cachable on to the owner from the pivot should be cached when new field is added', async () => {

                    const cachedField = 'crashes'

                    const driverId = uniqid()
                    const driver = new Driver(firestoreStub, null, driverId)

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(driver.name)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const car = new CarM(firestoreStub, null, carId)

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

                    expect(firestoreMockData[`${car.name}/${carId}`]).to.deep.equal({
                        [`${driver.name}.${driverId}.${Relations.PIVOT}.${cachedField}`] : 3
                    })
                })

                it('Fields defined as cachable from the pivot on to the owner should be cached on field update', async () => {

                    const cachedField = 'crashes'

                    const driverId = uniqid()
                    const carId = uniqid()

                    const driver = new Driver(firestoreStub, null, driverId)

                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(driver.name)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(firestoreStub, null, carId)

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

                    expect(firestoreMockData[`${car.name}/${carId}`]).to.deep.equal({
                        [`${driver.name}.${driverId}.${Relations.PIVOT}.${cachedField}`] : 3
                    })
                })

                it('GetName of Pivot model should return a correct formatted name', async () => {
         
                    const driver = new Driver(firestoreStub)
                    const car = new Car(firestoreStub)
                    
                    const pivotId = `${car.getId()}_${driver.getId()}`

                    const pivot = new Pivot(firestoreStub, pivotId, car, driver)
    
                    expect(pivot.getName()).to.be.equal(`${car.name}_${driver.name}`)
                })
               
                it('GetId of pivot model should return a correct formatted id', async () => {
    
                    const driver = new Driver(firestoreStub)
                    const car = new Car(firestoreStub)
    
                    const pivotId = `${car.getId()}_${driver.getId()}`

                    const pivot = new Pivot(firestoreStub, pivotId, car, driver)
    
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

                    const driver = new Driver(firestoreStub, null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(driver.name)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(firestoreStub, null, carId)

                    await car.drivers().attach(driver)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(firestoreStub, pivotId, car, driver)

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

                    expect(firestoreMockData[`${car.name}/${carId}`]).to.deep.equal({
                        [`${driver.name}.${driverId}.${Relations.PIVOT}.${cachedField}`] : 3
                    })
                })

                it('Cached data from pivot should be updated on both owner models', async () => {
         
                    const cachedField = 'crashes'

                    class DriverM extends Driver {
                        cars(): Many2ManyRelation
                        {
                            return this.belongsToMany(car.name)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const driverId = uniqid()
                    const driver = new DriverM(firestoreStub, null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(driver.name)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const car = new CarM(firestoreStub, null, carId)

                    await car.drivers().attach(driver)
                    await driver.cars().attach(car)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(firestoreStub, pivotId, car, driver)

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

                    expect(firestoreMockData[`${car.name}/${carId}`]).to.deep.equal({
                        [`${driver.name}.${driverId}.${Relations.PIVOT}.${cachedField}`] : 3
                    })

                    expect(firestoreMockData[`${driver.name}/${driverId}`]).to.deep.equal({
                        [`${car.name}.${carId}.${Relations.PIVOT}.${cachedField}`] : 3
                    })
                })

                it('Fields defined as cachable from pivot should be updated on owner model also when cache from owner to property is defined', async () => {
         
                    const cachedField = 'crashes'

                    const carId = uniqid()
                    const driverId = uniqid()

                    const driver = new Driver(firestoreStub, null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.belongsToMany(driver.name)
                                    .defineCachableFields([
                                        'model'
                                    ], [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(firestoreStub, null, carId)

                    await car.drivers().attach(driver)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(firestoreStub, pivotId, car, driver)

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

                    expect(firestoreMockData[`${car.name}/${carId}`]).to.deep.equal({
                        [`${driver.name}.${driverId}.${Relations.PIVOT}.${cachedField}`] : 3
                    })
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

                    const car = new CarM(firestoreStub, null, carId)
                    const driver = new Driver(firestoreStub, null, driverId)

                    await car.drivers().attach(driver)

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const data = {
                        [cacheField] : 'Mustang'
                    }

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    expect(firestoreMockData[`${driver.name}/${driverId}`]).to.deep.equal({
                        [`${car.name}.${carId}.${cacheField}`] : 'Mustang'
                    })
                })
            })
        })
    })
})