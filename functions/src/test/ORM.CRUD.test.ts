import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as admin from 'firebase-admin'
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features'
import * as uniqid from 'uniqid'

import DataORMImpl from "./lib/ORM"
import * as util from './lib/util'
import ModelImpl, { Models } from './lib/ORM/Models'
import { ActionableFieldCommandStub, Stubs, FirestoreStub } from './stubs'
import { Change } from 'firebase-functions'
import * as _ from 'lodash'
import { Relations } from './lib/const'
import Car from './stubs/Car'
import Wheel from './stubs/Wheel'

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

        describe('CRUD', async () => {

            const carId = uniqid()
            const carPath = `${Stubs.CAR}/${carId}`
            const car = new Car(firestoreStub.get(), null, carId)

            describe('Create', async () => {

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

                    const docRef = car.getDocRef()
            
                    expect(carId).to.equal(docRef.id)
                })

                it('Create model based on doc snap', async () => {
                    const snap = test.firestore.exampleDocumentSnapshot()
            
                    const carM = new Car(firestoreStub.get(), snap)
                    const docRef = carM.getDocRef()
            
                    expect(snap.ref.id).to.equal(docRef.id)
                })

                it('Create should fail if document already exists', async () => {
    
                    firestoreStub.data()[carPath] = {
                        id : carId
                    }

                    let error = null

                    try
                    {
                        await car.create({})
                    }
                    catch(e)
                    {
                        error = e
                    }

                    expect(error).to.not.be.null
                })

                it('Creating a model with data should be possible', async () => {
                    const carName = 'Mustang'
    
                    await car.create({
                        name: carName
                    })
    
                    const carDoc = firestoreStub.data()[carPath]
                    const expectedCarDoc = {
                        name : carName
                    }
    
                    expect(carDoc).to.deep.equals(expectedCarDoc)
                })
    
                it('Creating a model using Batch should be possible', async () => {
                    const carName = 'Mustang'
    
                    const batch = adminFs.batch()
                    const carL = new Car(adminFs, null, carId)
    
                    //Clean up
                    docsToBeDeleted.push(carL.getDocRef().path)
    
                    await carL.create({
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
                    const carName = 'Mustang'
    
                    const batch = adminFs.batch()
                    const carL = new Car(adminFs, null, carId)
    
                    await carL.create({
                        name: carName
                    }, batch)
    
                    const carDoc = await adminFs.collection(Stubs.CAR).doc(carId).get()
    
                    expect(carDoc.exists).to.false
                })
    
                it('If no action is defined invokation of .onCreate should be ignored', async () => {
    
                    const model = new ModelImpl('', firestoreStub.get())
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

                it('onCreate should create a secure data collection if enabled', async () => {
                    class CarS extends Car {
                        hasSecureData = true
                    }

                    const carS = new CarS(firestoreStub.get(), null, carId)
                    await carS.onCreate()

                    const carSecureDoc = firestoreStub.data()[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`]
                    expect(carSecureDoc).to.not.be.undefined
                })

                it('onCreate should not create a secure data collection if not enabled', async () => {

                    await car.onDelete()

                    const carSecureDoc = firestoreStub.data()[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`]

                    expect(carSecureDoc).to.be.undefined
                })
            })

            describe('Read', () => {

                it('Get ref returns the same ref after initialization', async () => {
                    const carM = new Car(firestoreStub.get())
                    const docRef1 = carM.getDocRef()
                    const docRef2 = carM.getDocRef()
    
                    expect(docRef1.id).to.equals(docRef2.id)
                })

                it('it should be possible to retrieve the Id of a model though method getId', async () => {
                    const carM = new Car(firestoreStub.get())
                    const id = carM.getId()
    
                    expect(id).exist
                })

                it('GetId should return the same id a model was created with', async () => {
                    const id = car.getId()
    
                    expect(id).to.be.equal(carId)
                })

                it('Get ID of created docRef', async () => {
                    const carM = await car.create({
                        name : 'Mustang'
                    })
    
                    const carId2 = carM.getId()
                    
                    expect(carId).to.be.equal(carId2)
                })

                it('Method Find should be able to retrive one particular model by id', async () => {
                    const carId2 = uniqid()
    
                    const car2 = await new Car(firestoreStub.get()).find(carId2)
    
                    expect(car2.getId()).to.be.equal(carId2)
                })

                it('Method Find should be able to set the Id of an already instantiated model', async () => {
                    const carM = new Car(firestoreStub.get())
    
                    await carM.find(carId)
    
                    expect(carM.getId()).to.be.equal(carId)
                })

                it('Single data fields on a model should be retrievable through method getField', async () => {
                    const carName = 'Mustang'
    
                    firestoreStub.data()[carPath] = {
                        name : carName
                    }

                    const fetchedName = await car.getField('name')
    
                    expect(carName).to.be.equal(fetchedName)
                })

                it('GetField should return undefined if field does not exist', async () => {
                    let fetchedName

                    try{
                        fetchedName = await car.getField('name')
                    }
                    catch(e){}
    
                    expect(fetchedName).to.be.undefined
                })

                it('If a model is fetch with method find() already existing in the DB the method exists should return true', async () => {
                    firestoreStub.data()[`${Stubs.CAR}/${carId}`] = { id: carId }
    
                    const carM = await new Car(firestoreStub.get()).find(carId)
    
                    expect(await carM.exists()).to.be.true
                })
    
                it('If a model is fetch with method find() not already existing in the DB the method exists should return false', async () => {
    
                    const carM = await new Car(firestoreStub.get()).find(carId)
    
                    expect(await carM.exists()).to.be.false
                })
            })

            describe('Update', () => {

                it('It should be possible to update data on an already existing model', async () => {
                    firestoreStub.data()[carPath] = {
                        name : 'Mustang'
                    }

                    await car.update({
                        name : 'Fiesta'
                    })
    
                    const carDoc = firestoreStub.data()[carPath]
                    const expectedCarDoc = {
                        name : 'Fiesta'
                    }
                    expect(carDoc).to.be.deep.equal(expectedCarDoc)
                })
    
                it('It should be possible to update data on an already existing model in batch', async () => {
    
                    await adminFs.collection(Stubs.CAR).doc(carId).create({
                        name : 'Mustang'
                    })
    
                    const carL = await new Car(adminFs, null, carId)
                    
                    //Clean up
                    docsToBeDeleted.push((carL.getDocRef()).path)
    
                    const batch = adminFs.batch()
    
                    await carL.update({
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
    
                    await adminFs.collection(Stubs.CAR).doc(carId).create({
                        name : 'Mustang'
                    })
    
                    const carL = await new Car(adminFs, null, carId)
                    
                    //Clean up
                    docsToBeDeleted.push((carL.getDocRef()).path)
    
                    const batch = adminFs.batch()
    
                    await carL.update({
                        name : 'Fiesta'
                    }, batch)
    
                    const carDoc = await adminFs.collection(Stubs.CAR).doc(carId).get()
    
                    const expectedCarDocData = {
                        name : 'Mustang'
                    }
                    expect(carDoc.data()).to.be.deep.equal(expectedCarDocData)
                })
            })

            describe('Delete', () => {

                it('It should be possible to delete a model', async () => {
    
                    firestoreStub.data()[carPath] = {
                        name : 'Mustang'
                    }
    
                    await car.delete()
    
                    const carDoc = firestoreStub.data()[carPath]
    
                    expect(carDoc).to.not.exist
                })
                
                it('onDelete should delete secure data collection if enabled', async () => {
                    class CarM extends Car {
                        hasSecureData = true
                    }

                    firestoreStub.data()[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`] = {}

                    const carS = new CarM(firestoreStub.get(), null, carId)

                    await carS.onDelete()

                    const carSecureDoc = firestoreStub.data()[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`]

                    expect(carSecureDoc).to.be.undefined
                })

                it('onDelete should not delete secure data collection if not enabled', async () => {

                    firestoreStub.data()[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`] = {}

                    await car.onDelete()

                    const carSecureDoc = firestoreStub.data()[`${Stubs.CAR}${Models.SECURE_SURFIX}/${carId}`]

                    expect(carSecureDoc).to.be.not.undefined
                })
            })

            it('If a model is instatiated not already existing in the DB the method exists should return false', async () => {
                const carM = new Car(firestoreStub.get())

                expect(await carM.exists()).to.be.false
            })

            it('If a model is instatiated with an ID not already existing in the DB the method exists should return false', async () => {
                const carM = new Car(firestoreStub.get(), null, carId)

                expect(await carM.exists()).to.be.false
            })

            it('If a model is instatiated already existing in the DB the method exists should return true', async () => {

                firestoreStub.data()[`${Stubs.CAR}/${carId}`] = {}

                expect(await car.exists()).to.be.true
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

                    const model = new ModelStub('', firestoreStub.get())

                    model.defineActionableField(actionableField, command)

                    const fieldActions = model.getFieldActions()

                    expect(fieldActions.get(actionableField)).to.not.be.null

                    await fieldActions.get(actionableField).execute(model, 'true')

                    expect(commandSpy.callCount).to.equals(1)
                })
                
                it('TakeActionOn should be able to react to changes when before snap is empty', async () => {

                    const wheelId1 = uniqid()
                    const wheel = new Wheel(firestoreStub.get(), null, wheelId1)

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

                    const model = new Wheel(firestoreStub.get())

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

                    const wheel = new Wheel(firestoreStub.get())
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

                    const wheel = new Wheel(firestoreStub.get())

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
    })
})