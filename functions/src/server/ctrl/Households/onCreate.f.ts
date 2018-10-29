import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models';
import * as admin from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';
import { Roles } from '../../lib/const';

exports = module.exports = functions.firestore.document('households/{householdId}').onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    const adminFs = admin.firestore()
    const db = new DataORMImpl(adminFs)

    const data = snap.data()
    const householdId = data.id
    const adminId = Object.keys(data[Models.USER])[0] // Get the id of the first user
    
    await db.user(adminId).update({
        [Models.HOUSEHOLD] : {
            [householdId] : {
                role : Roles.ADMIN
            }
        }
    })

    return db.household(snap.id).update({
        [Models.USER] : {
            [adminId] : {
                role : Roles.ADMIN
            }
        }
    })
});