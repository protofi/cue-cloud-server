import * as express from 'express'

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

import * as users from './users'
import { UserRecord } from 'firebase-functions/lib/providers/auth';


const app = express()
app.set('view engine', 'pug')

// const serviceAccount = require(`./../${process.env.GCLOUD_PROJECT}.serviceAccountKey.json`)

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
// })

admin.initializeApp();

const db = admin.firestore()

const settings = {timestampsInSnapshots: true}
db.settings(settings)

app.get('/admin', (req: express.Request, res: express.Response) => {
    
    const data = {
        title: 'Admin'
    }

    res.status(200).render('admin', data)
})

app.get('/api', (req: express.Request, res: express.Response) => {
    res.status(200).json({
        success : true,
        data : [
            'one',
            'two',
            'three'
        ]
    })
})

exports.userSignin = users.signin(db);
exports.userDeleteAccount = users.deleteAccount(db)

const config = {
    dev: false,
    buildDir: 'nuxt',
    build: {
        publicPath: '/'
    }
}

// const nuxt = new Nuxt(config)

// function nuxtHandler(req: express.Request, res: express.Response)
// {
//     res.set('Cahce-Control', 'public, max-age=600, s-maxage=1200')
//     nuxt.renderRoute('/')
//         .then(result => {
//             res.send(result.html)
//         })
//         .catch(e => {
//             res.send(e)
//         })
// }

//match all GET routes not staring with /api/ and /admin/
const excludedPaths = ['api','admin'].join('|')
const nuxtPath = new RegExp('^(?!\/('+excludedPaths+').*$).*')

// app.get(nuxtPath, nuxtHandler)

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(404)
    
    if(req.accepts('html'))
    {
        res.render('404', {path: req.url})
        return
    }

    res.json({
        success: false,
        error: 'Resource Not Found'
    })
})

exports.app = functions.https.onRequest(app)