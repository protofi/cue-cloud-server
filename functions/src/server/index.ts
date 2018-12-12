import * as express from 'express'
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { glob } from 'glob'
import * as cors from 'cors'
import * as camelCase from 'camelcase'

const app = express()
app.set('view engine', 'pug')
app.use(cors({ origin: true }))

import apiRoutes from './routes/api'
import webRoutes from './routes/web'

apiRoutes(app)
webRoutes(app)

try {
    admin.initializeApp()
  } catch (e) {}

// firebase.initializeApp({
//     apiKey: "AIzaSyAjjVn6bfI66Xarf3TvC81WIs8JMlTtO-E",
//     authDomain: "staging-iot-cloud-server.firebaseapp.com",
//     databaseURL: "https://staging-iot-cloud-server.firebaseio.com",
//     projectId: "staging-iot-cloud-server",
//     storageBucket: "staging-iot-cloud-server.appspot.com",
//     messagingSenderId: "876174399478"
// })

const settings = { timestampsInSnapshots: true }

const adminFs = admin.firestore()
adminFs.settings(settings)

//functions autoloader
const files = glob.sync('./**/*.f.js', { cwd: __dirname, ignore: './node_modules/**'})

for(let f=0,fl=files.length; f<fl; f++)
{
    const file = files[f];
    const functionName = camelCase(file.slice(0, -5).split('/').join('_')); // Strip off '.f.js'

    if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === functionName)
    {
        exports[functionName] = require(file)
    }
}

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

exports.httpOnRequest = functions.https.onRequest(app)