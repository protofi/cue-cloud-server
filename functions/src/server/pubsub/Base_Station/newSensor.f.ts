import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Household from '../../lib/ORM/Models/Household'
import BaseStation from '../../lib/ORM/Models/BaseStation'
import { Errors } from '../../lib/const';
import { Models } from '../../lib/ORM/Models';

try {admin.initializeApp()} catch(e) {}

exports = module.exports = functions.pubsub
.topic('new-sensor')
.onPublish(async (message: functions.pubsub.Message, context: functions.EventContext) => {

    const db = new DataORMImpl(admin.firestore())

    const baseStationUUID   = message.attributes.base_station_UUID
    const sensorUUID        = message.attributes.sensor_UUID

    if(!sensorUUID) throw Error(Errors.NO_SENSOR_UUID)

    const baseStation = await db.baseStation().findOrFail(baseStationUUID) as BaseStation

    const household = await baseStation.household().get() as Household
   
    if(!household) throw Error(Errors.BASE_STATION_NOT_CLAIMED)

    const sensors: FirebaseFirestore.QuerySnapshot = await db.sensor().where('UUID', '==', sensorUUID).get()

    let alreadyExistingSensor: boolean = false

    if(sensors.size > 0)
    {
        sensors.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const householdId: string = doc.get(Models.HOUSEHOLD).id
            
            alreadyExistingSensor = (householdId === household.getId()) ? true : alreadyExistingSensor
        })
    }

    if(alreadyExistingSensor) throw Error(Errors.SENSOR_ALREADY_PAIRED) 

    const sensor = await db.sensor().create({
        UUID : sensorUUID
    })

    return household.sensors().attach(sensor)
})