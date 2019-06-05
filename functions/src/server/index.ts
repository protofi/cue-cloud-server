import { Nuxt } from 'nuxt'
import * as express from 'express'
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { glob } from 'glob'
import * as cors from 'cors'
import * as camelCase from 'camelcase'

const app = express()
app.use(cors({ origin: true }))

try{
    admin.initializeApp()
}
catch(e){ console.log(e.message) }

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
        publicPath: '/assets/client'
    }
})

nuxt.ready()

//Handling requests for Nuxt front end
async function handleNuxtRequest(req: express.Request, res: express.Response)
{
    const isProduction = (process.env.NODE_ENV === "development") ? false : true
 
    if(isProduction)
        res.set('Cache-Control', 'public, max-age=600, s-maxage=1200')

    try
    {
        nuxt.render(req, res)
    }
    catch (error)
    {
        console.error(error)
    }
}

app.use(handleNuxtRequest)

//Exporting HTTPS Function
exports.httpOnRequest = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest(app)