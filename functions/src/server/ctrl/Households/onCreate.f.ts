import { Roles, Errors } from '../../lib/const'
import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'
import User from '../../lib/ORM/Models/User'
import DataORMImpl from './../../lib/ORM/'
import { firestore } from 'firebase-admin'

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onCreate(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {

    const adminFs = firestore()
    const db = new DataORMImpl(adminFs)

    const household = db.household(snap)

    const householdUsers = await household.users().cache()

    const adminId = Object.keys(householdUsers)[0] // Get the id of the first user which will be declared the admin of the household

    const adminUser = await db.user().find(adminId) as User
    const adminRelatedHousehold = await adminUser.getField(Models.HOUSEHOLD)

    if(adminRelatedHousehold)
    {
        if(adminRelatedHousehold.id !== household.getId())
        {
            await household.delete()
            return Promise.reject(Errors.UNAUTHORIZED).catch(console.error)
        }
    }

    return household
                .users()
                .updatePivot(adminId, {
                    role : Roles.ADMIN,
                    accepted : true
                }).catch(console.error)
})