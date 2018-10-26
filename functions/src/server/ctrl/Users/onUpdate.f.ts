import * as functions from 'firebase-functions'

exports = module.exports = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
    
    return change.after.ref.update({
        name_change_count: 6
    });
})