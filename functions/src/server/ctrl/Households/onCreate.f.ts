import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import DataORMImpl from './../../lib/ORM/'
import { firestore } from 'firebase-admin'
import Household from '../../lib/ORM/Models/Household';

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onCreate((snap: FirebaseFirestore.DocumentSnapshot, context) => {

    let household: Household

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        household = db.household(snap)
    }
    catch(e)
    {
        return Promise.reject(e).catch(console.error)
    }

    return Promise.all([

        household.onCreate()

    ]).catch(console.error)
})