// import * as functions from 'firebase-functions'
// import { UserRecord } from 'firebase-functions/lib/providers/auth'
// import * as admin from 'firebase-admin'
// import DataORMImpl from './../../lib/ORM/';

// try {admin.initializeApp()} catch(e) {}

// exports = module.exports = functions.auth.user().onDelete((user: UserRecord) => {
    
//     const adminFs = admin.firestore()

//     const db = new DataORMImpl(adminFs)

//     return db.user(null, user.uid).delete()
// })