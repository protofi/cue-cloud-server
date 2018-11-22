import * as functions from 'firebase-functions'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';
import { Models } from '../../lib/ORM/Models';

exports = module.exports = functions.firestore
.document(`${Models.USER}/{userId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>) => {
    
    const adminFs = firestore()
    const db = new DataORMImpl(adminFs)
    
    const docSnap = change.after
    const user = db.user(docSnap)

    try{
        await user.sensors().updateCache(change)
    }
    catch(e)
    {
        console.log(e.message)
    }

    return user.household()
            .updateCache(change)
})