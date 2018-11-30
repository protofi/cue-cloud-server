import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import User from '../../lib/ORM/Models/User'

exports = module.exports = functions.firestore
.document(`${Models.USER}/{userId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {
    
    let user: User

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        user = db.user(docSnap)
    }
    catch(e)
    {
        console.error(e)
        return
    }

    return Promise.all([

        user.takeActionOn(change),

        user.sensors().updateCache(change),

        user.household().updateCache(change),
        user.household().takeActionOn(change),

    ]).catch(console.error)
})