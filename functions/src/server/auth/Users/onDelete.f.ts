import { auth } from 'firebase-functions'
import { UserRecord } from 'firebase-functions/lib/providers/auth'
import { firestore } from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';

exports = module.exports = auth.user().onDelete((user: UserRecord) => {
    
    const adminFs = firestore()

    const db = new DataORMImpl(adminFs)

    return db.user(null, user.uid).delete()
})