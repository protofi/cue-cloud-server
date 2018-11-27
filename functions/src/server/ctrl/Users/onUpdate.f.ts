import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'

exports = module.exports = functions.firestore
.document(`${Models.USER}/{userId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>) => {
    
    const adminFs = firestore()
    const db = new DataORMImpl(adminFs)
    
    const docSnap = change.after
    const user = db.user(docSnap)
    
    return Promise.all([
        user.sensors().updateCache(change),
        user.household().updateCache(change)
    ]).catch(console.error)
})