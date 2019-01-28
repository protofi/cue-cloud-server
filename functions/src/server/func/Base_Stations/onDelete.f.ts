// import * as functions from 'firebase-functions'
// import { Models } from '../../lib/ORM/Models'
// import { firestore } from 'firebase-admin'
// import DataORMImpl from '../../lib/ORM'
// import Household from '../../lib/ORM/Models/Household';
// import BaseStation from '../../lib/ORM/Models/BaseStation';

// exports = module.exports = functions.firestore
// .document(`${Models.BASE_STATION}/{baseStationId}`)
// .onDelete(async (docSnap: functions.firestore.DocumentSnapshot, context) => {

//     let baseStation: BaseStation

//     try{
//         const adminFs = firestore()
//         const db = new DataORMImpl(adminFs)
        
//         baseStation = db.baseStation(docSnap)
//     }
//     catch(e)
//     {
//         console.error(e)
//         return
//     }

//     console.log('DELETE', docSnap.data())

//     return Promise.all([
//     ]).catch(console.error)
// })