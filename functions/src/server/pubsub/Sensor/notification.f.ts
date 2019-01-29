import { pubsub } from 'firebase-functions'
import { firestore, messaging} from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor'
import { Models } from '../../lib/ORM/Models';
import { forOwn, capitalize, isEmpty } from "lodash"
import { Errors, Env, WhereFilterOP } from '../../lib/const';
import User from '../../lib/ORM/Models/User';

exports = module.exports = pubsub
.topic('notification').onPublish(async (message: pubsub.Message) => {

    try{
		const db = new DataORMImpl(firestore())

		const sensorUUID = message.attributes.sensor_UUID

		const sensorQuery = await db.sensor().where(Sensor.f.UUID, WhereFilterOP.EQUAL, sensorUUID).get()

		if(sensorQuery.empty) throw Error(Errors.MODEL_NOT_FOUND)
		if(sensorQuery.size > 1) throw Error(Errors.GENERAL_ERROR)
		
		const sensorSnap: firestore.QueryDocumentSnapshot = sensorQuery.docs[0]

		const sensor: Sensor = db.sensor(sensorSnap)

		const users = await sensor.secure().getField(Models.USER)

		const iOSTokens = []
		const androidTokens = []

		forOwn(users, user => {
			if(!user.FCM_tokens) return
			
			const sensorIsMuted = (user.pivot && user.pivot.muted)
			if(sensorIsMuted) return

			forOwn(user.FCM_tokens, ({context}, token) => {

				if(context === User.f.CONTEXT.IOS)
					iOSTokens.push(token)
				
				if(context === User.f.CONTEXT.ANDROID)
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
				click_action : 'FLUTTER_NOTIFICATION_CLICK'
			}
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

		const messengers = []

		if(!isEmpty(iOSTokens))
			messengers.push(messaging().sendToDevice(
				iOSTokens,
				iOSPayload
			))

		if(!isEmpty(androidTokens))
			messengers.push(messaging().sendToDevice(
				androidTokens,
				androidPayload
			))

		return Promise.all(messengers).catch(console.error)
	}
	catch(e)
	{
		if(process.env.GCLOUD_PROJECT !== Env.NOT_A_PROJECT)
			console.error(e)
	}
})