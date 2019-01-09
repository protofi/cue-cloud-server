import { getStatusText, UNAUTHORIZED, NOT_FOUND, INTERNAL_SERVER_ERROR} from 'http-status-codes'
import { Router, Application, Request, Response, NextFunction } from 'express'
import * as admin from 'firebase-admin'

import ModelImpl, { Models } from '../lib/ORM/Models';
import { asyncForEach } from '../lib/util';
import DataORMImpl from '../lib/ORM';
import Household from '../lib/ORM/Models/Household';
import * as baseStationCode from 'randomatic'
import * as fakeUuid from 'uuid/v1'
const { PubSub } = require('@google-cloud/pubsub');

const apiBasePath = '/api/v1'

try {
    admin.initializeApp()
} catch (e) {}

export default (app: Application) => {

    const publicRouter = Router()
    app.use(apiBasePath, publicRouter)
    
    const authRouter = Router()
    app.use(apiBasePath, authRouter)

    /******************************************
     *  PUBLIC ROUTES
     ******************************************/

    publicRouter.route('/')
        
        .get(async (req: Request, res: Response) => {
            res.json({
                message: 'Welcome to the Cue API.'
            })
        })

    /******************************************
     *  AUTH PROTECTED ROUTES
     ******************************************/

    authRouter.use(authMiddleware)

    authRouter.route('/users')
        
        .get(async (req: Request, res: Response) => {
            res.json({
                user : req['auth']
            })
        })

    /******************************************
     *  ADMIN PROTECTED ROUTES
     ******************************************/
    
    authRouter.use(adminMiddleware)

    authRouter.route('/households')
        
        .get(async (req: Request, res: Response) => {
            res.json({
                user : req['auth']
            })
        })

    authRouter.route('/sensors')
    
        .put(async (req: Request, res: Response) => {
        
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
                res.status(INTERNAL_SERVER_ERROR).json({
                    success : false,
                    error : e
                })

                return
            }

            res.json({
                success : true,
                sensors : sensorAddedData
            })
        })

    authRouter.route('/sensors/:id/notifications')
        
        .put(async (req: Request, res: Response) => {
            const pubsub = new PubSub()

            const sensorId = req.params.id

            const topicName = 'notification'

            const data = {
                sensor_id : sensorId
            }

            const messageId = await pubsub
                    .topic(topicName)
                    .publisher()
                    .publish(Buffer.from(''), data)
                    
            console.log(`Message ${messageId} published.`)

            res.json({
                success: true,
                sensor: sensorId,
                msg : messageId
            })
        })
    
    // app.delete('/api/sensors', async (req: Request, res: Response) => {
    
    //     const fs = admin.firestore()

    //     const sensorQuerySnaps: admin.firestore.QuerySnapshot = await fs.collection(Models.SENSOR).get()
        
    //     const sensors = new Array<admin.firestore.DocumentReference>()

    //     sensorQuerySnaps.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    //         sensors.push(doc.ref)
    //     })
        
    //     const ids = sensors.map((sensor) => {
    //         return sensor.id
    //     })

    //     await asyncForEach(sensors, async (sensor) => {
    //         await sensor.delete()
    //     })

    //     res.status(200).json({
    //         success : true,
    //         deleted : ids
    //     })
    // })

    authRouter.route('/base-stations')

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
    
    /******************************************
     *  ROUTES NOT FOUND
     ******************************************/

    authRouter.use(notFoundHandler)
}

const notFoundHandler = (req: Request, res: Response) => {
 
    res.status(NOT_FOUND).json({
        error : getStatusText(NOT_FOUND),
        code : NOT_FOUND
    }).end()
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        
    try
    {
        const token = req.headers.authorization
        req['auth'] = await admin.auth().verifyIdToken(token)

        next()
    }
    catch(e)
    {
        res.status(UNAUTHORIZED).json({
            error : getStatusText(UNAUTHORIZED),
            code : UNAUTHORIZED
        }).end()
    }
}

const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    
    try
    {
        const user = req['auth']
        if(!user.isAdmin) throw new Error()

        next()
    }
    catch(e)
    {
        res.status(UNAUTHORIZED).json({
            error : getStatusText(UNAUTHORIZED),
            code : UNAUTHORIZED
        }).end()
    }
}