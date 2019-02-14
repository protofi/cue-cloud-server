import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor';

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}/{sensorId}`)
.onUpdate((change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {

    let sensor: Sensor

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        sensor = db.sensor(docSnap)
    }
    catch(e)
    {
        return Promise.reject(e).catch(console.error)
    }
  
    return Promise.all([

        sensor.takeActionOn(change),
        sensor.household().updateCache(change),
        
    ]).catch(console.error)
})