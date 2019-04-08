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
        const dbThreshold       = payload[Sensor.f.DB_THRESHOLD]

        if(!sensorId || !dbThreshold)
            throw new Error(Errors.DATA_MISSING)

        const sensor: Sensor = await db.sensor().findOrFail(sensorId) as Sensor

        await sensor.update({
            [Sensor.f.DB_THRESHOLD] : dbThreshold
        })
    }
    catch(error)
    {
        logger.error(error)
    }

    return 
})