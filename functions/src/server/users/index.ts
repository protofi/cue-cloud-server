import * as functions from 'firebase-functions'
import { UserRecord } from 'firebase-functions/lib/providers/auth'

import Database from './../../lib/Database'

export const signin = (firestore) => {

    return functions.auth.user().onCreate((user: UserRecord) => {
        
        const data = {
            name : 'Tobias',
            id : user.uid,
            email : user.email
        }

        const db = new Database(firestore);
        return db.users.set(user.uid, data)
    })
}

export const deleteAccount = (firebase) => {

    return functions.auth.user().onDelete((user: UserRecord) => {
        
        return firebase.collection('users').doc(user.uid).delete()
    })
} 

