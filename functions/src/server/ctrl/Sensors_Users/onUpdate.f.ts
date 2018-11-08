import * as functions from 'firebase-functions'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';
import { Models } from '../../lib/ORM/Models';
import Pivot from '../../lib/ORM/Models/Pivot';

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}_${Models.USER}/{pivotId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) => {

    const adminFs = firestore()
    const db = new DataORMImpl(adminFs)

    console.log('OI BOI')

    console.log(context.resource.name)
    console.log(change.after.data())
    console.log(change.after.ref)
    console.log(change.after.ref.parent)
    console.log(change.after.ref.path)

    // const pivot = new Pivot([
    //     db.user(),
    //     db.sensor()
    // ], adminFs)

    // return pivot.updateCache(change)

    return Promise.resolve()
})