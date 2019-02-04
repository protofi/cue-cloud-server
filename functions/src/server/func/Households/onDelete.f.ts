import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import DataORMImpl from './../../lib/ORM/'
import { firestore } from 'firebase-admin'
import Household from '../../lib/ORM/Models/Household';

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    let household: Household

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        household = db.household(snap)
    }
    catch(e)
    {
        console.error(e)
        return
    }

    return Promise.all([

        household.onDelete(),
        household.users().detach(),
        household.sensors().detach(),
        household.baseStations().detach()

    ]).catch(console.error)
})