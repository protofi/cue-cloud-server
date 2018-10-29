import * as functions from 'firebase-functions'
import { UserRecord } from 'firebase-functions/lib/providers/auth'
import * as admin from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';

try {admin.initializeApp()} catch(e) {}

exports = module.exports = functions.auth.user().onCreate(async (user: UserRecord) => {
    
    const adminFs = admin.firestore()
    const db = new DataORMImpl(adminFs)

    const data = {
        id      : user.uid,
        email   : user.email
    }

    return await db.user(user.uid).create(data)
})