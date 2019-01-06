import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Household from '../../lib/ORM/Models/Household';
import BaseStation from '../../lib/ORM/Models/BaseStation';

try {admin.initializeApp()} catch(e) {}

exports = module.exports = functions.pubsub
.topic('new-sensor')
.onPublish(async (message: functions.pubsub.Message, context: functions.EventContext) => {

    const db = new DataORMImpl(admin.firestore())

    const baseStationUUID = message.attributes.base_station_UUID
    const sensorUUID = message.attributes.sensor_UUID

    const sensor = await db.sensor().create({
        UUID : sensorUUID
    })

    const baseStation = await db.baseStation().find(baseStationUUID) as BaseStation
   
    const household = await baseStation.household().get() as Household

    return household.sensors().attach(sensor)
})