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

    const baseStationUUID = message.attributes.deviceId
    
    if(!baseStationUUID)
        throw new Error(Errors.DATA_MISSING)
    
    const code = await db.baseStation().generateUniquePin()

    return db.baseStation(null, baseStationUUID).create({
        [BaseStation.f.PIN] : code
    }).catch(console.error)
})