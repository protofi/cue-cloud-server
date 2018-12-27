import firebase from 'firebase/app'
import 'firebase/functions'
import 'firebase/firestore'
import 'firebase/auth'

if (!firebase.apps.length)
{
    const config = {
        apiKey: "AIzaSyBSOLIAOif1jZ80ukoTjsfTwQ9BEBXcmkc",
        authDomain: "staging-cue-iot-cloud.firebaseapp.com",
        databaseURL: "https://staging-cue-iot-cloud.firebaseio.com",
        projectId: "staging-cue-iot-cloud",
        storageBucket: "staging-cue-iot-cloud.appspot.com",
        messagingSenderId: "511550860680"
    }
    firebase.initializeApp(config)
    firebase.firestore().settings({timestampsInSnapshots: true})
}

const auth = firebase.auth()
const functions = firebase.functions()
const firestore = firebase.firestore()

export {
    auth,
    firebase,
    functions,
    firestore
}