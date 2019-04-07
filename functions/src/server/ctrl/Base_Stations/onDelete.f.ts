import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import * as logger from 'loglevel'
import BaseStation from '../../lib/ORM/Models/BaseStation';

exports = module.exports = functions.firestore
.document(`${Models.BASE_STATION}/{baseStationId}`)
.onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const baseStation: BaseStation = db.baseStation(snap)

        await Promise.all([

            baseStation.onDelete(),
            baseStation.household().unset()

        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})