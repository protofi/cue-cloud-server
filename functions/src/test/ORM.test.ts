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

        describe('CRUD', () => {

            it('Create.', async () => {

                const m: ModelImp = db.users()
                await m.create({
                    name: 'Bob'
                })

                expect(m).to.exist
            })

            it('Retrieve.', async () => {
                const u: ModelImp = db.users()

                await u.create({
                    name: 'Bob'
                })

                const uid = u.getId()

                const u2: ModelImp = await db.users().find(uid)
                const name = await u2.getField('name')

                expect(name).equals('Bob')
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

                expect(name).equals('Bobby')
                expect(age).equals(28)

                await u.delete()

                await u.find(id)
                const age2 = await u.getField('age')
                
                expect(age2).not.exist
            }).timeout(4000)
        })
    })
})