import * as express from 'express'
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import firebase from '@firebase/app';
import '@firebase/firestore'

import * as users from './users'
import Database from './lib/database'

import * as glob from 'glob'
import * as camelCase from 'camelcase'

const app = express()
app.set('view engine', 'pug')

// const serviceAccount = require(`./../${process.env.GCLOUD_PROJECT}.serviceAccountKey.json`)

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
// })

admin.initializeApp();

firebase.initializeApp({
    apiKey: "AIzaSyAjjVn6bfI66Xarf3TvC81WIs8JMlTtO-E",
    authDomain: "staging-iot-cloud-server.firebaseapp.com",
    databaseURL: "https://staging-iot-cloud-server.firebaseio.com",
    projectId: "staging-iot-cloud-server",
    storageBucket: "staging-iot-cloud-server.appspot.com",
    messagingSenderId: "876174399478"
});

const settings = { timestampsInSnapshots: true }

const adminFs = admin.firestore()
adminFs.settings(settings)

const fs = firebase.firestore()
fs.settings(settings)

// app.get('/autoloader', (req: express.Request, res: express.Response) => {
    
    const files = glob.sync('./controllers/**/*.f.js', { cwd: __dirname, ignore: './node_modules/**'});
    // const funcs = []

    for(let f=0,fl=files.length; f<fl; f++)
    {
        const file = files[f];
        const functionName = camelCase(file.slice(0, -5).split('/').join('_')); // Strip off '.f.js'
        // funcs.push(functionName)

        if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === functionName)
        {
            exports[functionName] = require(file)
        }
    }

//     res.status(200).json({
//         success : true,
//         data : files,
//         functions: funcs
//     })
// })

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

const db = new Database(adminFs);

exports.userSignin = users.signin(db);
exports.userDeleteAccount = users.deleteAccount(db)

// const config = {
//     dev: false,
//     buildDir: 'nuxt',
//     build: {
//         publicPath: '/'
//     }
// }

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

// // match all GET routes not staring with /api/ and /admin/
// const excludedPaths = ['api','admin'].join('|')
// const nuxtPath = new RegExp('^(?!\/('+excludedPaths+').*$).*')

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