import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firebase from 'firebase'
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test'
import { UserRecord, user } from 'firebase-functions/lib/providers/auth';
import { FeaturesList } from 'firebase-functions-test/lib/features';
import { Collection } from './lib/database/Collections';
import { DocumentSnapshot } from 'firebase-functions/lib/providers/firestore';
import { asyncForEach } from './lib/util';
import DataORMImpl, { DataORM } from './lib/ORM';
import ModelImp, { Models, Model } from './lib/ORM/Model';

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
    var db: DataORM

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

        const usersToBeDeleted = []

        afterEach(async () => {
            asyncForEach(usersToBeDeleted, async (id: string ) => {
                const u = await db.users().find(id)
                await u.delete()
            })
        })

        describe('CRUD', () => {

            it('Create doc new ref.', async () => {
                const docRef: FirebaseFirestore.DocumentReference = db.users().getDocRef()
                expect(docRef).exist
                expect(docRef.id).exist
                expect(docRef.path).exist

                expect(docRef.path).to.equals(`${Models.USER}/${docRef.id}`)
            })

            it('Create doc new ref with certain id.', async () => {
                const id: string = '123';

                const docRef: FirebaseFirestore.DocumentReference = db.users().getDocRef(id)
                expect(docRef).exist
                expect(docRef.id).to.equals(id)
                expect(docRef.path).exist

                expect(docRef.path).to.equals(`${Models.USER}/${id}`)
            })

            it('Get ref returns the same ref after initialization.', async () => {
                const user1: ModelImp = db.users()
                const docRef1: FirebaseFirestore.DocumentReference = user1.getDocRef()
                const docRef2: FirebaseFirestore.DocumentReference = user1.getDocRef()

                expect(docRef1.id).to.equals(docRef2.id)
            })

            it('Get ID of new Model.', async () => {
                const user1: ModelImp = db.users()
                const id: string = user1.getId()

                expect(id).exist
            })

            it('Get ID of created docRef.', async () => {
                const user1: ModelImp = await db.users().create({
                    name : 'Tob'
                })

                const id: string = user1.getId()
                
                usersToBeDeleted.push(id)
                
                expect(id).exist
            })

            it('Create.', async () => {

                const u: ModelImp = db.users()
                await u.create({
                    name: 'Bob'
                })

                usersToBeDeleted.push(u.getId())

                const name: string = await u.getField('name')
                expect(name).to.equals('Bob')
            })

            it('Retrieve certain model.', async () => {
                const u: ModelImp = await db.users().create({
                    name: 'Bob'
                })

                const uid = u.getId()
                
                usersToBeDeleted.push(uid)

                const u2: ModelImp = await db.users().find(uid)
                const name = await u2.getField('name')

                expect(name).equals('Bob')
            })

            it('Retrieve certain data not existing.', async () => {
                const u: ModelImp = await db.users().create({
                    name: 'Bob'
                })

                const age = await u.getField('age')

                usersToBeDeleted.push(u.getId())

                expect(age).to.not.exist
            })

            it('Update.', async () => {
                const u: ModelImp = db.users()

                await u.create({
                    name: 'Bobby'
                })

                await u.update({
                    age: 28
                })

                const name = await u.getField('name')
                const age = await u.getField('age')

                usersToBeDeleted.push(u.getId())

                expect(name).equals('Bobby')
                expect(age).equals(28)
            })

            it('Delete.', async () => {

                const u: ModelImp = db.users()

                await u.create({
                    name: 'Bobby'
                })

                await u.update({
                    age: 28
                })

                const id = await u.getId()
                const name = await u.getField('name')
                const age = await u.getField('age')

                usersToBeDeleted.push(u.getId())

                expect(name).equals('Bobby')
                expect(age).equals(28)

                await u.delete()

                await u.find(id)
                const age2 = await u.getField('age')
                
                expect(age2).to.not.exist
            }).timeout(4000)
        })
    })
})