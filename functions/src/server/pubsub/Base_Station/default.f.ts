import { pubsub, EventContext } from 'firebase-functions'
import { basename } from 'path'
import { kebabCase } from 'lodash'
import * as logger from 'loglevel'

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub.topic(topicName)
.onPublish(async (message: pubsub.Message, context: EventContext) => {

    console.log('message', message)
    console.log('attributes', message.attributes, message.attributes.deviceId)

    console.log('data', Buffer.from(message.data, 'base64').toString())
    
    console.log('context', context)
})