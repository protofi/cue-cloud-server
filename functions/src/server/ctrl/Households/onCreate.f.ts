import * as functions from 'firebase-functions'

exports = module.exports = functions.firestore
    .document('households/{householdId}')
    .onCreate((snap, context) => {
        const data = snap.data();
    return
});