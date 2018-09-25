const functions = require('firebase-functions');

const express = require('express')
const path = require('path');

const serviceAccount = require("./serviceAccountKey.json");

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://iot-cloud-216011.firebaseio.com"
});

const db = admin.firestore();
const app = express()

app.set('view engine', 'pug')

app.get('/', (req, res) => {
    res.status('200').render('index', {title: 'Index'})
})

exports.app = functions.https.onRequest(app);

exports.userSignin = functions.auth.user().onCreate(user => {
    console.log('user signed in')

    const data = {
        name : "Tobias",
        id : user.uid,
        email : user.email
    }

    db.collection('users').doc(user.uid).set(data);
});
