import { pubsub } from 'firebase-functions'
import { firestore, messaging} from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor'
import { Models } from '../../lib/ORM/Models';
import { kebabCase, forOwn, capitalize, isEmpty } from "lodash"
import { Env } from '../../lib/const';
import User from '../../lib/ORM/Models/User';

import { basename } from 'path'

const file = basename(__filename).slice(0, -5)
const ctrl = basename(__dirname)
const topicName = kebabCase(`${ctrl}-${file}`)

exports = module.exports = pubsub
.topic(topicName).onPublish(async (message: pubsub.Message) => {

    try {
		const db = new DataORMImpl(firestore())

		const decodePayload = Buffer.from(message.data, 'base64').toString('ascii')
    	const payload 		= JSON.parse(decodePayload)

		const sensorUUID = payload.sensor_UUID

		const sensor = await db.sensor().findOrFail(sensorUUID)

		const users = await sensor.secure().getField(Models.USER)

		const iOSTokens = []
		const androidTokens = []

		forOwn(users, user => {

			if(!user.FCM_tokens) return
			
			const sensorIsMuted = (user.pivot && user.pivot.muted)
			if(sensorIsMuted) return

			forOwn(user.FCM_tokens, ({context}, token) => {

				if(context === User.f.FCM_TOKENS.CONTEXT.IOS)
					iOSTokens.push(token)
				
				if(context === User.f.FCM_TOKENS.CONTEXT.ANDROID)
					androidTokens.push(token)
			})
		})

		const sensorName		= await sensor.getField(Sensor.f.NAME)
		const sensorVibration	= await sensor.getField(Sensor.f.VIBRATION)
		const sensorLocation 	= await sensor.getField(Sensor.f.LOCATION)

		const notificationTitle = (sensorName && sensorLocation) ? `${sensorName} lyder i ${sensorLocation}` : 'UNCONFIGURED SENSOR'

		const androidPayload = {
			data : {
				sensor_id : sensorUUID,
				vibration : (sensorVibration) ? sensorVibration : '',
				title : capitalize(notificationTitle),
				android_channel_id : (sensorVibration) ? sensorVibration : '',
				click_action : 'FLUTTER_NOTIFICATION_CLICK',
			}
		}

		const iOSPayload = {
			data : {
				sensor_id : sensorUUID,
				title : capitalize(notificationTitle)
			},
			notification : {
				title : capitalize(notificationTitle),
				sound : 'default'
			}
		}

		const promises = []

		promises.push(sensor.update({
			[Sensor.f.EVENT] : true
		}))

		if(!isEmpty(iOSTokens))
			promises.push(messaging().sendToDevice(
				iOSTokens,
				iOSPayload
			))

		if(!isEmpty(androidTokens))
			promises.push(messaging().sendToDevice(
				androidTokens,
				androidPayload
			))

		return Promise.all(promises).catch(console.error)
	}
	catch(error)
	{
		if(process.env.GCLOUD_PROJECT !== Env.NOT_A_PROJECT)
			console.error(error)
	}
})