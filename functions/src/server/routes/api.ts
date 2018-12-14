import { Application, Request, Response } from 'express'
import { firestore } from 'firebase-admin'
import ModelImpl, { Models } from '../lib/ORM/Models';
import { asyncForEach } from '../lib/util';
import DataORMImpl from '../lib/ORM';
import Household from '../lib/ORM/Models/Household';

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
    
        const fs = firestore()

        const sensorQuerySnaps: firestore.QuerySnapshot = await fs.collection(Models.SENSOR).get()
        
        const sensors = new Array<firestore.DocumentReference>()

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
            const fs = firestore()
            const db = new DataORMImpl(fs)

            const householdQuerySnaps: firestore.QuerySnapshot = await fs.collection(Models.HOUSEHOLD).get()
            
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
}