const functions = require('firebase-functions');

const express = require('express')
const path = require('path');

const app = express()

app.set('view engine', 'pug')

app.get('/', (req, res) => {
    res.status('200').render('index', {title: 'Index'})
})

exports.app = functions.https.onRequest(app);
