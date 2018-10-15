import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features';

import DataORMImpl from "./lib/ORM"
import { asyncForEach } from './lib/util'
import User from './lib/ORM/Models/User';
import Household from './lib/ORM/Models/Household';
import Sensor from './lib/ORM/Models/Sensor';
import ModelImpl, { Models } from './lib/ORM/Models';
import Room from './lib/ORM/Models/Room';
import Event from './lib/ORM/Models/Event';
import { N2OneRelation } from './lib/ORM/Relation';

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised");

chai.should();
chai.use(chaiThings);
chai.use(chaiAsPromised);

const assert = chai.assert;
const expect = chai.expect;

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
        }, `./${stageProjectId}.serviceAccountKey.json`);

        myFunctions = require('../lib/index');
        adminFs = admin.firestore();
        db = new DataORMImpl(adminFs);
    });

    describe('ORM', () => {

        var docsToBeDeleted

        beforeEach(() => {
            docsToBeDeleted = []
        })

        afterEach(async () => {
            await asyncForEach(docsToBeDeleted, async (path: string ) => {
                await adminFs.doc(path).delete()
            })
        })

        describe('CRUD', () => {

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
            }).timeout(3000)

            it('Create.', async () => {

                const user: ModelImpl = db.user()
                await user.create({
                    name: 'Bob'
                })

                docsToBeDeleted.push((await user.getDocRef()).path)

                const name: string = await user.getField('name')
                expect(name).to.equals('Bob')
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

                await user.update({
                    age: 28
                })

                const name = await user.getField('name')
                const age = await user.getField('age')

                docsToBeDeleted.push((await user.getDocRef()).path)
                
                expect(name).equals('Bobby')
                expect(age).equals(28)
            })

            it('Delete.', async () => {

                const user: ModelImpl = db.user()

                await user.create({
                    name: 'Bobby'
                })

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
            }).timeout(4000)
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

                    const roomId = await room.getId()
                    
                    const attRoom = await sensor.getField(room.name)
                    
                    expect(roomId).to.deep.equals(attRoom.id)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                }).timeout(3000)

                it.only('Save model to an other reverse I2M', async () => {
                    
                    const sensor: Sensor = await db.sensor()
                    const room: Room = db.room()

                    await sensor.room().set(room)

                    const roomId = await room.getId()
                    const sensorId = await sensor.getId()
                    
                    const attRoom = await sensor.getField(room.name)
                    const attSensors = await room.getField(sensor.name)

                    expect(roomId).to.deep.equals(attRoom.id)
                    expect(Object.keys(attSensors), 'Foreign key on room').to.include(sensorId)
              
                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)

                }).timeout(3000)
               
                it.only('A model can have multiple relations', async () => {
                    const sensor: Sensor = db.sensor()
                    const room: Room = db.room()
                    const event: Event = db.event()

                    await event.sensor().set(sensor)
                    await room.sensors().attach(sensor)

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

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    docsToBeDeleted.push((await event.getDocRef()).path)

                }).timeout(4000)
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

                    const roomSensors = await room.getField(sensor.name)
                    const sensorRoom = await sensor.getField(room.name)

                    const roomId = await room.getId()
                    const sensorId = await sensor.getId()

                    expect(Object.keys(roomSensors), 'Foreign key on room').to.include(sensorId)
                    expect(roomId, 'Foreign key on sensor').equals(sensorRoom.id)

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)

                }).timeout(4000)

                it('Make sure models can be attached and received "inverse"', async () => {

                    const room: Room = db.room()
                    const sensor: Sensor = db.sensor()

                    const roomId = await room.getId()

                    await room.sensors().attach(sensor)

                    const attRoom = await sensor.room().get()

                    expect(roomId).to.equal(await attRoom.getId())

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                    
                }).timeout(4000)

                it('Retrive cached relational data', async () => {
                    const sensor = db.sensor()
                    const room = db.room()
                    const sensorId = await sensor.getId();

                    await room.sensors().attach(sensor)
                    
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

                    //clean up
                    docsToBeDeleted.push((await sensor.getDocRef()).path)
                    docsToBeDeleted.push((await room.getDocRef()).path)
                   
                }).timeout(4000)
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
                    const house = db.household() as Household

                    await user.households().attach(house)

                    const userHouses = await user.getField(house.name)
                    const houseUsers = await house.getField(user.name)

                    const houseId = await house.getId()
                    const userId = await user.getId()

                    expect(Object.keys(userHouses), 'Foreign key on user').to.include(houseId)
                    expect(Object.keys(houseUsers), 'Foreign key on household').to.include(userId)

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await house.getDocRef()).path)
                    docsToBeDeleted.push(`${house.name}_${user.name}/${houseId}_${userId}`)

                }).timeout(4000)

                it('Attach multiple models to one many-to-many related model', async () => {
                    const user = db.user() as User
                    const house1 = db.household() as Household
                    const house2 = db.household() as Household

                    await user.households().attach(house1)
                    await user.households().attach(house2)

                    const userHouses = await user.getField(house1.name)
                    const house1Users = await house1.getField(user.name)
                    const house2Users = await house2.getField(user.name)

                    const userId: string = await user.getId()
                    const house1Id: string = await house1.getId()
                    const house2Id: string = await house2.getId()

                    expect(Object.keys(userHouses), 'Foreign key from house1 on user').to.include(house1Id)
                    expect(Object.keys(userHouses), 'Foreign key from house2 on user').to.include(house2Id)
                    expect(Object.keys(house1Users), 'Foreign key on household1').to.include(userId)
                    expect(Object.keys(house2Users), 'Foreign key on household2').to.include(userId)

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await house1.getDocRef()).path)
                    docsToBeDeleted.push((await house2.getDocRef()).path)
                    docsToBeDeleted.push(`${house1.name}_${user.name}/${house1Id}_${userId}`)
                    docsToBeDeleted.push(`${house2.name}_${user.name}/${house2Id}_${userId}`)

                }).timeout(5000)

                it('Retrive attached blank model of many-to-many relation', async () => {

                    const user = db.user() as User
                    const house = db.household() as Household

                    await user.households().attach(house)

                    const households: Array<ModelImpl> = await user.households().get()

                    const attachedHouseId = await households[0].getId()
                    const houseId = await house.getId()

                    expect(houseId).to.equal(attachedHouseId)

                    const userId: string = await user.getId()

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await house.getDocRef()).path)

                    docsToBeDeleted.push(`${house.name}_${user.name}/${houseId}_${userId}`)

                }).timeout(4000)

                it('Retrive attached model with data of many-to-many relation', async () => {
                    const user = db.user() as User
                    const house = db.household() as Household

                    const name: string = 'My home'

                    house.update({
                        name: name
                    })

                    await user.households().attach(house)

                    const households: Array<ModelImpl> = await user.households().get()
                    const attachedHouse = await households[0]
                    const attName: string = await attachedHouse.getField('name')

                    expect(attName).to.equal(name)

                    //clean up
                    const houseId = await house.getId()
                    const userId: string = await user.getId()

                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await house.getDocRef()).path)

                    docsToBeDeleted.push(`${house.name}_${user.name}/${houseId}_${userId}`)

                }).timeout(4000)

                it('Retrive cached relational data', async () => {
                    const user = db.user() as User
                    const house = db.household() as Household
                    const houseId = await house.getId();

                    await user.households().attach(house)
                    
                    const houseData = {[houseId] : {
                        name: 'My Home'
                    }}

                    await user.update({
                        [house.name] : { 
                            [houseId] : {
                                name: 'My Home'
                            },
                            '123' : {
                                name: 'Summer house'
                            }
                        }
                    })

                    const cache1 = await user.households().cache()
                    const cache2 = await user.households().cache(houseId)

                    expect(cache1).to.deep.include(houseData)
                    expect(cache2).to.deep.equal(houseData[houseId])

                    //clean up
                    const userId: string = await user.getId()

                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await house.getDocRef()).path)

                    docsToBeDeleted.push(`${house.name}_${user.name}/${houseId}_${userId}`)

                }).timeout(4000)

                it('Attach pivot data to many-to-many relation', async () => {
                    const user = db.user() as User
                    const house = db.household() as Household
                    const houseId = await house.getId()

                    await user.households().attach(house)

                    const pivot: ModelImpl = await user.households().pivot(houseId)
                    await pivot.update({
                        settings : true
                    })

                    //clean up
                    docsToBeDeleted.push((await user.getDocRef()).path)
                    docsToBeDeleted.push((await house.getDocRef()).path)
                    docsToBeDeleted.push((await pivot.getDocRef()).path)

                }).timeout(4000)

                it('Make sure models can be attached in "inverse"', async () => {

                    const user = db.user() as User
                    const house = db.household() as Household
                    const houseId = await house.getId()
                    const userId = await user.getId()

                    await user.households().attach(house)
                    await house.users().attach(user)

                    const pivot1: ModelImpl = await user.households().pivot(houseId)
                    const pivot2: ModelImpl = await house.users().pivot(userId)

                    expect(await pivot1.getId()).to.equal(await pivot2.getId())

                     //clean up
                     docsToBeDeleted.push((await user.getDocRef()).path)
                     docsToBeDeleted.push((await house.getDocRef()).path)
 
                     docsToBeDeleted.push(`${house.name}_${user.name}/${houseId}_${userId}`)

                }).timeout(4000)
            })
        })
    })
})