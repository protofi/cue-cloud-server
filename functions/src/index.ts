import * as functions from 'firebase-functions';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { UserRecord } from 'firebase-functions/lib/providers/auth';

const app = express();
app.set('view engine', 'pug');

const serviceAccount = require(`./../${process.env.GCLOUD_PROJECT}.serviceAccountKey.json`);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
})

const db = admin.firestore();

const settings = {timestampsInSnapshots: true};
db.settings(settings);

app.get('/', (req: express.Request, res: express.Response) => {
    
    const data = {
        title: 'Index'
    };

    res.status(200).render('index', data)
})

app.get('/json', (req: express.Request, res: express.Response) => {
    
    const data = {
        success: true
    };

    res.status(200).json(data)
})

exports.app = functions.https.onRequest(app);

exports.userSignin = functions.auth.user().onCreate((user: UserRecord) => {
    
    const data = {
        name : "Tobias",
        id : user.uid,
        email : user.email
    }

    return db.collection('users').doc(user.uid).set(data);
})

exports.userDelete = functions.auth.user().onDelete((user: UserRecord) => {
    
    return db.collection('users').doc(user.uid).delete();
})