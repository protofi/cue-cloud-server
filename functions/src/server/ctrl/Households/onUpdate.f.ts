import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import Household from '../../lib/ORM/Models/Household';
import * as logger from 'loglevel'

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {

    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        const household: Household = db.household(docSnap)
  
        await Promise.all([

            household.sensors().takeActionOn(change)
            
        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})