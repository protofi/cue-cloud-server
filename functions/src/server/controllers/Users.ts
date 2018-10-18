import * as functions from 'firebase-functions'

export const onUpdate = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
    
    return change.after.ref.set({
        name_change_count: 4
      }, {merge: true});
});
