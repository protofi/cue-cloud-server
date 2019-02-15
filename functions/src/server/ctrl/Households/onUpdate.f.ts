import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import Household from '../../lib/ORM/Models/Household';

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onUpdate((change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {

    let household: Household

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        household = db.household(docSnap)
    }
    catch(e)
    {
        return Promise.reject(e).catch(console.error)
    }
  
    return Promise.all([

        household.sensors().takeActionOn(change)
        
    ]).catch(console.error)
})