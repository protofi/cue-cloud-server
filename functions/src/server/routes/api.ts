import { getStatusText, UNAUTHORIZED, NOT_FOUND, CONFLICT } from 'http-status-codes'
import { Router, Application, Request, Response, NextFunction } from 'express'
import { firestore, auth } from 'firebase-admin'

import ModelImpl, { Models } from '../lib/ORM/Models';
import { asyncForEach } from '../lib/util';
import DataORMImpl from '../lib/ORM';
import Household from '../lib/ORM/Models/Household';
import * as fakeUuid from 'uuid/v1'
import User from '../lib/ORM/Models/User';
import { isEmpty } from 'lodash'
import { Errors } from '../lib/const';
const { PubSub } = require('@google-cloud/pubsub')

import * as iot from '@google-cloud/iot'

const apiBasePath = '/api/v1'

const fs = firestore()
const db = new DataORMImpl(fs)

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
        req['auth'] = await auth().verifyIdToken(token)

        next()
    }
    catch(e)
    {
        res.status(UNAUTHORIZED).json({
            error : getStatusText(UNAUTHORIZED),
            code : UNAUTHORIZED,
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
            code : UNAUTHORIZED,
        }).end()
    }
}

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

    authRouter.route(`/${Models.HOUSEHOLD}/:id/invitations`)

        .post(async (req: Request, res: Response) => {

            const user          = req['auth']
            const householdId   = req.params.id
            const inviteeEmail  = req.body.email

            /**
             * TO DO: validate input
             */

            try{
                const inviter = await db.user().find(user.uid) as User
                const cache = await inviter.household().cache()

                if(cache.id !== householdId) throw new Error(Errors.NOT_RELATED)

                const household = db.household(null, householdId)

                const householdAdmin = await inviter.household().getPivotField(User.f.HOUSEHOLDS.ROLE)

                if(!householdAdmin) throw new Error(Errors.UNAUTHORIZED)

                const invitees = await db.user().where(User.f.EMAIL, '==', inviteeEmail).get()
        
                if(invitees.empty) throw new Error(`${NOT_FOUND}`)
                if(invitees.size > 1) throw new Error(Errors.GENERAL_ERROR)

                const invitee = db.user(invitees.docs[0])
                
                const inviteeHouseholdRel = await invitee.household().cache()

                if(!isEmpty(inviteeHouseholdRel)) throw new Error(`${CONFLICT}`)

                await invitee.household().set(household)

                const inviterName = await inviter.getField(User.f.NAME)

                await invitee.household().updatePivot({
                    [User.f.HOUSEHOLDS.INVITER] : (inviterName) ? inviterName : await inviter.getField(User.f.EMAIL)
                })

                res.json({
                    success         : true,
                    inviteeId       : invitee.getId(),
                    householdId     : householdId,
                    inviteeEmail    : inviteeEmail
                })
            }
            catch(e)
            {
                const code = (isNaN(e.message)) ? 500 : e.message

                res.status(code).json({
                    success : false,
                    error : e.message
                })
            }
        })
    
    /******************************************
     *  ADMIN PROTECTED ROUTES
     ******************************************/
    
    authRouter.use(adminMiddleware)

    authRouter.route('/users')

        .delete(async (req: Request, res: Response) => {
            const userIds = req.body.ids
            
            const deletions = []

            try{
                
                userIds.forEach((id: string) => {
                    deletions.push(auth().deleteUser(id))
                })

                await Promise.all(deletions)

                res.json({
                    success : true,
                    users   : userIds,
                })
            }
            catch(e) {
                res.json({
                    success : false,
                    users   : userIds,
                    error   : e
                })  
            }
        })

    authRouter.route('/households')
        
        .get(async (req: Request, res: Response) => {
            res.json({
                user : req['auth']
            })
        })

    authRouter.route('/households/:id/sensors')
        
        .put(async (req: Request, res: Response) => {
            const householdId = req.params.id
            
            const household = await db.household().find(householdId) as Household

            const sensor = await db.sensor(null, fakeUuid())

            await household.sensors().attach(sensor)

            res.json({
                success: true,
                sensor: sensor.getId()
            })
        })

        .delete(async (req: Request, res: Response) => {
            
            const householdId = req.params.id
            
            const household = await db.household().find(householdId) as Household

            const sensors: Array<ModelImpl> = await household.sensors().get()
            
            await asyncForEach(sensors, async sensor => {
                await sensor.delete()
            })

            res.json({
                success: true
            })
        })

    authRouter.route('/sensors')
    
        // .put(async (req: Request, res: Response) => {
        
        //     const sensorAddedData = {}

        //     try{
        //         const householdQuerySnaps: firestore.QuerySnapshot = await fs.collection(Models.HOUSEHOLD).get()
                
        //         const households = new Array<Household>()

        //         householdQuerySnaps.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        //             households.push(db.household(doc))
        //         })

        //         const data = [
        //             {
        //                 name        : 'Dørklokken',
        //                 location    : 'Gangen',
        //                 icon_string : 'doorbell'
        //             },
        //             {
        //                 name        : 'Røgalarmen',
        //                 location    : 'Køkkenet',
        //                 icon_string : 'firealarm'
        //             },
        //             {
        //                 name        : 'Røgalarmen',
        //                 location    : 'Stuen',
        //                 icon_string : 'firealarm'
        //             }
        //         ]

        //         await asyncForEach(households, async (household: Household) => {

        //             const sensors: Array<ModelImpl> = []
                    
        //             sensors.push(await db.sensor().create(data[0]))
        //             sensors.push(await db.sensor().create(data[1]))
        //             sensors.push(await db.sensor().create(data[2]))

        //             await household.sensors().attachBulk(sensors)

        //             sensors.forEach((sensor, i) => {
        //                 if(!sensorAddedData[household.getId()]) sensorAddedData[household.getId()] = {}
        //                 sensorAddedData[household.getId()][sensor.getId()] = data[i]
        //             })
        //         })
        //     }
        //     catch(e)
        //     {
        //         res.status(INTERNAL_SERVER_ERROR).json({
        //             success : false,
        //             error : e
        //         })

        //         return
        //     }

        //     res.json({
        //         success : true,
        //         sensors : sensorAddedData
        //     })
        // })

        .delete(async (req: Request, res: Response) => {
        
            const sensorQuerySnaps: firestore.QuerySnapshot = await fs.collection(Models.SENSOR).get()
            
            const sensors = new Array<firestore.DocumentReference>()

            sensorQuerySnaps.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                sensors.push(doc.ref)
            })
            
            const ids = sensors.map(sensor => {
                return sensor.id
            })

            await asyncForEach(sensors, async sensor => {
                await sensor.delete()
            })

            res.status(200).json({
                success : true,
                deleted : ids
            })
        })

    authRouter.route('/sensors/:id/notifications')
        
        .put(async (req: Request, res: Response) => {
            
            const pubsub = new PubSub()

            const sensorUUID = req.params.id

            const topicName = 'sensor-notification'

            const attributes = {
                sensor_UUID : sensorUUID
            }

            const dataBuffer = Buffer.from(
                JSON.stringify(attributes)
            )

            const messageId = await pubsub
                    .topic(topicName)
                    .publisher()
                    .publish(dataBuffer, attributes)
                    
            res.json({
                success: true,
                sensor: sensorUUID,
                msg : messageId
            })
        })

    authRouter.route('/base-stations')

        .put(async (req: Request, res: Response) => {
        
            const pubsub = new PubSub()
            
            const uuid = fakeUuid()
    
            const topicName = 'base-station-initialize'

            const attributes = {
                deviceId : uuid
            }

            const dataBuffer = Buffer.from('')

            try{
                await pubsub
                    .topic(topicName)
                    .publisher()
                    .publish(dataBuffer, attributes)

            }
            catch(e)
            {
                res.status(500).json({
                    success: false,
                    error : e
                })
            }

            res.json({
                success: true
            })
        })

    authRouter.route('/base-stations/:id')
    
        .delete(async (req: Request, res: Response) => {
            
            const baseStationId = req.params.id

            const projectId = 'staging-cue-iot-cloud'
            const location  = 'europe-west1'
            const registry  = 'Base-Station-Registry'

            const client = new iot.v1.DeviceManagerClient({
                keyFilename : './iot-device-manager.serviceAccountKey.json'
            })

            const formattedName = client.devicePath(projectId, location, registry, baseStationId)

            try
            {
                await client.deleteDevice({name: formattedName})

                await db.baseStation(null, baseStationId).delete()

            }
            catch(error)
            {
                res.status(500).json({
                    success: false,
                    error: error
                })

                return
            }

            res.json({
                success: true,
                baseStationId : baseStationId
            })
        })

    /******************************************
     *  ROUTES NOT FOUND
     ******************************************/

    authRouter.use(notFoundHandler)
}