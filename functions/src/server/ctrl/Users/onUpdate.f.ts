import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';

exports = module.exports = functions.firestore.document('users/{userId}')
    .onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {
    
    const adminFs = admin.firestore()
    const db = new DataORMImpl(adminFs)
    
    return db.user(null, change.after.id)
                .household()
                .updateCache(change)
})