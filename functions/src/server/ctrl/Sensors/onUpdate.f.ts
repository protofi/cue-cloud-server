import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor';

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}/{sensorId}`)
.onUpdate(async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {

    let sensor: Sensor

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        sensor = db.sensor(docSnap)
    }
    catch(e)
    {
        console.error(e)
        return
    }
  
    return Promise.all([

        sensor.household().updateCache(change),
        
    ]).catch(console.error)
})