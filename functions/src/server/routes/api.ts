import { Application, Request, Response } from 'express'
import * as admin from 'firebase-admin'

import ModelImpl, { Models } from '../lib/ORM/Models';
import { asyncForEach } from '../lib/util';
import DataORMImpl from '../lib/ORM';
import Household from '../lib/ORM/Models/Household';
import * as baseStationCode from 'randomatic'
import * as fakeUuid from 'uuid/v1'
const { PubSub } = require('@google-cloud/pubsub');

try {
    admin.initializeApp()
} catch (e) {}

export default (app: Application) => {

    app.get('/api', (req: Request, res: Response) => {
        res.status(200).json({
            success : true,
            data : [
                'one',
                'two',
                'three'
            ]
        })
    })
    
    app.delete('/api/sensors', async (req: Request, res: Response) => {
    
        const fs = admin.firestore()

        const sensorQuerySnaps: admin.firestore.QuerySnapshot = await fs.collection(Models.SENSOR).get()
        
        const sensors = new Array<admin.firestore.DocumentReference>()

        sensorQuerySnaps.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            sensors.push(doc.ref)
        })
        
        const ids = sensors.map((sensor) => {
            return sensor.id
        })

        await asyncForEach(sensors, async (sensor) => {
            await sensor.delete()
        })

        res.status(200).json({
            success : true,
            deleted : ids
        })
    })

    app.put('/api/sensors', async (req: Request, res: Response) => {
        
        // const amount = req.body.amount

        const sensorAddedData = {}

        try{
            const fs = admin.firestore()
            const db = new DataORMImpl(fs)

            const householdQuerySnaps: admin.firestore.QuerySnapshot = await fs.collection(Models.HOUSEHOLD).get()
            
            const households = new Array<Household>()

            householdQuerySnaps.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                households.push(db.household(doc))
            })

            const data = [
                {
                    name        : 'Dørklokken',
                    location    : 'Gangen',
                    icon_string : 'doorbell'
                },
                {
                    name        : 'Røgalarmen',
                    location    : 'Køkkenet',
                    icon_string : 'firealarm'
                },
                {
                    name        : 'Røgalarmen',
                    location    : 'Stuen',
                    icon_string : 'firealarm'
                }
            ]

            await asyncForEach(households, async (household: Household) => {

                const sensors: Array<ModelImpl> = []
                
                sensors.push(await db.sensor().create(data[0]))
                sensors.push(await db.sensor().create(data[1]))
                sensors.push(await db.sensor().create(data[2]))

                await household.sensors().attachBulk(sensors)

                sensors.forEach((sensor, i) => {
                    if(!sensorAddedData[household.getId()]) sensorAddedData[household.getId()] = {}
                    sensorAddedData[household.getId()][sensor.getId()] = data[i]
                })
            })
        }
        catch(e)
        {
            res.status(500).json({
                success : false,
                error : e
            })

            return
        }

        res.status(200).json({
            success : true,
            sensors : sensorAddedData
        })
    })

    app.put('/api/sensors/:id/notication', async (req: Request, res: Response) => {
        const pubsub = new PubSub()

        const sensorId = req.params.id

        const topicName = 'notification';

        const data = {
            sensor_id : sensorId
        }

        const messageId = await pubsub
                .topic(topicName)
                .publisher()
                .publish(Buffer.from(''), data)
                
        console.log(`Message ${messageId} published.`);

        res.json({
            success: true,
            sensor: sensorId,
            msg : messageId
        })
    })

    app.route('/api/base-station')

        .get(async (req: Request, res: Response) => {

            const fs = admin.firestore()

            const query = await fs.collection(Models.BASE_STATION).get()
    
            const baseStations = {}

            query.forEach((baseStation) => {
                
                baseStations[baseStation.id] = baseStation.data()
            })

            res.json({
                success: true,
                baseStations : baseStations
            })

        })

        .post(async (req: Request, res: Response) => {
            res.status(501).end()
        })

        .put(async (req: Request, res: Response) => {
        
            const code = baseStationCode('A0', 5, { exclude: '0Ooil' })

            const fs = admin.firestore()
            const db = new DataORMImpl(fs)
            
            const uuid = fakeUuid()
    
            const baseStation = await db.baseStation().find(uuid)
    
            if(await baseStation.exists())
            {
                res.status(500).json({
                    success: false,
                    uuid: uuid,
                    message: 'A Base Station with this UUID already exists.'
                })
    
                return
            }
    
            await baseStation.updateOrCreate({
                pin: code
            })
    
            res.json({
                success : true,
                baseStationId: baseStation.getId(),
                pin : code
            })
        })
}