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
catch(e) { console.log(e.message) }

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

//Import and enable API routes
import apiRoutes from './routes/api'
exports.api = apiRoutes(app)

const nuxt = new Nuxt({
    dev: false,
    buildDir: 'nuxt',
    build: {
        publicPath: '/assets/'
    }
})

nuxt.ready()

app.use((req, res) => {
    
    // if(process.env.NODE_ENV === 'production')
        // res.set('Cache-Control', 'public, max-age=600, s-maxage=1200')

    nuxt.render(req, res)
})

exports.httpOnRequest = functions.https.onRequest(app)