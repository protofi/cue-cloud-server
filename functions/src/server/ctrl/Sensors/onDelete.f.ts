import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import { firestore } from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor';
import * as logger from 'loglevel'

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}/{sensorId}`)
.onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const sensor: Sensor = db.sensor(snap)

        await Promise.all([

            sensor.onDelete(),
            sensor.users().detach(),
            sensor.household().unset()

        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})