import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor';
import * as logger from 'fancy-log'

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}/{sensorId}`)
.onUpdate( async (change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context) => {

    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const docSnap = change.after
        const sensor: Sensor = db.sensor(docSnap)
  
        await Promise.all([

            sensor.takeActionOn(change),
            sensor.household().updateCache(change),
            
        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})