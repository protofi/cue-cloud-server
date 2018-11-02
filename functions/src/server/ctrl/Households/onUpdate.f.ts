import * as functions from 'firebase-functions'

exports = module.exports = functions.firestore.document('households/{householdId}').onUpdate((change, context) => {

    console.log('OYI')

    return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve('foo')
        }, 300)
      })
})