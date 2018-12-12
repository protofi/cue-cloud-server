import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor';

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}/{sensorId}`)
.onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    let sensor: Sensor

    try{
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        sensor = db.sensor(snap)
    }
    catch(e)
    {
        console.error(e)
        return
    }

    return Promise.all([

        sensor.users().detach(),
        sensor.household().unset()

    ]).catch(console.error)
})