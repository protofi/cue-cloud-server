import * as functions from 'firebase-functions'
import { UserRecord } from 'firebase-functions/lib/providers/auth'
import { Datastore } from '../lib/database';

export const signin = (db: Datastore) => {

    return functions.auth.user().onCreate((user: UserRecord) => {
        
        const data = {
            id : user.uid,
            email : user.email
        }

        return db.users.set(user.uid, data)
    })
}

export const deleteAccount = (db: Datastore) => {

    return functions.auth.user().onDelete((user: UserRecord) => {
        
        return db.users.delete(user.uid)
    })
} 

