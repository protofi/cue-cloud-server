import { Application, Request, Response } from 'express'

export default (app: Application) => {
    app.get('/admin', (req: Request, res: Response) => {
    
        const data = {
            title: 'Admin'
        }
    
        res.status(200).render('admin', data)
    })
    
    app.get('/admin/test', (req: Request, res: Response) => {
        
        const data = {
            title: 'Admin Test'
        }
    
        res.status(200).render('test', data)
    })
}