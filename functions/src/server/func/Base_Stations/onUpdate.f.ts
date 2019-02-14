import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import BaseStation from '../../lib/ORM/Models/BaseStation';

exports = module.exports = functions.firestore
.document(`${Models.BASE_STATION}/{baseStationId}`)
.onUpdate((change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {

    let baseStation: BaseStation

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        baseStation = db.baseStation(docSnap)
    }
    catch(e)
    {
        return Promise.reject(e).catch(console.error)
    }

    return Promise.all([

        baseStation.household().takeActionOn(change)

    ]).catch(console.error)
})