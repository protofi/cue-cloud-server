import firebase from 'firebase/app'
import 'firebase/functions'
import 'firebase/firestore'
import 'firebase/auth'

if (!firebase.apps.length) {
    const config = {
        apiKey: "AIzaSyBgOJkcSQ9pcCirryYf-dKkyIpW-lj8eQg",
        authDomain: "iot-cloud-216011.firebaseapp.com",
        databaseURL: "https://iot-cloud-216011.firebaseio.com",
        projectId: "iot-cloud-216011",
        storageBucket: "iot-cloud-216011.appspot.com",
        messagingSenderId: "1006984432371"
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