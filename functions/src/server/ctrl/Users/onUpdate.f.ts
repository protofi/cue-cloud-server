import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import User from '../../lib/ORM/Models/User'
import * as logger from 'fancy-log'

exports = module.exports = functions.firestore
.document(`${Models.USER}/{userId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {
    
    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        const user: User = db.user(docSnap)

        await Promise.all([

            user.takeActionOn(change),

            user.sensors().updateCache(change),

            user.household().updateCache(change),
            user.household().takeActionOn(change),

        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})