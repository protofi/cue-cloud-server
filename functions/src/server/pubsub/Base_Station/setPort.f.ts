import { pubsub, EventContext } from 'firebase-functions'
import { kebabCase } from 'lodash'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import { basename } from 'path'
import { Errors } from '../../lib/const';
import BaseStation from '../../lib/ORM/Models/BaseStation';

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub.topic(topicName)
.onPublish(async (message: pubsub.Message, context: EventContext) => {

    const db = new DataORMImpl(admin.firestore())

    const baseStationUUID = message.attributes.base_station_UUID
    const baseStationPort = message.attributes.base_station_port
    
    if(!baseStationUUID || !baseStationPort)
        throw new Error(Errors.DATA_MISSING)

    const portRegexPattern = RegExp('^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$') // matches a number between 0 and 65535

    if(!portRegexPattern.test(baseStationPort))
        throw new Error(Errors.DATA_VALIATION_ERROR)

    const baseStation = await db.baseStation().findOrFail(baseStationUUID)

    return baseStation.update({
        [BaseStation.f.WEBSOCKET._] : {
            [BaseStation.f.WEBSOCKET.PORT] : baseStationPort
        }
    })
})