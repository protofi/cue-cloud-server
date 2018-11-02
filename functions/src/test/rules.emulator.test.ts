import * as chai from 'chai'
import * as sinon from 'sinon'
import * as mocha from 'mocha'
import * as firestore from '@firebase/testing'
import * as fs from 'fs'

const chaiThings = require("chai-things")
const chaiAsPromised = require("chai-as-promised")

chai.should()
chai.use(chaiThings)
chai.use(chaiAsPromised)

const assert = chai.assert
const expect = chai.expect

describe.only('OFFLINE', () => {

    let db: firebase.firestore.Firestore

    before(async () => {
        const projectId = `test-app-${Date.now()}`

        const app = firestore.initializeTestApp({
            projectId : projectId     
        })
        
        db = app.firestore()

        const data = {}

        for(const key in data)
        {
            const ref = db.doc(key)
            await ref.set(data[key])
        }

        await firestore.loadFirestoreRules({
            projectId: projectId,
            rules: fs.readFileSync('./../firestore.rules', 'utf8')
        })
    })

    after(async () => {
        Promise.all(firestore.apps().map(app => app.delete()))
    })

    describe('Emulated Rules', () => {
        it('Writes to a random collection should fail', async () => {

            const ref = db.collection('random-collection')
            expect(await firestore.assertFails(ref.doc().set({})))
        })
    })
})