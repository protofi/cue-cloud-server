import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'

import DataORMImpl from "./lib/ORM"
import { asyncForEach } from './lib/util'
import User from './lib/ORM/Models/User'
import Household from './lib/ORM/Models/Household'
import Sensor from './lib/ORM/Models/Sensor'
import ModelImpl, { Models } from './lib/ORM/Models'
import Room from './lib/ORM/Models/Room'
import Event from './lib/ORM/Models/Event'
import { Many2ManyRelation } from './lib/ORM/Relation';

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe('STAGE', () => {

    var test: FeaturesList
    var myFunctions
    var adminFs: FirebaseFirestore.Firestore
    var db: DataORMImpl

    before(async () => {

        const stageProjectId = "staging-iot-cloud-server"

        test = functionsTest({
            databaseURL: `https://${stageProjectId}.firebaseio.com`,
            projectId: stageProjectId,
        }, `./${stageProjectId}.serviceAccountKey.json`)

        try {
            admin.initializeApp();
        } catch (e) {}

        myFunctions = require('../lib/index')
        adminFs = admin.firestore()
        try {
            adminFs.settings({ timestampsInSnapshots: true })
        } catch (e) {}

        db = new DataORMImpl(adminFs)
    });

    after(async () => {
        test.cleanup()
    })

    describe('ORM', async () => {

        var docsToBeDeleted

        beforeEach(() => {
            docsToBeDeleted = []
        })

        afterEach(async () => {
            await asyncForEach(docsToBeDeleted, async (path: string ) => {
                await adminFs.doc(path).delete()
            })
        })

        describe('CRUD', async () => {

            it('Create doc new ref.', async () => {
                const docRef: FirebaseFirestore.DocumentReference = await db.user().getDocRef()
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

            it('Get ref returns the same ref after initialization.', async () => {
                const user1: ModelImpl = db.user()
                const docRef1: FirebaseFirestore.DocumentReference = await user1.getDocRef()
                const docRef2: FirebaseFirestore.DocumentReference = await user1.getDocRef()

                expect(docRef1.id).to.equals(docRef2.id)
            })

            it('Get ID of new Model.', async () => {
                const user: ModelImpl = db.user()
                const id: string = await user.getId()

                expect(id).exist
            })

            it('Get ID of created docRef.', async () => {
                const user: ModelImpl = await db.user().create({
                    name : 'Tob'
                })

                const id: string = await user.getId()
                
                docsToBeDeleted.push((await user.getDocRef()).path)
                
                expect(id).exist
            })

            it('Create.', async () => {

                const user: ModelImpl = db.user()
                await user.create({
                    name: 'Bob'
                })

                // Clean up
                docsToBeDeleted.push((await user.getDocRef()).path)

                const name: string = await user.getField('name')
                expect(name).to.equals('Bob')
            })

            it('Create w. batch', async () => {
                const batch = db.batch()
                const user = await db.user().create({
                    name: 'Bob'
                }, batch)

                //Clean up
                docsToBeDeleted.push((await user.getDocRef()).path)

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

                docsToBeDeleted.push((await user.getDocRef()).path)

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
                docsToBeDeleted.push((await user.getDocRef()).path)

                await user.update({
                    age: 28
                }, batch)

                await batch.commit()

                const userId = await user.getId()

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
                docsToBeDeleted.push((await user.getDocRef()).path)

                await user.update({
                    age: 28
                }, batch)

                const userId = await user.getId()

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
                docsToBeDeleted.push((await user.getDocRef()).path)

                await user.update({
                    age: 28
                })

                const id = await user.getId()
                const name = await user.getField('name')
                const age = await user.getField('age')

                docsToBeDeleted.push((await user.getDocRef()).path)

                expect(name).equals('Bobby')
                expect(age).equals(28)

                await user.delete()

                await user.find(id)
                const age2 = await user.getField('age')
                
                expect(age2).to.not.exist
            })
        })

        describe('Relations.', () => {

            describe('I2I', async () => {
                
                it('Related models method should return the same relation every time', async () => {

                    const sensor: Sensor = db.sensor()

                    const room1 = sensor.room()
                    const room2 = sensor.room()

                    expect(room1).to.deep.equals(room2)
                })

                it('Save model to an other', async () => {
                    
                    const sensor: Sensor = await db.sensor()
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
                    
                    const sensor: Sensor = await db.sensor()
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
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    docsToBeDeleted.push((await event.getDocRef()).path)
                    
                    const attRoom = await sensor.getField(room.name)
                    const attEvents = await sensor.getField(event.name)

                    const attSensors = await room.getField(sensor.name)
                    const attSensor = await event.getField(sensor.name)

                    const sensorId = await sensor.getId()
                    const roomId = await room.getId()
                    const eventId = await event.getId()

                    expect(roomId).to.deep.equals(attRoom.id)
                    expect(sensorId).to.deep.equals(attSensor.id)
                    expect(Object.keys(attEvents), 'Foreign key on sensor').to.include(eventId)
                    expect(Object.keys(attSensors), 'Foreign key on room').to.include(sensorId)
                })

                it('Save model to an other reverse I2M BATCH', async () => {
                    
                    const sensor: Sensor = await db.sensor()
                    const room: Room = db.room()

                    const batch = db.batch()

                    await sensor.room().set(room, batch)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                    await batch.commit()

                    const roomId = await room.getId()
                    const sensorId = await sensor.getId()
                    
                    const attRoom = await sensor.getField(room.name)
                    const attSensors = await room.getField(sensor.name)

                    expect(roomId).to.deep.equals(attRoom.id)
                    expect(Object.keys(attSensors), 'Foreign key on room').to.include(sensorId)
                })

                it('Save model to an other reverse I2M BATCH SOULD FAIL', async () => {
                    const sensor: Sensor = await db.sensor()
                    const room: Room = db.room()

                    const batch = db.batch()

                    await sensor.room().set(room, batch)

                    const roomId = await room.getId()
                    const sensorId = await sensor.getId()
                    
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

                it('Create root documents and relation by attaching two models', async () => {
                    const room: Room = db.room()
                    const sensor: Sensor = db.sensor()

                    await room.sensors().attach(sensor)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                    const roomSensors = await room.getField(sensor.name)
                    const sensorRoom = await sensor.getField(room.name)

                    const roomId = await room.getId()
                    const sensorId = await sensor.getId()

                    expect(Object.keys(roomSensors), 'Foreign key on room').to.include(sensorId)
                    expect(roomId, 'Foreign key on sensor').equals(sensorRoom.id)
                })

                it('Make sure models can be attached and retrieved "inverse"', async () => {

                    const room: Room = db.room()
                    const sensor: Sensor = db.sensor()

                    const roomId = await room.getId()

                    await room.sensors().attach(sensor)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                    const attRoom = await sensor.room().get()

                    expect(roomId).to.equal(await attRoom.getId())
                })

                it('Retrieve cached relational data', async () => {
                    const sensor = db.sensor()
                    const room = db.room()
                    const sensorId = await sensor.getId();

                    await room.sensors().attach(sensor)
                    
                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
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
            })

            describe('M2M', () => {

                it('Related models method should return the same relation every time', async () => {
                    const u = db.user() as User

                    const households1 = u.households()
                    const households2 = u.households()
                    
                    expect(households1).to.equals(households2)
                })

                it('Create root documents and relation by attaching two models', async () => {
                    const user = db.user() as User
                    const sensor = db.sensor() as Sensor

                    await user.sensors().attach(sensor)

                    const userSensors = await user.getField(sensor.name)
                    const sensorUsers = await sensor.getField(user.name)

                    const sensorId = await sensor.getId()
                    const userId = await user.getId()

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                    
                    expect(Object.keys(userSensors), 'Foreign key on user').to.include(sensorId)
                    expect(Object.keys(sensorUsers), 'Foreign key on sensor').to.include(userId)
                })

                it('Attach multiple models to one many-to-many related model', async () => {
                    const user = db.user() as User
                    const sensor1 = db.sensor() as Sensor
                    const sensor2 = db.sensor() as Sensor

                    await user.sensors().attach(sensor1)
                    await user.sensors().attach(sensor2)

                    const userSensors = await user.getField(sensor1.name)
                    const sensor1Users = await sensor1.getField(user.name)
                    const sensor2Users = await sensor2.getField(user.name)

                    const userId: string = await user.getId()
                    const sensor1Id: string = await sensor1.getId()
                    const sensor2Id: string = await sensor2.getId()

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor1.getDocRef()).path)
                    docsToBeDeleted.push((await sensor2.getDocRef()).path)
                    docsToBeDeleted.push(`${sensor1.name}_${user.name}/${sensor1Id}_${userId}`)
                    docsToBeDeleted.push(`${sensor2.name}_${user.name}/${sensor2Id}_${userId}`)

                    expect(Object.keys(userSensors), 'Foreign key from sensor1 on user').to.include(sensor1Id)
                    expect(Object.keys(userSensors), 'Foreign key from sensor2 on user').to.include(sensor2Id)
                    expect(Object.keys(sensor1Users), 'Foreign key on sensor1').to.include(userId)
                    expect(Object.keys(sensor2Users), 'Foreign key on sensor2').to.include(userId)
                })

                it('Retrieve attached blank model of many-to-many relation', async () => {

                    const user = db.user() as User
                    const sensor = db.sensor() as Sensor

                    await user.sensors().attach(sensor)

                    const sensors: Array<ModelImpl> = await user.sensors().get()

                    const attachedSensorId = await sensors[0].getId()
                    const sensorId = await sensor.getId()

                    expect(sensorId).to.equal(attachedSensorId)

                    const userId: string = await user.getId()

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor.getDocRef()).path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                it('Retrieve attached model with data of many-to-many relation', async () => {
                    const user = db.user() as User
                    const sensor = db.sensor() as Sensor

                    const location: string = 'Office'

                    await sensor.create({
                        location: location
                    })

                    await user.sensors().attach(sensor)

                    const sensors: Array<ModelImpl> = await user.sensors().get()
                    const attachedSensor = await sensors[0]
                    const attLocation: string = await attachedSensor.getField('location')

                    expect(attLocation).to.equal(location)

                    //clean up
                    const senorId = await sensor.getId()
                    const userId: string = await user.getId()

                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor.getDocRef()).path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${senorId}_${userId}`)
                })

                it('Retrieve cached relational data', async () => {
                    const user = db.user() as User
                    const sensor = db.sensor() as Sensor
                    const sensorId = await sensor.getId();

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
                    const userId: string = await user.getId()

                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor.getDocRef()).path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })

                it('Attach pivot data to many-to-many relation', async () => {
                    const user = db.user() as User
                    const sensor = db.sensor() as Sensor
                    const sensorId = await sensor.getId()

                    await user.sensors().attach(sensor)

                    const pivot: ModelImpl = await user.sensors().pivot(sensorId)
                    await pivot.update({
                        settings : true
                    })

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await pivot.getDocRef()).path)
                })

                it('Make sure models can be attached in "inverse"', async () => {

                    const user = db.user() as User
                    const sensor = db.sensor() as Sensor
                    const sensorId = await sensor.getId()
                    const userId = await user.getId()

                    await user.sensors().attach(sensor)
                    await sensor.users().attach(user)

                    const pivot1: ModelImpl = await user.sensors().pivot(sensorId)
                    const pivot2: ModelImpl = await sensor.users().pivot(userId)

                    expect(await pivot1.getId()).to.equal(await pivot2.getId())

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await sensor.getDocRef()).path)

                    docsToBeDeleted.push(`${sensor.name}_${user.name}/${sensorId}_${userId}`)
                })
            })
        })
    })
})