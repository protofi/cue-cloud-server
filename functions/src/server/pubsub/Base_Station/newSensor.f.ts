import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Household from '../../lib/ORM/Models/Household'
import BaseStation from '../../lib/ORM/Models/BaseStation'
import { Errors } from '../../lib/const'

import { kebabCase } from 'lodash'
import { basename } from 'path'

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = functions.pubsub
.topic(topicName)
.onPublish(async (message: functions.pubsub.Message, context: functions.EventContext) => {

    const db = new DataORMImpl(admin.firestore())

    const decodePayload = Buffer.from(message.data, 'base64').toString('ascii')
    const payload = JSON.parse(decodePayload)

    const baseStationUUID   = message.attributes.deviceId
    const sensorUUID        = payload.sensor_UUID

    if(!sensorUUID) throw Error(Errors.NO_SENSOR_UUID)

    const baseStation = await db.baseStation().findOrFail(baseStationUUID) as BaseStation

    const household = await baseStation.household().get() as Household
   
    if(!household) throw Error(Errors.BASE_STATION_NOT_CLAIMED)

    const sensor = await db.sensor(null, sensorUUID)

    return household.sensors().attach(sensor)
})