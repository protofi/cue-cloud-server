import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import DataORMImpl from './../../lib/ORM/'
import { firestore } from 'firebase-admin'
import Household from '../../lib/ORM/Models/Household';
import * as logger from 'fancy-log'

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const household: Household = db.household(snap)

        await Promise.all([

            household.onDelete(),
            household.users().detach(),
            household.sensors().detach(),
            household.baseStations().detach()
        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})