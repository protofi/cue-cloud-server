import { pubsub } from 'firebase-functions'
import { firestore, messaging} from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor'
import { Models } from '../../lib/ORM/Models';
import { forOwn, capitalize, isEmpty } from "lodash"
import { Env } from '../../lib/const';
import User from '../../lib/ORM/Models/User';

exports = module.exports = pubsub
.topic('notification').onPublish(async (message: pubsub.Message) => {

    try{
		const db = new DataORMImpl(firestore())

		const sensorUUID = message.attributes.sensor_UUID

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
		const sensorLocation 	= await sensor.getField(Sensor.f.LOCATION)

		const notificationTitle = (sensorName && sensorLocation) ? `${sensorName} lyder i ${sensorLocation}` : 'UNCONFIGURED SENSOR'

		const androidPayload = {
			data : {
				sensor_id : sensorUUID,
				title : capitalize(notificationTitle),
				android_channel_id : 'distinct vibration',
				click_action : 'FLUTTER_NOTIFICATION_CLICK',
			},
			// notification : {
			// 	title : capitalize(notificationTitle),
			// 	sound : 'default'
			// }
		}

		const iOSPayload = {
			data : {
				sensor_id : sensorUUID,
				title : capitalize(notificationTitle),
				android_channel_id : 'distinct vibration',
				click_action : 'FLUTTER_NOTIFICATION_CLICK',
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
	catch(e)
	{
		if(process.env.GCLOUD_PROJECT !== Env.NOT_A_PROJECT)
			console.error(e)
	}
})