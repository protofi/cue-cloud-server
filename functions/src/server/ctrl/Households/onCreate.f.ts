import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import DataORMImpl from './../../lib/ORM/';
import { Roles } from '../../lib/const';

exports = module.exports = functions.firestore.document('households/{householdId}').onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    const adminFs = admin.firestore()
    const db = new DataORMImpl(adminFs)

    const household = db.household(snap)

    const householdUsers = await household.users().cache()

    const adminId = Object.keys(householdUsers)[0] // Get the id of the first user which will be declared the admin of the
    
    return household.users().updatePivot(adminId, {
                    role : Roles.ADMIN
                })
});