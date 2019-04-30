import { pubsub, EventContext } from 'firebase-functions'
import { kebabCase } from 'lodash'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import { basename } from 'path'
import { Errors } from '../../lib/const';
import Sensor from '../../lib/ORM/Models/Sensor';
import * as logger from 'loglevel'

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub.topic(topicName)
.onPublish(async (message: pubsub.Message, context: EventContext) => {

    try
    {
        const db = new DataORMImpl(admin.firestore())

        const baseStationUUID   = message.attributes.deviceId

        if(!baseStationUUID)
            throw new Error(Errors.DATA_MISSING)

        const decodePayload     = Buffer.from(message.data, 'base64').toString('ascii')
        const payload 		    = JSON.parse(decodePayload)

        const sensorId          = payload[Sensor.f.ID]
        const batteryLevel      = payload[Sensor.f.BAT_LEVEL]
        const signalStrength    = payload[Sensor.f.SIG_STRENGTH]

		const notificationCounter = (payload.notification_counter) ? payload.notification_counter : 0

        if(!sensorId || !batteryLevel || !signalStrength)
            throw new Error(Errors.DATA_MISSING)

        const sensor: Sensor = await db.sensor().findOrFail(sensorId) as Sensor
        
        const timestamp = admin.firestore.Timestamp.now().toDate()

        const lastBeat = `${timestamp.toLocaleDateString("default", {
            timeZone : 'Europe/Berlin'
        })} ${timestamp.toLocaleTimeString("default", {
            timeZone : 'Europe/Berlin'
        })} `

        await sensor.update({
            [Sensor.f.BAT_LEVEL]    : batteryLevel,
            [Sensor.f.SIG_STRENGTH] : signalStrength,
            [Sensor.f.LAST_BEAT]    : lastBeat,
			notification_counter    : notificationCounter

        })
    }
    catch(error)
    {
        logger.error(error)
    }

    return 
})