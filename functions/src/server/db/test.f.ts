import * as functions from 'firebase-functions'

export = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
    
    return change.after.ref.set({
        name_change_count: 2
      }, {merge: true});
});
