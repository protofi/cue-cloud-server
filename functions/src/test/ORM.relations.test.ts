import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'

import DataORMImpl from "./lib/ORM"
import * as util from './lib/util'
import Sensor from './lib/ORM/Models/Sensor'
import ModelImpl, { Models } from './lib/ORM/Models'
import Room from './lib/ORM/Models/Room'
import { ActionableFieldCommandStub, Stubs, FirestoreStub } from './stubs'
import { Many2ManyRelation, One2ManyRelation, Many2OneRelation } from './lib/ORM/Relation'
import { Pivot } from './lib/ORM/Relation/Pivot'
import { Change } from 'firebase-functions'
import * as _ from 'lodash'
import { Relations } from './lib/const'
import Car from './stubs/Car'
import Wheel from './stubs/Wheel'
import Driver from './stubs/Driver'
import Windshield from './stubs/Windshield';

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
    let db: DataORMImpl
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

        try {
            adminFs = admin.firestore()
            adminFs.settings({ timestampsInSnapshots: true })
        } catch (e) {}

        db = new DataORMImpl(adminFs)
    })

    after(async () => {
        test.cleanup()
    })

    describe('ORM', async () => {

        let docsToBeDeleted

        beforeEach(() => {
            docsToBeDeleted = []
            firestoreStub.reset()
        })

        afterEach(async () => {
            await util.asyncForEach(docsToBeDeleted, async (path: string) => {
                await adminFs.doc(path).delete()
            })
        })

        describe('Relations', () => {

            describe('One-to-One', async () => {
                
                it('Invoking relation method which return the same relation object', async () => {
                    const car = new Car(firestoreStub.get())

                    const rel1 = car.windshield()
                    const rel2 = car.windshield()
                    
                    expect(rel1).to.be.deep.equal(rel2)
                })

                it('Setting one model on another should create correct relational links on each model', async () => {
                    
                    const carId    = uniqid()
                    const windshieldId  = uniqid()

                    const windshield: Windshield = new Windshield(firestoreStub.get(), null, windshieldId)
                    const car: Car = new Car(firestoreStub.get(), null, carId)

                    firestoreStub.data()[`${Stubs.WIND_SHEILD}/${windshieldId}`] = {}
                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {}

                    await windshield.car().set(car)

                    const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
                    const expectedCarDoc = {
                        [Stubs.WIND_SHEILD] : {
                            id : windshieldId
                        }
                    }

                    const windshieldDoc = firestoreStub.data()[`${Stubs.WIND_SHEILD}/${windshieldId}`]
                    const expectedWindshieldDoc = {
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }

                    expect(carDoc).to.be.deep.equal(expectedCarDoc)
                    expect(windshieldDoc).to.be.deep.equal(expectedWindshieldDoc)
                })
            })

            describe('One-to-many', async () => {

                const carId = uniqid()

                const car: Car = new Car(firestoreStub.get(), null, carId)
                const carPath = `${Stubs.CAR}/${carId}`

                const wheelId = uniqid()
                const wheelTwoId = uniqid()

                const wheel: Wheel = new Wheel(firestoreStub.get(), null, wheelId)
                const wheelPath = `${Stubs.WHEEL}/${wheelId}`

                const wheelTwo: Wheel = new Wheel(firestoreStub.get(), null, wheelTwoId)
                const wheelTwoPath = `${Stubs.WHEEL}/${wheelTwoId}`

                beforeEach(() => {

                    firestoreStub.data()[carPath] = {
                        [Stubs.WHEEL] : {
                            [wheelId] : true
                        }
                    }
                    
                    firestoreStub.data()[wheelPath] = {
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }
                })

                describe('Create', () => {
                    
                    it('Should create root documents and relation by attaching two models', async () => {
                    
                        //remove mock data
                        delete firestoreStub.data()[carPath]
                        delete firestoreStub.data()[wheelPath]
                        
                        const carM: Car = new Car(firestoreStub.get())
                        const wheelM: Wheel = new Wheel(firestoreStub.get())

                        firestoreStub.setInjectionIds([
                            wheelId,
                            carId,
                            carId,
                            wheelId,
                        ])

                        await carM.wheels().attach(wheelM)
                        
                        const carDoc = firestoreStub.data()[carPath]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true
                            }
                        }

                        expect(carDoc).to.be.deep.equals(expectedCarDoc)
                        
                        const wheelDoc = firestoreStub.data()[wheelPath]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }

                        expect(wheelDoc).to.be.deep.equals(expectedWheelDoc)
                     })
                })

                describe('Read', () => {

                    it('Retrieving a relation on a Model should return the same Relation every time', async () => {
                    
                        const rel1 = car.wheels()
                        const rel2 = car.wheels()
                        
                        expect(rel1).to.equals(rel2)
                    })
                    
                    it('Retrieving properties from a relation should return and array of Models of the correct type', async () => {

                        const wheels = await car.wheels().get() as Array<Wheel>
    
                        expect(wheels[0].car).to.exist
                        expect(typeof wheels[0].car).to.be.equal(typeof Function)
                    })
                })

                describe('Update', () => {
          
                    it('The pivot should be updatable through the relation', async () => {
        
                        const pivotData = {
                            flat : true
                        }

                        await car.wheels().updatePivot(wheelId, pivotData)
                        
                        const wheelDoc = firestoreStub.data()[wheelPath]

                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [Relations.PIVOT] : pivotData
                            }
                        }
                        
                        expect(wheelDoc).to.be.deep.equals(expectedWheelDoc)
                    })

                    it('Should be able to attach models by id', async () => {
                    
                        //remove mock data
                        delete firestoreStub.data()[carPath]
                        delete firestoreStub.data()[wheelPath]
    
                        await car.wheels().attachById(wheel.getId())
                        
                        const wheelDoc = firestoreStub.data()[wheelPath]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)

                        const carDoc = firestoreStub.data()[carPath]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : { [wheelId] : true }
                        }

                        expect(carDoc).to.deep.equal(expectedCarDoc)
                    })

                    it('When a write batch are passed to attachById the relations should be made when commit on batch is invoked', async () => {

                        //clean up
                        docsToBeDeleted.push(carPath)
                        docsToBeDeleted.push(wheelPath)
    
                        const carM = new Car(adminFs, null, carId)
    
                        const batch = adminFs.batch()
    
                        await carM.wheels().attachById(wheelId, batch)
                        
                        await batch.commit()
    
                        const carDoc = (await adminFs.doc(carPath).get()).data()
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true 
                            }
                        }
    
                        expect(carDoc).to.deep.equals(expectedCarDoc)
    
                        const wheelDoc = (await adminFs.doc(wheelPath).get()).data()
                        const expectedWheelId = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelDoc).to.be.deep.equals(expectedWheelId)
                    })
    
                    it('When a write batch are passed to attachById and commit on batch is not invoked the relations should not be made', async () => {
                        
                        //clean up
                        docsToBeDeleted.push(carPath)
                        docsToBeDeleted.push(wheelPath)
                        
                        const carM = new Car(adminFs, null, carId)
    
                        const batch = adminFs.batch()
    
                        await carM.wheels().attachById(wheelId, batch)
    
                        const carDoc = await adminFs.doc(carPath).get()
    
                        expect(carDoc.exists).to.be.false
    
                        const wheelDoc = await adminFs.doc(wheelPath).get()
                        
                        expect(wheelDoc.exists).to.be.false
                    })

                    it('Should update the correct relations if models are attached by Id in bulk', async () => {

                        //remove mock data
                        delete firestoreStub.data()[carPath]
                        delete firestoreStub.data()[wheelPath]
    
                        await car.wheels().attachBulk([
                            wheel,
                            wheelTwo
                        ])
    
                        const wheelDoc = firestoreStub.data()[wheelPath]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)
    
                        const wheelTwoDoc = firestoreStub.data()[wheelTwoPath]
                        const expectedWheelTwoDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelTwoDoc).to.deep.equal(expectedWheelTwoDoc)
    
    
                        const carDoc = firestoreStub.data()[carPath]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelTwoId] : true
                            }
                        }
    
                        expect(carDoc).to.deep.equal(expectedCarDoc)
                    })    

                    it('When a write batch are passed to attachBulk the relations should be made when commit on batch is invoked', async () => {

                        //clean up
                        docsToBeDeleted.push(carPath)
                        docsToBeDeleted.push(wheelPath)
                        docsToBeDeleted.push(wheelTwoPath)

                        const batch     = adminFs.batch()

                        const carM = new Car(adminFs, null, carId)

                        await carM.wheels().attachBulk([
                            new Wheel(adminFs, null, wheelId),
                            new Wheel(adminFs, null, wheelTwoId)
                        ], batch)

                        await batch.commit()

                        const carDoc = (await adminFs.doc(carPath).get()).data()
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelTwoId] : true
                            }
                        }

                        expect(carDoc).to.deep.equals(expectedCarDoc)

                        const wheelDoc = (await adminFs.doc(wheelPath).get()).data()
                        const expectedWheelId = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }

                        expect(wheelDoc).to.be.deep.equals(expectedWheelId)

                        const wheelTwoDoc = (await adminFs.doc(wheelTwoPath).get()).data()
                        const expectedWheelTwoId = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }

                        expect(wheelTwoDoc).to.be.deep.equals(expectedWheelTwoId)
                    })

                    it('When a write batch are passed to attachBulk and commit on batch is not invoked the relations should not be made', async () => {

                        const batch     = adminFs.batch()
                    
                        const carM = new Car(adminFs, null, carId)

                        await carM.wheels().attachBulk([
                            new Wheel(adminFs, null, wheelId),
                            new Wheel(adminFs, null, wheelTwoId),
                        ], batch)

                        const carDoc = await adminFs.doc(carPath).get()
        
                        expect(carDoc.exists).to.be.false
        
                        const wheelDoc = await adminFs.doc(wheelPath).get()
                            
                        expect(wheelDoc.exists).to.be.false

                        const wheelTwoDoc = await adminFs.doc(wheelTwoPath).get()
                            
                        expect(wheelTwoDoc.exists).to.be.false
                    })
                        
                    it('Should update the correct relations when models are attach ', async () => {

                        //remove mock data
                        delete firestoreStub.data()[carPath]
                        delete firestoreStub.data()[wheelPath]

                        await car.wheels().attachBulk([
                            wheel,
                            wheelTwo
                        ])
                        
                        const wheelDoc = firestoreStub.data()[wheelPath]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }

                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)

                        const wheelTwoDoc = firestoreStub.data()[wheelTwoPath]
                        const expectedWheelTwoDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }

                        expect(wheelTwoDoc).to.deep.equal(expectedWheelTwoDoc)


                        const carDoc = firestoreStub.data()[carPath]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelTwoId] : true
                            }
                        }

                        expect(carDoc).to.deep.equal(expectedCarDoc)
                    })
                    
                    it('AttachByIdBulk should not update any collection if id array is empty', async () => {

                        //remove mock data
                        delete firestoreStub.data()[carPath]
                        delete firestoreStub.data()[wheelPath]
    
                        await car.wheels().attachByIdBulk([])
                        expect(firestoreStub.data()[carPath]).to.not.exist
    
                    })
    
                    it('Should update the correct relations when models are attached by id in bulk', async () => {
    
                        //remove mock data
                        delete firestoreStub.data()[carPath]
                        delete firestoreStub.data()[wheelPath]
    
                        await car.wheels().attachByIdBulk([
                            wheelId,
                            wheelTwoId
                        ])
                        
                        const wheelDoc = firestoreStub.data()[wheelPath]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)
    
                        const wheelTwoDoc = firestoreStub.data()[wheelTwoPath]
                        const expectedWheelTwoDoc = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelTwoDoc).to.deep.equal(expectedWheelTwoDoc)
    
    
                        const carDoc = firestoreStub.data()[carPath]
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelTwoId] : true
                            }
                        }
    
                        expect(carDoc).to.deep.equal(expectedCarDoc)
                    })

                    it('When a write batch are passed to attachByIdBulk the relations should be made when commit on batch is invoked', async () => {

                        //clean up
                        docsToBeDeleted.push(carPath)
                        docsToBeDeleted.push(wheelPath)
                        docsToBeDeleted.push(wheelTwoPath)
    
                        const batch     = adminFs.batch()
    
                        const carM = new Car(adminFs, null, carId)
    
                        await carM.wheels().attachByIdBulk([
                            wheelId,
                            wheelTwoId
                        ], batch)
    
                        await batch.commit()
    
                        const carDoc = (await adminFs.doc(carPath).get()).data()
                        const expectedCarDoc = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelTwoId] : true
                            }
                        }
    
                        expect(carDoc).to.deep.equals(expectedCarDoc)
    
                        const wheelDoc = (await adminFs.doc(wheelPath).get()).data()
                        const expectedWheelId = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelDoc).to.be.deep.equals(expectedWheelId)
    
                        const wheelTwoDoc = (await adminFs.doc(wheelTwoPath).get()).data()
                        const expectedWheelTwoId = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }
    
                        expect(wheelTwoDoc).to.be.deep.equals(expectedWheelTwoId)
                    })
    
                    it('When a write batch are passed to attachByIdBulk and commit on batch is not invoked the relations should not be made', async () => {
    
                        const batch     = adminFs.batch()
                    
                        const carM = new Car(adminFs, null, carId)
    
                        await carM.wheels().attachByIdBulk([
                            wheelId,
                            wheelTwoId
                        ], batch)
    
                        const carDoc = await adminFs.doc(carPath).get()
        
                        expect(carDoc.exists).to.be.false
        
                        const wheelDoc = await adminFs.doc(wheelPath).get()
                            
                        expect(wheelDoc.exists).to.be.false
    
                        const wheelTwoDoc = await adminFs.doc(wheelTwoPath).get()
                            
                        expect(wheelTwoDoc.exists).to.be.false
                    })

                    it('Shoule remove relational links bewteen all model when models are detached from each other', async () => {
    
                        await car.wheels().detach()
                        
                        const wheelDoc = firestoreStub.data()[wheelPath]
                       
                        expect(wheelDoc[Stubs.WHEEL]).to.be.undefined
    
                        const carDoc = firestoreStub.data()[carPath]

                        expect(carDoc[Stubs.CAR]).to.be.undefined
                    })
                })

                describe('Delete', () => {

                    it('Should be able to declare weak relationsship to allow cascade deletion on detach', async () => {

                       
                        class CarM extends Car {
                            wheels(): One2ManyRelation
                            {
                                return this.hasMany(Stubs.WHEEL, true)
                            }
                        }

                        const carM = new CarM(firestoreStub.get(), null, carId)

                        //mock data
                        firestoreStub.data()[carPath] = {
                            [Stubs.WHEEL] : {
                                [wheelId] : true,
                                [wheelTwoId] : true
                            }
                        }

                        firestoreStub.data()[wheelTwoPath] = {
                            [Stubs.CAR] : {
                                id : carId
                            }
                        }

                        await carM.wheels().detach()

                        const wheelDoc = firestoreStub.data()[wheelPath]

                        expect(wheelDoc).to.be.undefined

                        const wheelTwoDoc = firestoreStub.data()[wheelTwoPath]

                        expect(wheelTwoDoc).to.be.undefined

                        const carDoc = firestoreStub.data()[carPath]

                        expect(carDoc).to.be.empty
                    })
                })

                describe('Actionable fields', () => {

                    const rel = new One2ManyRelation(car, Stubs.WHEEL, firestoreStub.get())

                    const command = new ActionableFieldCommandStub()
                    const commandSpy = sinon.spy(command, 'execute')

                    rel.defineActionOnUpdate(command)

                    beforeEach(() => {
                        commandSpy.resetHistory()
                    })

                    it('Action should be defined on the relation between the owner model and property model', async () => {

                        class One2ManyRelationStub extends One2ManyRelation
                        {
                            getOnUpdateActions()
                            {
                                return this.onUpdateAction
                            }
                        }
                        const relStub = new One2ManyRelationStub(car, Stubs.WHEEL, firestoreStub.get())

                        relStub.defineActionOnUpdate(command)

                        const fieldActions = relStub.getOnUpdateActions()

                        expect(fieldActions).to.not.be.null

                        await fieldActions.execute(car, {})

                        expect(commandSpy.callCount).to.equals(1)
                    })
                    
                    it('TakeActionOn should be able to react to changes when before snap is empty', async () => {

                        const wheelId1 = uniqid()

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

                        const wheelId1 = uniqid()

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

                        const wheelId1 = uniqid()
                        const wheelId2 = uniqid()

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

                        const wheelId1 = uniqid()
                        const wheelId2 = uniqid()

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

                describe('Cache Layer', () => {
                    
                    const cachedField = 'cachedFieldStub'
                    class CarM extends Car {
                        wheels(): One2ManyRelation
                        {
                            return this.hasMany(Stubs.WHEEL)
                                    .defineCachableFields([
                                        cachedField
                                    ])
                        }
                    }

                    const carM = new CarM(firestoreStub.get(), null, carId)
                
                    it('Fields to be cached should be definable on the relation between the owner and the property', async () => {
    
                        class One2ManyRelationStub extends One2ManyRelation
                        {
                            getCachableFields()
                            {
                                return this.cacheOnToProperty
                            }
                        }

                        const cachedToProperty = [
                            cachedField
                        ]

                        const rel = new One2ManyRelationStub(carM, Stubs.WHEEL, firestoreStub.get())

                        rel.defineCachableFields(cachedToProperty)
   
                        const cache = rel.getCachableFields()

                        expect(cachedToProperty).to.be.equal(cache)
                    })

                    it('Fields defined as cachable should be cached when new field is added', async () => {
                            
                        const before = test.firestore.makeDocumentSnapshot({}, '')

                        const data = {
                            [cachedField] : 'Mustang'
                        }

                        const after = test.firestore.makeDocumentSnapshot(data, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                        await carM.wheels().updateCache(change)

                        const wheelDoc = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : data[cachedField]
                            }
                        }

                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)
                    })

                    it('Fields defined as cachable should be cached on field update', async () => {

                        const beforeData = {
                            [cachedField] : false
                        }

                        const before = test.firestore.makeDocumentSnapshot(beforeData, '')

                        const afterData = {
                            [cachedField] : true
                        }

                        const after = test.firestore.makeDocumentSnapshot(afterData, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                        await carM.wheels().updateCache(change)

                        const wheelDoc = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : true
                            }
                        }

                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)
                    })

                    it('When fields defined are cachable is deleted the cached data should be deleted', async () => {

                        const data = {
                            [cachedField] : 'Mustang'
                        }

                        firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : data[cachedField]
                            }
                        }

                        const before = test.firestore.makeDocumentSnapshot(data, '')
                        const after = test.firestore.makeDocumentSnapshot({}, '')

                        const wheelDoc = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : data[cachedField]
                            }
                        }
                        
                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                        await carM.wheels().updateCache(change)
                        
                        const cachedData = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`][Stubs.CAR][cachedField]

                        expect(cachedData).to.be.undefined
                    })

                    it('When the nested field of origin is deleted the cached field should be deleted', async () => {

                        const dataBefore = {
                            [cachedField] : {
                                marts : true,
                                april : true
                            }
                        }

                        const dataAfter = {
                            [cachedField] : {
                                marts : true,
                            }
                        }

                        const before = test.firestore.makeDocumentSnapshot(dataBefore, '')

                        const after = test.firestore.makeDocumentSnapshot(dataAfter, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                        await carM.wheels().updateCache(change)

                        const wheelDoc = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : {
                                    marts : true,
                                }
                            }
                        }

                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)
                      
                        expect(firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`][Stubs.CAR].name)
                            .to.be.undefined
                    })

                    it('Should handle if one nested field is updated and another is deleted', async () => {
                        
                        const dataBefore = {
                            [cachedField] : {
                                marts : true,
                                april : true
                            }
                        }

                        const dataAfter = {
                            [cachedField] : {
                                marts : false,
                            }
                        }

                        const before = test.firestore.makeDocumentSnapshot(dataBefore, '')

                        const after = test.firestore.makeDocumentSnapshot(dataAfter, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                        await carM.wheels().updateCache(change)

                        const wheelDoc = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`]
                        const expectedWheelDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : {
                                    marts : false
                                }
                            }
                        }

                        expect(wheelDoc).to.deep.equal(expectedWheelDoc)
                    })

                    it('Cached fields should not be updated if no changes has happend to origin', async () => {
                        
                        const dataBefore = {
                            [cachedField] : 'Mustang'
                        }

                        const dataAfter = {
                            [cachedField] : 'Mustang',
                            'repaired' : true
                        }

                        firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`] = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : 'Mustang'
                            }
                        }

                        const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
                        const after = test.firestore.makeDocumentSnapshot(dataAfter, '')

                        const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                        await carM.wheels().updateCache(change)

                        const wheelDoc = firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`]
                        const expectedDriverDoc = {
                            [Stubs.CAR] : {
                                id : carId,
                                [cachedField] : 'Mustang'
                            }
                        }

                        expect(wheelDoc).to.deep.equal(expectedDriverDoc)
                    })
                })

                describe('Inverse One-to-Many', () => {

                    describe('Create', () => {
                    
                        it('Should create root documents and relations by setting one model on another', async () => {
                        
                            //remove mock data
                            delete firestoreStub.data()[carPath]
                            delete firestoreStub.data()[wheelPath]
                            
                            const carM: Car = new Car(firestoreStub.get())
                            const wheelM: Wheel = new Wheel(firestoreStub.get())
    
                            firestoreStub.setInjectionIds([
                                carId,
                                wheelId,
                                wheelId,
                                carId,
                            ])
                            
                            await wheelM.car().set(carM)
                            
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : true
                                }
                            }
    
                            expect(carDoc).to.be.deep.equals(expectedCarDoc)
                            
                            const wheelDoc = firestoreStub.data()[wheelPath]
                            const expectedWheelDoc = {
                                [Stubs.CAR] : {
                                    id : carId
                                }
                            }
    
                            expect(wheelDoc).to.be.deep.equals(expectedWheelDoc)
                        })

                        it('Should create relational links between models if is set on another', async () => {
                            //remove mock data
                            delete firestoreStub.data()[carPath][Stubs.WHEEL]
                            delete firestoreStub.data()[wheelPath][Stubs.CAR]

                            await wheel.car().set(car)
                            
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : true
                                }
                            }
    
                            expect(carDoc).to.be.deep.equals(expectedCarDoc)
                            
                            const wheelDoc = firestoreStub.data()[wheelPath]
                            const expectedWheelDoc = {
                                [Stubs.CAR] : {
                                    id : carId
                                }
                            }
    
                            expect(wheelDoc).to.be.deep.equals(expectedWheelDoc)
                        })
                    })

                    describe('Read', () => {

                        it('Retrieving a relation on a Model should return the same Relation every time', async () => {
                        
                            const rel1 = wheel.car()
                            const rel2 = wheel.car()
                            
                            expect(rel1).to.equals(rel2)
                        })

                        it('Retrieving properties from a relation should return and array of Models of the correct type', async () => {

                            const carRel = await wheel.car().get() as Car

                            expect(carRel.getId()).to.be.equal(carId)
                            expect(carRel[Stubs.WHEEL]).to.exist
                            expect(typeof carRel[Stubs.WHEEL]).to.be.equal(typeof Function)
                        })

                        it('Should return null if relation does not exist when retrieving opposite model of a relation', async () => {
                            //clear mock data
                            firestoreStub.data()[carPath] = {}
                            firestoreStub.data()[wheelPath] = {}

                            const carRel = await wheel.car().get() as Car

                            expect(carRel).to.be.null
                        })

                        it('Should enable retrieving pivot data', async () => {

                            const pivotField = 'flat'
                            
                            firestoreStub.data()[wheelPath] = {
                                [Stubs.CAR] : {
                                    [Relations.PIVOT] : {
                                        [pivotField] : true
                                    }
                                }
                            }

                            const fieldValue = await wheel.car().getPivotField(pivotField)

                            expect(fieldValue).to.be.true
                        })

                        it('Should return null if pivot field does not exists when retrieving pivot data', async () => {

                            const pivotField = 'flat'

                            const fieldValue = await wheel.car().getPivotField(pivotField)

                            expect(fieldValue).to.be.null
                        })

                        it('Should return null if relation does not exist when retrieving pivot data', async () => {
                            //clear mock data
                            firestoreStub.data()[carPath] = {}
                            firestoreStub.data()[wheelPath] = {}
                            const pivotField = 'flat'

                            const fieldValue = await wheel.car().getPivotField(pivotField)

                            expect(fieldValue).to.be.null
                        })

                        it('Should retrieve data stored on pivot when Cache is called on relation', async () => {
                            const cacheData = {
                                name : 'Mustang'
                            }
                            
                            firestoreStub.data()[wheelPath] = {
                                [Stubs.CAR] : cacheData
                            }

                            const cache = await wheel.car().cache()

                            expect(cache).to.be.deep.equal(cacheData)
                        })
                    })

                    describe('Update', () => {
                      
                        it('Should create correct relations when one model is set on another', async () => {
                            //clear mock data
                            firestoreStub.data()[carPath] = {}
                            firestoreStub.data()[wheelPath] = {}
                            
                            await wheel.car().set(car)

                            const wheelDoc = firestoreStub.data()[wheelPath]
                            const expectedWheelDoc = {
                                [Stubs.CAR] : {
                                    id : carId
                                }
                            }

                            expect(wheelDoc).to.be.deep.equal(expectedWheelDoc)

                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : true 
                                }
                            }

                            expect(carDoc).to.be.deep.equal(expectedCarDoc)
                        })
                        
                        it('Should update pivot data correctly', async () => {
                        
                            const pivotData = {
                                name : 'spare'
                            }
        
                            await wheel.car().updatePivot(pivotData)
        
                            const wheelDoc = firestoreStub.data()[wheelPath]
                            const expectedWheelDoc = {
                                [Stubs.CAR] : {
                                    id : carId,
                                    [Relations.PIVOT] : pivotData
                                }
                            }
        
                            expect(wheelDoc).to.deep.include(expectedWheelDoc)
                        })
                    })

                    describe('Delete', () => {
                        
                        it('Should delete relational links when one model is unset on another', async () => {
                            
                            // mock data
                            firestoreStub.data()[carPath] = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : true
                                }
                            }
                            
                            firestoreStub.data()[wheelPath] = {
                                id : wheelId,
                                [Stubs.CAR] : {
                                    id : carId
                                }
                            }

                            await wheel.car().unset()
                            
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {}
                            }
    
                            expect(carDoc).to.be.deep.equals(expectedCarDoc)
                            
                            const wheelDoc = firestoreStub.data()[wheelPath]
                            const expectedWheelDoc = {
                                id : wheelId
                            }
    
                            expect(wheelDoc).to.be.deep.equals(expectedWheelDoc)
                        })

                        it('Should not delete any relationsal links if relational llink is missing', async () => {
                            
                            // mock data
                            delete firestoreStub.data()[wheelPath][Stubs.CAR]

                            await wheel.car().unset()
                            
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : true
                                }
                            }
    
                            expect(carDoc).to.be.deep.equals(expectedCarDoc)
                        })
                    })

                    describe('Actionable fields', () => {

                        const actionableField = 'actionableFieldStub'

                        const rel = new Many2OneRelation(wheel, Stubs.CAR, firestoreStub.get())

                        const command = new ActionableFieldCommandStub()
                        const commandSpy = sinon.spy(command, 'execute')
    
                        rel.defineActionableField(actionableField, command)
    
                        beforeEach(() => {
                            commandSpy.resetHistory()
                        })

                        it('Actionable fields should be defined on the relation between the owner model and property model', async () => {
                            class N2OneRelationStub extends Many2OneRelation
                            {
                                getFieldActions()
                                {
                                    return this.actionableFields
                                }
                            }

                            const relStub = new N2OneRelationStub(wheel, Stubs.CAR, firestoreStub.get())

                            relStub.defineActionableField(actionableField, command)

                            const fieldActions = relStub.getFieldActions()

                            expect(fieldActions.get(actionableField)).to.not.be.null

                            await fieldActions.get(actionableField).execute(wheel, 'true')

                            expect(commandSpy.callCount).to.equals(1)
                        })
                        
                        it('TakeActionOn should be able to react to changes when before snap is empty', async () => {

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

                    describe('Cache Layer', () => {

                        const cachedField = 'cacheFieldStub'
                        class WheelM extends Wheel {
                            car(): Many2OneRelation
                            {
                                return this.haveOne(Stubs.CAR)
                                        .defineCachableFields([
                                            cachedField
                                        ])
                            }
                        }

                        const wheelM = new WheelM(firestoreStub.get(), null, wheelId)

                        beforeEach(() => {
                            firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : true
                                }
                            }
    
                            firestoreStub.data()[`${Stubs.WHEEL}/${wheelId}`] = {
                                [Stubs.CAR] : {
                                    id : carId
                                }
                            }
                        })

                        it('Fields to be cached should be definable on the relation between the owner and the property', async () => {
                            class Many2OneRelationStub extends Many2OneRelation
                            {
                                getCachableFields()
                                {
                                    return this.cacheOnToProperty
                                }
                            }
    
                            const cachedToProperty = [cachedField]
    
                            const rel = new Many2OneRelationStub(wheelM, Stubs.CAR, firestoreStub.get())
    
                            rel.defineCachableFields(cachedToProperty)
       
                            const cache = rel.getCachableFields()
    
                            expect(cachedToProperty).to.be.equal(cache)
                        })

                        it('Should not update cahce if not relation is existing', async () => {
                            //clear mock data
                            firestoreStub.data()[carPath] = {
                                id : carId
                            }
                            firestoreStub.data()[wheelPath] = {
                                id : wheelId
                            }
                            
                            const before = test.firestore.makeDocumentSnapshot({}, '')
    
                            const data = {
                                [cachedField] : 'Spare'
                            }
    
                            const after = test.firestore.makeDocumentSnapshot(data, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
                            
                            await wheelM.car().updateCache(change)
    
                            const wheelDoc = firestoreStub.data()[wheelPath]
                            const expectedWheelDoc = {
                                id : wheelId
                            }

                            expect(wheelDoc).to.be.deep.equal(expectedWheelDoc)

                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                id : carId
                            }

                            expect(carDoc).to.be.deep.equal(expectedCarDoc)
                        })
    
                        it('Fields defined as cachable should be cached when new field is added', async () => {
                                
                            const before = test.firestore.makeDocumentSnapshot({}, '')
    
                            const data = {
                                [cachedField] : 'Spare'
                            }
    
                            const after = test.firestore.makeDocumentSnapshot(data, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
                            
                            await wheelM.car().updateCache(change)
    
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : data
                                }
                            }
    
                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })
    
                        it('Fields defined as cachable should be cached on field update', async () => {

                            const beforeData = {
                                [cachedField] : false
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(beforeData, '')
    
                            const afterData = {
                                [cachedField] : true
                            }
    
                            const after = test.firestore.makeDocumentSnapshot(afterData, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await wheelM.car().updateCache(change)
    
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : afterData
                                }
                            }
    
                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })
    
                        it('When fields defined are cachable is deleted the cached data should be deleted', async () => {
    
                            const data = {
                                [cachedField] : 'Mustang'
                            }

                            firestoreStub.data()[carPath] = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : data
                                }
                            }

                            const before = test.firestore.makeDocumentSnapshot(data, '')
                            const after = test.firestore.makeDocumentSnapshot({}, '')
    
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedWheelDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : data
                                }
                            }
                                
                            expect(carDoc).to.deep.equal(expectedWheelDoc)
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await wheelM.car().updateCache(change)
                            
                            const cachedData = firestoreStub.data()[carPath][Stubs.WHEEL][wheelId][cachedField]
    
                            expect(cachedData).to.be.undefined
                        })
    
                        it('When the nested field of origin is deleted the cached field should be deleted', async () => {
                            
                            const dataBefore = {
                                [cachedField] : {
                                    marts : true,
                                    april : true
                                }
                            }
    
                            const dataAfter = {
                                [cachedField] : {
                                    marts : true,
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
    
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await wheelM.car().updateCache(change)
    
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : dataAfter
                                }
                            }
    
                            expect(carDoc).to.deep.equal(expectedCarDoc)
                          
                            expect(firestoreStub.data()[carPath][Stubs.WHEEL][wheelId].name)
                                .to.be.undefined
                        })
    
                        it('Should handle if one nested field is updated and another is deleted', async () => {
                            
                            const dataBefore = {
                                [cachedField] : {
                                    marts : true,
                                    april : true
                                }
                            }
    
                            const dataAfter = {
                                [cachedField] : {
                                    marts : false,
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
    
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await wheelM.car().updateCache(change)
                            
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : dataAfter
                                }
                            }
    
                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })
    
                        it('Cached fields should not be updated if no changes has happend to origin', async () => {
                            
                            const dataBefore = {
                                [cachedField] : 'Mustang'
                            }
    
                            const dataAfter = {
                                [cachedField] : 'Mustang',
                                'repaired' : true
                            }
    
                            firestoreStub.data()[carPath] = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : dataBefore
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await wheelM.car().updateCache(change)
    
                            const carDoc = firestoreStub.data()[carPath]
                            const expectedCarDoc = {
                                [Stubs.WHEEL] : {
                                    [wheelId] : dataBefore
                                }
                            }
    
                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })
                    })
                })
            })

            describe('Many-to-many', () => {

                it('Related models method should return the same relation every time', async () => {
                    const car = new Car(firestoreStub.get())

                    const drivers1 = car.drivers()
                    const drivers2 = car.drivers()

                    expect(drivers1).to.equals(drivers2)
                })

                it('Attaching a model to another should create an owner collection with a relation to the property', async () => {

                    const carId = uniqid()
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attach(driver)

                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId], 'Foreign key on owner').to.be.true
                })
                
                it('Attaching a model to another should create a Property Collection with a relation to the Owner', async () => {

                    const carId = uniqid()
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attach(driver)

                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId], 'Foreign key on property').to.be.true
                })

                it('Attaching a model to another should create a Pivot Collection with a relation to both Owner and Property', async () => {

                    const carId = uniqid()
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attach(driver)

                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.DRIVER]['id']).to.be.equals(driverId)
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
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const carName = 'Mustang'
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attach(driver, null, {
                        owner : {
                            name : carName
                        }
                    })

                    const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
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
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const driverName = 'Bob'
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attach(driver, null, {
                        property : {
                            name : driverName
                        }
                    })

                    const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
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
                    
                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachBulk([
                        new Driver(firestoreStub.get(), null, driverId1),
                        new Driver(firestoreStub.get(), null, driverId2),
                        new Driver(firestoreStub.get(), null, driverId3)
                    ])

                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]).to.exist
                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]).to.exist
                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]).to.exist
                })

                it('When models are attached in bulk relations to the owner model should be made on the property models', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachBulk([
                        new Driver(firestoreStub.get(), null, driverId1),
                        new Driver(firestoreStub.get(), null, driverId2),
                        new Driver(firestoreStub.get(), null, driverId3)
                    ])

                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]).to.be.true
                })

                it('When models are attached in bulk relations to all property models should create pivot collections', async () => {

                    const carId = uniqid()

                    const driverId1 = uniqid()
                    const driverId2 = uniqid()
                    const driverId3 = uniqid()
                    
                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachBulk([
                        new Driver(firestoreStub.get(), null, driverId1),
                        new Driver(firestoreStub.get(), null, driverId2),
                        new Driver(firestoreStub.get(), null, driverId3)
                    ])

                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.DRIVER]['id']).to.be.equals(driverId1)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.DRIVER]['id']).to.be.equals(driverId2)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.DRIVER]['id']).to.be.equals(driverId3)

                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.CAR]['id']).to.be.equals(carId)
                })

                it('AttachBulk should not update any collection if id array is empty', async () => {
                    const carId = uniqid()
                    
                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachBulk([])

                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`]).to.not.exist
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

                    const car = new Car(firestoreStub.get(), null, carId)
                    const carName = 'Bob'

                    await car.drivers().attachBulk([
                        new Driver(firestoreStub.get(), null, driverId1),
                        new Driver(firestoreStub.get(), null, driverId2),
                        new Driver(firestoreStub.get(), null, driverId3)
                    ], null, {
                        owner : {
                            name : carName
                        }
                    })

                    const carRelations1 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

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

                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachBulk([
                        new Driver(firestoreStub.get(), null, driverId1),
                        new Driver(firestoreStub.get(), null, driverId2),
                        new Driver(firestoreStub.get(), null, driverId3)
                    ], null, {
                        properties : [
                            { id : driverId1 },
                            { id : driverId2 },
                            { id : driverId3 }
                        ]
                    })

                    const driverRelations1 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

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

                    const car = new Car(firestoreStub.get(), null, carId)
                    const carName = 'Bob'

                    await car.drivers().attachBulk([
                        new Driver(firestoreStub.get(), null, driverId1),
                        new Driver(firestoreStub.get(), null, driverId2),
                        new Driver(firestoreStub.get(), null, driverId3)
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

                    const carRelations1 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

                    const expectedCarRelation = {
                        name : carName
                    }

                    expect(carRelations1).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations2).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations3).to.be.deep.equal(expectedCarRelation)

                    const driverRelations1 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

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
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    // const driver = new Driver(firestoreStub, null, driverId)

                    await car.drivers().attachById(driverId)

                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId], 'Foreign key on owner').to.be.true
                })
                
                it('Attaching a model to another by id should create a Property Collection with a relation to the Owner', async () => {

                    const carId = uniqid()
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attachById(driverId)

                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId], 'Foreign key on property').to.be.true
                })

                it('Attaching a model to another by id should create a Pivot Collection with a relation to both Owner and Property', async () => {

                    const carId = uniqid()
                    const car = new Car(firestoreStub.get(), null, carId)

                    const driverId = uniqid()
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attachById(driverId)

                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`][Stubs.DRIVER]['id']).to.be.equals(driverId)
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
                    
                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ])

                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]).to.exist
                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]).to.exist
                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]).to.exist
                })

                it('When models are attached in bulk by id relations to the owner model should be made on the property models', async () => {

                    const carId     = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()

                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ])

                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]).to.be.true
                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]).to.be.true
                })

                it('When models are attached in bulk by id relations to all property models should create pivot collections', async () => {

                    const carId = uniqid()

                    const driverId1: string = uniqid()
                    const driverId2: string = uniqid()
                    const driverId3: string = uniqid()
                    
                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachByIdBulk([
                        driverId1,
                        driverId2,
                        driverId3
                    ])

                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.DRIVER]['id']).to.be.equals(driverId1)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.DRIVER]['id']).to.be.equals(driverId2)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.DRIVER]['id']).to.be.equals(driverId3)

                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId1}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId2}`][Stubs.CAR]['id']).to.be.equals(carId)
                    expect(firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId3}`][Stubs.CAR]['id']).to.be.equals(carId)
                })

                it('AttachByIdBulk should not update any collection if id array is empty', async () => {
                    const carId = uniqid()
                    
                    const car = new Car(firestoreStub.get(), null, carId)

                    await car.drivers().attachByIdBulk([])

                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`]).to.not.exist
                })

                it('When attaching models in bulk by id to another model writing data directly to the relation on the Properties to the Owner should be possible', async () => {

                    const carId     = uniqid()

                    const driverId1  = uniqid()
                    const driverId2  = uniqid()
                    const driverId3  = uniqid()

                    const car = new Car(firestoreStub.get(), null, carId)
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

                    const carRelations1 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

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

                    const car = new Car(firestoreStub.get(), null, carId)

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

                    const driverRelations1 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

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

                    const car = new Car(firestoreStub.get(), null, carId)
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

                    const carRelations1 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId1}`][`${Stubs.CAR}`][carId]
                    const carRelations2 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId2}`][`${Stubs.CAR}`][carId]
                    const carRelations3 = firestoreStub.data()[`${Stubs.DRIVER}/${driverId3}`][`${Stubs.CAR}`][carId]

                    const expectedCarRelation = {
                        name : carName
                    }

                    expect(carRelations1).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations2).to.be.deep.equal(expectedCarRelation)
                    expect(carRelations3).to.be.deep.equal(expectedCarRelation)

                    const driverRelations1 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId1]
                    const driverRelations2 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId2]
                    const driverRelations3 = firestoreStub.data()[`${Stubs.CAR}/${carId}`][Stubs.DRIVER][driverId3]

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

                describe('Cache Layer', () => {
 
                    const cachedField = 'cahcedFieldStub'
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.haveMany(Stubs.DRIVER)
                                    .defineCachableFields([
                                        cachedField
                                    ])
                        }
                    }

                    class CarPivotCache extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.haveMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(firestoreStub.get(), null, carId)
                    const carPivotCache = new CarPivotCache(firestoreStub.get(), null, carId)
                    
                    beforeEach(() => {
                        firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                            [Stubs.DRIVER] : {
                                [driverId] : true
                            }
                        }

                        firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                            [Stubs.CAR] : {
                                [carId] : true
                            }
                        }
                    })

                    describe('From owner to property model', () => {

                        it('Fields to be cached should be definable on the relation between the owner and the property', async () => {
    
                            class Many2ManyRelationStub extends Many2ManyRelation
                            {
                                constructor(owner: ModelImpl, propertyModelName: string, _db: any)
                                {
                                    super(owner, propertyModelName, _db)
                                }

                                getCachableFields()
                                {
                                    return this.cacheOnToProperty
                                }
                            }
    
                            const rel = new Many2ManyRelationStub(car, Stubs.DRIVER, firestoreStub.get())
    
                            const cachedToProperty = [
                                'brand',
                                'year'
                            ]

                            rel.defineCachableFields(cachedToProperty)
   
                            const cache = rel.getCachableFields()
   
                            expect(cachedToProperty).to.be.equal(cache)
                        })
   
                        it('Fields defined as cachable should be cached when new field is added', async () => {
                            
                            const before = test.firestore.makeDocumentSnapshot({}, '')
    
                            const data = {
                                [cachedField] : 'Mustang'
                            }
    
                            const after = test.firestore.makeDocumentSnapshot(data, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await car.drivers().updateCache(change)
    
                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : {
                                        [cachedField] : data[cachedField]
                                    }
                                }
                            }
    
                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
                        })

                        it('Fields defined as cachable should be cached on field update', async () => {

                            const beforeData = {
                                [cachedField] : false
                            }

                            const before = test.firestore.makeDocumentSnapshot(beforeData, '')

                            const afterData = {
                                [cachedField] : true
                            }

                            const after = test.firestore.makeDocumentSnapshot(afterData, '')

                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                            await car.drivers().updateCache(change)

                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : afterData
                                }
                            }

                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
                        })

                        it('When fields defined are cachable is deleted the cached data should be deleted', async () => {

                            const data = {
                                [cachedField] : 'Mustang'
                            }

                            firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                                [Stubs.CAR] : {
                                    [carId] : data
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(data, '')
                            const after = test.firestore.makeDocumentSnapshot({}, '')
    
                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : data
                                }
                            }
    
                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await car.drivers().updateCache(change)
                            
                            const cachedData = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId][cachedField]

                            expect(cachedData).to.be.undefined
                        })

                        it('When the nested field of origin is deleted the cached field should be deleted', async () => {
                            
                            const dataBefore = {
                                [cachedField] : {
                                    marts : true,
                                    april : true
                                }
                            }
    
                            const dataAfter = {
                                [cachedField] : {
                                    marts : true,
                                }
                            }

                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
    
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await car.drivers().updateCache(change)
    
                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : dataAfter
                                }
                            }

                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
                          
                            expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId].name)
                                .to.be.undefined
                        })

                        it('Should handle if one nested field is updated and another is deleted', async () => {
                            
                            const dataBefore = {
                                [cachedField] : {
                                    marts : true,
                                    april : true
                                }
                            }
    
                            const dataAfter = {
                                [cachedField] : {
                                    marts : false,
                                }
                            }

                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
    
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await car.drivers().updateCache(change)
    
                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : dataAfter
                                }
                            }

                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
                        })

                        it('Cached fields should not be updated if no changes has happend to origin', async () => {
                            
                            const dataBefore = {
                                [cachedField] : 'Mustang'
                            }

                            const dataAfter = {
                                [cachedField] : 'Mustang',
                                'repaired' : true
                            }

                            firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                                [Stubs.CAR] : {
                                    [carId] : dataBefore
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await car.drivers().updateCache(change)
    
                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : dataBefore
                                }
                            }

                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
                        })

                        describe('Secure', () => {

                            class CarS extends Car {
                                drivers(): Many2ManyRelation
                                {
                                    return this.haveMany(Stubs.DRIVER)
                                            .defineCachableFields([
                                                cachedField + Models.SECURE_SURFIX
                                            ])
                                }
                            }

                            const carS = new CarS(firestoreStub.get(), null, carId)

                            it('Fields defined as cachable should be cached when new field is added (SECURE)', async () => {
    
        
                                firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`] = {}
        
                                const before = test.firestore.makeDocumentSnapshot({}, '')
        
                                const data = {
                                    [cachedField] : 'Mustang'
                                }
        
                                const after = test.firestore.makeDocumentSnapshot(data, '')
        
                                const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                                await carS.drivers().updateCache(change)
        
                                const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`]
                                const expectedDriverDoc = {
                                    [Stubs.CAR] : {
                                        [carId] : {
                                            [cachedField] : data[cachedField]
                                        }
                                    }
                                }
    
                                expect(driverDoc).to.deep.equal(expectedDriverDoc)
                            })
    
                            it('When fields defined are cachable is deleted the cached data should be deleted (SECURE)', async () => {
    
                                const data = {
                                    [cachedField] : 'Mustang'
                                }
    
                                firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`] = {
                                    [Stubs.CAR] : {
                                        [carId] : data
                                    }
                                }
    
                                const before = test.firestore.makeDocumentSnapshot(data, '')
                                const after = test.firestore.makeDocumentSnapshot({}, '')
        
                                const secureDriverDoc = firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`]
                                const expectedSecureDriverDoc = {
                                    [Stubs.CAR] : {
                                        [carId] : {
                                            [cachedField] : data[cachedField]
                                        }
                                    }
                                }
        
                                expect(secureDriverDoc).to.deep.equal(expectedSecureDriverDoc)
        
                                const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                                await carS.drivers().updateCache(change)
        
                                const secureCachedField = secureDriverDoc[Stubs.CAR][carId][cachedField]
    
                                expect(secureCachedField).to.be.undefined
                            })
    
                            it('When the nested field of origin is deleted the cached field should be deleted (SECURE)', async () => {
                                
                                const dataBefore = {
                                    [cachedField] : {
                                        marts : true,
                                        april : true
                                    }
                                }
                                
                                firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`] = {
                                    [Stubs.CAR] : {
                                        [carId] : dataBefore
                                    }
                                }
        
                                const dataAfter = {
                                    [cachedField] : {
                                        marts : true
                                    }
                                }
    
                                const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
        
                                const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
        
                                const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                                await carS.drivers().updateCache(change)
        
                                const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`]
                                const expectedDriverDoc = {
                                    [Stubs.CAR] : {
                                        [carId] : dataAfter
                                    }
                                }
    
                                expect(driverDoc).to.deep.equal(expectedDriverDoc)
                            })

                            it('Cache layer should handle if one nested field is updated and another is deleted (SECURE)', async () => {
                            
                                const dataBefore = {
                                    [cachedField] : {
                                        marts : true,
                                        april : true
                                    }
                                }
    
                                firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`] = {
                                    [`${Stubs.CAR}`] : {
                                        [carId] : dataBefore
                                    }
                                }
        
                                const dataAfter = {
                                    [cachedField] : {
                                        marts : false,
                                    }
                                }
    
                                const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
        
                                const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
        
                                const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                                await carS.drivers().updateCache(change)
        
                                const secureDriverDoc = firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`]
                                const expectedSecureDriverDoc = {
                                    [Stubs.CAR] : {
                                        [carId] : dataAfter
                                    }
                                }
    
                                expect(secureDriverDoc).to.deep.equal(expectedSecureDriverDoc)
                            })
                            
                            it('Cached fields should not be updated if no changes has happend to origin (SECURE)', async () => {
    
                                const dataBefore = {
                                    [cachedField] : 'Mustang'
                                }
    
                                const dataAfter = {
                                    [cachedField] : 'Mustang',
                                    'repaired' : true
                                }
    
                                firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`] = {
                                    [Stubs.CAR] : {
                                        [carId] : dataBefore
                                    }
                                }
        
                                const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
                                const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
        
                                const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
        
                                await carS.drivers().updateCache(change)
        
                                const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}${Models.SECURE_SURFIX}/${driverId}`]
                                const expectedDriverDoc = {
                                    [Stubs.CAR] : {
                                        [carId] : dataBefore
                                    }
                                }
    
                                expect(driverDoc).to.deep.equal(expectedDriverDoc)
                            })
                        })
                    })
                    
                    describe('From pivot to owner model', () => {
                        
                        it('Fields to be cached should be definable on the relation between the owner and the property', async () => {

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
    
                            const rel = new Many2ManyRelationStub(car, Stubs.DRIVER, firestoreStub.get())
    
                            const cachedFromPivot = [
                                'brand',
                                'year'
                            ]
    
                            rel.defineCachableFields(null, cachedFromPivot)
    
                            const cache = rel.getCachableFields()
    
                            expect(cachedFromPivot).to.be.equal(cache)
                        })

                        it('Fields defined as cachable should be cached when new field is added', async () => {

                            const before = test.firestore.makeDocumentSnapshot({}, '')

                            const afterData = {
                                [Relations.PIVOT] : {
                                    [cachedField] : true
                                }
                            }

                            const after = test.firestore.makeDocumentSnapshot(afterData, '')

                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                            await carPivotCache.drivers().updateCache(change)

                            const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
                            const expectedCarDoc = {
                                [Stubs.DRIVER] : {
                                    [driverId] : afterData
                                }
                            }

                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })

                        it('Fields defined as cachable should be cached on field update', async () => {

                            const beforeData = {
                                [Relations.PIVOT] : {
                                    [cachedField] : false
                                }
                            }

                            const before = test.firestore.makeDocumentSnapshot(beforeData, '')

                            const afterData = {
                                [Relations.PIVOT] : {
                                    [cachedField] : true
                                }
                            }

                            const after = test.firestore.makeDocumentSnapshot(afterData, '')

                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                            await carPivotCache.drivers().updateCache(change)

                            const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
                            const expectedCarDoc = {
                                [Stubs.DRIVER] : {
                                    [driverId] : afterData
                                }
                            }

                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })

                        it('When fields defined are cachable is deleted the cached data should be deleted', async () => {

                            const beforeData = {
                                [Relations.PIVOT] : {
                                    [cachedField] : true
                                }
                            }

                            firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                                [Stubs.CAR] : {
                                    [carId] : beforeData
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(beforeData, '')
                            const after = test.firestore.makeDocumentSnapshot({}, '')
    
                            const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                            const expectedDriverDoc = {
                                [Stubs.CAR] : {
                                    [carId] : beforeData
                                }
                            }
    
                            expect(driverDoc).to.deep.equal(expectedDriverDoc)
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await carPivotCache.drivers().updateCache(change)
                            
                            const cachedData = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId][cachedField]

                            expect(cachedData).to.be.undefined
                        })

                        it('When the nested field of origin is deleted the cached field should be deleted', async () => {
                             
                            const dataBefore = {
                                [Relations.PIVOT] : {
                                    [cachedField] : {
                                        marts : true,
                                        april : true
                                    }
                                }
                            }
    
                            const dataAfter = {
                                [Relations.PIVOT] : {
                                    [cachedField] : {
                                        marts : true
                                    }
                                }
                            }

                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
    
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await carPivotCache.drivers().updateCache(change)
    
                            const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
                            const expectedCarDoc = {
                                [Stubs.DRIVER] : {
                                    [driverId] : dataAfter
                                }
                            }

                            expect(carDoc).to.deep.equal(expectedCarDoc)
                          
                            expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`][Stubs.CAR][carId].name)
                                .to.be.undefined
                        })

                        it('Should handle if one nested field is updated and another is deleted', async () => {
                            
                            const dataBefore = {
                                [Relations.PIVOT] : {
                                    [cachedField] : {
                                        marts : true,
                                        april : true
                                    }
                                }
                            }
    
                            const dataAfter = {
                                [Relations.PIVOT] : {
                                    [cachedField] : {
                                        marts : false,
                                    }
                                }
                            }

                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
    
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await carPivotCache.drivers().updateCache(change)
    
                            const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
                            const expectedCarDoc = {
                                [Stubs.DRIVER] : {
                                    [driverId] : dataAfter
                                }
                            }

                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })

                        it('Cached fields should not be updated if no changes has happend to origin', async () => {
                            
                            const dataBefore = {
                                [Relations.PIVOT] : {
                                    [cachedField] : 'Mustang'
                                }
                            }

                            const dataAfter = {
                                [Relations.PIVOT] : {
                                    [cachedField] : 'Mustang',
                                    'repaired' : true
                                }
                            }

                            firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                                [Stubs.CAR] : {
                                    [carId] : dataBefore
                                }
                            }
    
                            const before = test.firestore.makeDocumentSnapshot(dataBefore, '')
                            const after = test.firestore.makeDocumentSnapshot(dataAfter, '')
    
                            const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)
    
                            await carPivotCache.drivers().updateCache(change)
    
                            const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
                            const expectedCarDoc = {
                                [Stubs.DRIVER] : {
                                    [driverId] : dataBefore
                                }
                            }

                            expect(carDoc).to.deep.equal(expectedCarDoc)
                        })
                    })
                })

                it('GetName of Pivot model should return a correct formatted name', async () => {
         
                    const driver = new Driver(firestoreStub.get())
                    const car = new Car(firestoreStub.get())
                    
                    const pivotId = `${car.getId()}_${driver.getId()}`

                    const pivot = new Pivot(firestoreStub.get(), pivotId, car, driver)
    
                    expect(pivot.getName()).to.be.equal(`${Stubs.CAR}_${Stubs.DRIVER}`)
                })
               
                it('GetId of pivot model should return a correct formatted id', async () => {
    
                    const driver = new Driver(firestoreStub.get())
                    const car = new Car(firestoreStub.get())
    
                    const pivotId = `${car.getId()}_${driver.getId()}`

                    const pivot = new Pivot(firestoreStub.get(), pivotId, car, driver)
    
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

                    const driver = new Driver(firestoreStub.get(), null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.haveMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(firestoreStub.get(), null, carId)

                    await car.drivers().attach(driver)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(firestoreStub.get(), pivotId, car, driver)

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

                    const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
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
                            return this.haveMany(Stubs.CAR)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const driverId = uniqid()
                    const driver = new DriverM(firestoreStub.get(), null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.haveMany(Stubs.DRIVER)
                                    .defineCachableFields(null, [
                                        cachedField
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const car = new CarM(firestoreStub.get(), null, carId)

                    await car.drivers().attach(driver)
                    await driver.cars().attach(car)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(firestoreStub.get(), pivotId, car, driver)

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

                    const carDoc = firestoreStub.data()[`${Stubs.CAR}/${carId}`]
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

                    const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
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

                    const driver = new Driver(firestoreStub.get(), null, driverId)
                    
                    class CarM extends Car {
                        drivers(): Many2ManyRelation
                        {
                            return this.haveMany(Stubs.DRIVER)
                                    .defineCachableFields([
                                        'model'
                                    ], [
                                        cachedField
                                    ])
                        }
                    }

                    const car = new CarM(firestoreStub.get(), null, carId)

                    await car.drivers().attach(driver)

                    const pivotId = `${carId}_${driverId}`

                    const pivot = new Pivot(firestoreStub.get(), pivotId, car, driver)

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

                    const carDoc = firestoreStub.data()[`${car.name}/${carId}`]
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
                            return this.haveMany(Stubs.DRIVER)
                                    .defineCachableFields([
                                        cacheField
                                    ], [
                                        'crashes'
                                    ])
                        }
                    }

                    const carId = uniqid()
                    const driverId = uniqid()

                    const car = new CarM(firestoreStub.get(), null, carId)
                    const driver = new Driver(firestoreStub.get(), null, driverId)

                    await car.drivers().attach(driver)

                    const before = test.firestore.makeDocumentSnapshot({}, '')

                    const data = {
                        [cacheField] : 'Mustang'
                    }

                    const after = test.firestore.makeDocumentSnapshot(data, '')

                    const change = new Change<FirebaseFirestore.DocumentSnapshot>(before, after)

                    await car.drivers().updateCache(change)

                    const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
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

                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }
                    
                    firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true
                        }
                    }

                    const car = new Car(firestoreStub.get(), null, carId)
                    const drivers = await car.drivers().get() as Array<Driver>
                    
                    expect(drivers[0].getId()).to.be.equal(driverId)

                    await car.drivers().detach()

                    const drivers2 = await car.drivers().get() as Array<Driver>
                    
                    expect(drivers2[0]).to.not.exist
                    expect(firestoreStub.data()[`${Stubs.CAR}/${carId}`]).to.be.empty
                })

                it('When properties are detached from the owner, the relations link on the properties should be deleteted', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()

                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }
                    
                    firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true
                        }
                    }

                    const car = new Car(firestoreStub.get(), null, carId)
                    const drivers = await car.drivers().get() as Array<Driver>
                    
                    const cars = await drivers[0].cars().get() as Array<Car>
                    
                    const carIds = cars.map((c: Car) => {
                        return c.getId()
                    })

                    expect(carIds).to.include(carId)

                    await car.drivers().detach()

                    const cars2 = await drivers[0].cars().get() as Array<Car>

                    expect(cars2[0]).to.not.exist

                    const driverDoc = firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]
                    const expectedDriverDoc = {
                        [Stubs.CAR] : {}
                    }

                    expect(driverDoc).to.be.deep.equal(expectedDriverDoc)
                })

                it('When properties are detached from the owner, the pivot collection should be deleteted', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()

                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`] = {
                        [Stubs.DRIVER] : {
                            id : driverId
                        },
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }
                    
                    firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true
                        }
                    }

                    const car = new Car(firestoreStub.get(), null, carId)
                    
                    const pivot = await car.drivers().pivot(driverId)

                    expect(pivot.getId()).to.be.equal(`${carId}_${driverId}`)

                    await car.drivers().detach()

                    const pivot2 = await car.drivers().pivot(driverId)

                    const pivotDoc = firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`]

                    expect(pivot2).to.not.exist
                    expect(pivotDoc).to.not.exist
                })

                it('When properties are detached from the owner, the owner link should be removed from the properties', async () => {
                    const driverId = uniqid()
                    const carId = uniqid()
                    const carId2 = uniqid()

                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true,
                            [carId2] : true
                        }
                    }

                    const car = new Car(firestoreStub.get(), null, carId)
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

                    expect(firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`]).to.not.be.empty
                })

                it('When properties are detached from the owner, the pivot collection related to properties and owner should be deleteted', async () => {
                    const driverId  = uniqid()
                    const carId     = uniqid()
                    const carId2    = uniqid()

                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreStub.data()[`${Stubs.CAR}/${carId2}`] = {
                        [Stubs.DRIVER] : {
                            [driverId] : true
                        }
                    }

                    firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`] = {
                        [Stubs.DRIVER] : {
                            id : driverId
                        },
                        [Stubs.CAR] : {
                            id : carId
                        }
                    }

                    firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId2}_${driverId}`] = {
                        [Stubs.DRIVER] : {
                            id : driverId
                        },
                        [Stubs.CAR] : {
                            id : carId2
                        }
                    }
                    
                    firestoreStub.data()[`${Stubs.DRIVER}/${driverId}`] = {
                        [Stubs.CAR] : {
                            [carId] : true,
                            [carId2] : true
                        }
                    }

                    const car = new Car(firestoreStub.get(), null, carId)
                    
                    const pivot = await car.drivers().pivot(driverId)

                    expect(pivot.getId()).to.be.equal(`${carId}_${driverId}`)

                    await car.drivers().detach()

                    const pivot2 = await car.drivers().pivot(driverId)

                    expect(pivot2).to.not.exist

                    const pivotDoc = firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId}_${driverId}`]
                    expect(pivotDoc).to.not.exist

                    const pivotDoc2 = firestoreStub.data()[`${Stubs.CAR}_${Stubs.DRIVER}/${carId2}_${driverId}`]
                    expect(pivotDoc2).to.exist
                })
            })
        })
    })
})