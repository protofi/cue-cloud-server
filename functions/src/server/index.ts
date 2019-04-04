import { Nuxt } from 'nuxt'
import * as express from 'express'
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { glob } from 'glob'
import * as cors from 'cors'
import * as camelCase from 'camelcase'

const app = express()
app.use(cors({ origin: true }))

// const projectId = process.env.GCLOUD_PROJECT

// try{
//     const serviceAccount = require(`./../${projectId}.serviceAccountKey.json`)

//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//         databaseURL: `https://${projectId}.firebaseio.com`
//     })
// }
// catch(e)
// {
//     console.warn(e.message, 'Service Account Key missing. Initializing app with no credentials.')

//     try{
//         admin.initializeApp()
//     }
//     catch(e){}
// }

try {
    admin.initializeApp()
} catch (e) {}

const settings = { timestampsInSnapshots: true }

const adminFs = admin.firestore()
adminFs.settings(settings)

//Cloud Functions Autoloader
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

//Import of API routes
import apiRoutes from './routes/api'
exports.api = apiRoutes(app)

const nuxt = new Nuxt({
    dev: false,
    buildDir: 'nuxt',
    build: {
        publicPath: '/assets/'
    }
})

//Handling requests for Nuxt front end
function handleNuxtRequest(req: express.Request, res: express.Response)
{
    res.set('Cache-Control', 'public, max-age=600, s-maxage=1200')

    return new Promise((resolve, reject) => {
        nuxt.render(req, res, (promise) => {
            promise.then(resolve).catch(reject)
        });
    });
}

app.use(handleNuxtRequest)

//Exporting HTTPS Function
exports.httpOnRequest = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest(app)