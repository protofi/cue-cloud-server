import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { FeaturesList } from 'firebase-functions-test/lib/features';

import DataORMImpl from "./lib/ORM"
import { asyncForEach } from './lib/util'
import { User } from './lib/ORM/Models/User';
import { Household } from './lib/ORM/Models/Household';
import ModelImpl, { RelationModel, Models } from './lib/ORM/Models';

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
            })

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

            it('Related models method should return the same relation every time', async () => {
                const u = db.user() as User

                const households1 = u.households()
                const households2 = u.households()
                
                expect(households1).to.equals(households2)
            })

            it('Create root documents and relation by attaching two models in many to many rel', async () => {
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

            it('Attach pivot data to many-to-many relation', async () => {
                const user = db.user() as User
                const house = db.household() as Household
                const houseId = await house.getId()

                await user.households().attach(house)

                const pivot: ModelImpl = await user.households().pivot(houseId)
                await pivot.update({
                    settings : true
                })
            }).timeout(4000)
        })
    })
})