import * as functions from 'firebase-functions'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';

exports = module.exports = functions.firestore.document('users/{userId}')
    .onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {
    
    const adminFs = firestore()
    const db = new DataORMImpl(adminFs)
    
    const docSnap = change.after

    return db.user(docSnap)
            .household()
            .updateCache(change)
})