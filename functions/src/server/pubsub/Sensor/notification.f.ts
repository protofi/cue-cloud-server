import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from '../../lib/ORM'
import Sensor from '../../lib/ORM/Models/Sensor'

try {admin.initializeApp()} catch(e) {}

exports = module.exports = functions.pubsub
.topic('notification')
.onPublish(async (message: functions.pubsub.Message, context: functions.EventContext) => {

    const db = new DataORMImpl(admin.firestore())

    const sensorId = message.attributes.sensor_id
    const sensor = await db.sensor().secure().find(sensorId) as Sensor
    const users = await sensor.getField('')

    const collapseKey = '123abc'

    const iPhone5s  = 'csMFb2ss3j4:APA91bGAXzHdDYgG0eJSESfQb7lL09le08B7rC1Vvls1gPmXaK7NgGmTESnw5R4xWt622SfPjL8K3Q4UHlhsarR5Mr5GDQonoeGhJ8A8p42J1A-CghpEBxgAB0qFW-QyHtHmkdGVRQ7F'
    const iPhoneX   = 'dZq_yPw0h6E:APA91bGeM4hXNJeMJiwWsX5_gVgjMD5R0oUCZPmJeqvETw4BPh32VsTNvP4sxEfDJSZ4IxcJvjs5KjZ-JM19yx4Ky1YIcXVJGdBjXQ4f96oxiRkA5MKW3O67yu80lQvkcGExwopuSvbt'
    const Nexus5    = 'fo9CNDze4JM:APA91bGwCyLmPNdID3ur6vZ0dfzVpqj9s1PrTv5SrcEc_5CmJ1rF1PRA7hntHvUhrAStNdjch4YNymzetsQYiaRuyPy9m8gMILhFphSWsSnxTZM2tgn8FtqO47bEWmx59MAbP6CGoZTk'

    const tokens = [
      iPhone5s,
      // iPhoneX,
      Nexus5
    ]

    const payload = {
      data : {
        sensor_id : sensorId  
      },
      notification : {
        title : 'Røgalarm lyder',
        sound : 'default',
        clickAction : 'FLUTTER_NOTIFICATION_CLICK'
      },
    }

    const options = {
      collapseKey : collapseKey
    }
    
    admin.messaging().sendToDevice(
        tokens,
        payload,
        options
      )
      .then((response) => {
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
      
    console.log(users)

    return
})