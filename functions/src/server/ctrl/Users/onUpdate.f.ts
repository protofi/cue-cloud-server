import * as functions from 'firebase-functions'

exports = module.exports = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
    
    return change.after.ref.set({
        name_change_count: 6
      }, {merge: true});
});