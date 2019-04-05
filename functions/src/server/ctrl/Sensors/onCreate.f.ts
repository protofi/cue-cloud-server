import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import DataORMImpl from './../../lib/ORM/'
import { firestore } from 'firebase-admin'
import Sensor from '../../lib/ORM/Models/Sensor';
import * as logger from 'fancy-log'

exports = module.exports = functions.firestore
.document(`${Models.SENSOR}/{sensorId}`)
.onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    try
    {
        const adminFs = firestore()
        const db = new DataORMImpl(adminFs)
        
        const sensor: Sensor = db.sensor(snap)

        await Promise.all([

            sensor.onCreate(),

        ])
    }
    catch(e)
    {
        logger.error(e)
    }

    return
})