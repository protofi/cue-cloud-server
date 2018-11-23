import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/'

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}_${Models.USER}/{pivotId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>) => {

    const adminFs = firestore()
    const db = new DataORMImpl(adminFs)

    const path = change.after.ref.path
    const pivot = db.pivot(path)

    return pivot.updateCache(change)
})