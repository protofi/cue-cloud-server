import { pubsub, EventContext} from 'firebase-functions'
import { firestore, messaging} from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor'
import { Models } from '../../lib/ORM/Models';
import { forOwn, capitalize } from "lodash"

exports = module.exports = pubsub
.topic('notification')
.onPublish(async (message: pubsub.Message, context: EventContext) => {
	
    try{
		const db = new DataORMImpl(firestore())

		const sensorId = message.attributes.sensor_id
		const sensor = await db.sensor().find(sensorId) as Sensor

		const sensorSecureData = await db.sensor().secure().find(sensorId)

		const users = await sensorSecureData.getField(Models.USER)

		let FCM_tokens = []

		forOwn(users, user => {
			if(!user.FCM_tokens) return
			
			const sensorIsMuted = (user.pivot && user.pivot.muted)
			if(sensorIsMuted) return

			const tokens = Object.keys(user.FCM_tokens)
			FCM_tokens = FCM_tokens.concat(tokens)
		})

		const sensorName		= await sensor.getField('name')
		const sensorLocation 	= await sensor.getField('location')

		const notificationTitle = (sensorName && sensorLocation) ? `${sensorName} lyder i ${sensorLocation}` : 'UNCONFIGURED SENSOR'
		
		// const iPhone5s  = 'csMFb2ss3j4:APA91bGAXzHdDYgG0eJSESfQb7lL09le08B7rC1Vvls1gPmXaK7NgGmTESnw5R4xWt622SfPjL8K3Q4UHlhsarR5Mr5GDQonoeGhJ8A8p42J1A-CghpEBxgAB0qFW-QyHtHmkdGVRQ7F'
		// const iPhoneX   = 'dZq_yPw0h6E:APA91bGeM4hXNJeMJiwWsX5_gVgjMD5R0oUCZPmJeqvETw4BPh32VsTNvP4sxEfDJSZ4IxcJvjs5KjZ-JM19yx4Ky1YIcXVJGdBjXQ4f96oxiRkA5MKW3O67yu80lQvkcGExwopuSvbt'
		// const Nexus5    = 'fo9CNDze4JM:APA91bGwCyLmPNdID3ur6vZ0dfzVpqj9s1PrTv5SrcEc_5CmJ1rF1PRA7hntHvUhrAStNdjch4YNymzetsQYiaRuyPy9m8gMILhFphSWsSnxTZM2tgn8FtqO47bEWmx59MAbP6CGoZTk'

		const payload = {
			data : {
				sensor_id : sensorId,
				title : capitalize(notificationTitle),
				clickAction : 'FLUTTER_NOTIFICATION_CLICK',
				android_channel_id : 'distinct vibration'
			},
			// IOS
			// notification : {
			// 	title : capitalize(notificationTitle),
			// 	sound : 'default',
			// 	clickAction : 'FLUTTER_NOTIFICATION_CLICK'
			// }
		}

		if(!(FCM_tokens.length > 0)) return

		await messaging().sendToDevice(
			FCM_tokens,
			payload
		)

    } catch(e) { console.error(e) }

	return
})