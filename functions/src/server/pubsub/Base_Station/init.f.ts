import { pubsub, EventContext } from 'firebase-functions'
import { kebabCase } from 'lodash'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import { basename } from 'path'
import BaseStation from '../../lib/ORM/Models/BaseStation'
import { Errors } from '../../lib/const';
import randomstring from 'randomstring'

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub.topic(topicName)
.onPublish(async (message: pubsub.Message, context: EventContext) => {

    const db = new DataORMImpl(admin.firestore())

    const baseStationUUID   = message.attributes.base_station_UUID
    
    if(!baseStationUUID)
        throw new Error(Errors.DATA_MISSING)

    // const code = baseStationCode('A0', 5, { exclude: '0Ooil' })

    // const = await db.baseStation().where(BaseStation.f.PIN, '==', code)

    return db.baseStation(null, baseStationUUID).create({})

})