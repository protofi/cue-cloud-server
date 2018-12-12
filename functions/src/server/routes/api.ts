import { Application, Request, Response } from 'express'
// import Sensor from '../lib/ORM/Models/Sensor';
// import { firestore } from 'firebase-admin'
// import { Models } from '../lib/ORM/Models';

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
    
        // const fs = firestore()

        // const sensors = await fs.collection(Models.SENSOR).doc().get()

        

        res.status(200).json({
            success : true
        })
    })
}