import * as functions from 'firebase-functions'
import { Models } from '../../lib/ORM/Models'

exports = module.exports = functions.firestore
.document(`${Models.HOUSEHOLD}/{householdId}`)
.onUpdate((change, context) => {

    console.log('OYI BOI HOUSEHOLD')
  
    return Promise.resolve()
})