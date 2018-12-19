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
            title: 'Test Dashboard'
        }
    
        res.status(200).render('test', data)
    })

    app.get('/admin/base-stations', (req: Request, res: Response) => {
        
        const data = {
            title: 'Base Stations Dashboard'
        }
    
        res.status(200).render('admin/base-stations', data)
    })
}