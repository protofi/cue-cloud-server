import { pubsub, EventContext } from 'firebase-functions'
import { kebabCase } from 'lodash'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import { basename } from 'path'
import { Errors } from '../../lib/const';
import BaseStation from '../../lib/ORM/Models/BaseStation';
import Sensor from '../../lib/ORM/Models/Sensor';

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub.topic(topicName)
.onPublish(async (message: pubsub.Message, context: EventContext) => {

    try{

        const db = new DataORMImpl(admin.firestore())

        const baseStationUUID = message.attributes.deviceId

        if(!baseStationUUID)
            throw new Error(Errors.DATA_MISSING)

        const decodePayload = Buffer.from(message.data, 'base64').toString('ascii')
        const payload 		= JSON.parse(decodePayload)

        const sensorId          = payload[Sensor.f.ID]
        const batteryLevel      = payload[Sensor.f.BAT_LEVEL]
        const signalStrength    = payload[Sensor.f.SIG_STRENGTH]
    
        if(!sensorId || !batteryLevel || !signalStrength)
            throw new Error(Errors.DATA_MISSING)

        const sensor = await db.sensor().findOrFail(sensorId) as Sensor
    
        return sensor.update({
            [Sensor.f.BAT_LEVEL]    : batteryLevel,
            [Sensor.f.SIG_STRENGTH] : signalStrength
        }).catch(console.error)
    }
    catch(error)
    {
        return console.error(error)
    }
})