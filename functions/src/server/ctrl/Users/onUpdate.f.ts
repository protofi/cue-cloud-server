import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';

exports = module.exports = functions.firestore.document('users/{userId}').onUpdate((change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {
    
    const adminFs = admin.firestore()
    const db = new DataORMImpl(adminFs)
    
    const newValue = change.after.data();
    const previousValue = change.before.data();

    // db.user(change.after.id).household().updateCache(previousValue, newValue)    

    console.log(newValue)
    console.log(previousValue)

    return change.after.ref.update({
        name_change_count: 6
    });
})