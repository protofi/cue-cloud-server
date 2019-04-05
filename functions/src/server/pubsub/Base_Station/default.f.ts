import { pubsub, EventContext } from 'firebase-functions'
import { basename } from 'path'
import { kebabCase } from 'lodash'
import * as logger from 'loglevel'

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub.topic(topicName)
.onPublish(async (message: pubsub.Message, context: EventContext) => {

    logger.info('message', message)
    logger.info('attributes', message.attributes, message.attributes.deviceId)

    logger.info('data', Buffer.from(message.data, 'base64').toString())
    
    logger.info('context', context)
})