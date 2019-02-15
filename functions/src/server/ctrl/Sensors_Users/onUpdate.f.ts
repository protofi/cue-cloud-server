import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/'
import { Pivot } from '../../lib/ORM/Relation/Pivot';

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}_${Models.USER}/{pivotId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>) => {

    let pivot: Pivot
    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)

        const path = change.after.ref.path
        pivot = db.pivot(path)
    }
    catch (e)
    {
        return Promise.reject(e).catch(console.error)
    }

    return Promise.all([
    
        pivot.updateCache(change)
    
    ]).catch(console.error)
})