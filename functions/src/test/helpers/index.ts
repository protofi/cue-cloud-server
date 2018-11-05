import * as firestore from '@firebase/testing'
import * as fs from 'fs'

export async function setup(auth?: any, data?: any): Promise<firebase.firestore.Firestore>
{
    const projectId = `test-app-${Date.now()}`

    const app = firestore.initializeTestApp({
        projectId : projectId,
        auth: auth
    })
    
    const db = app.firestore()

    for(const key in data)
    {
        const ref = db.doc(key)
        await ref.set(data[key])
    }

    await firestore.loadFirestoreRules({
        projectId: projectId,
        rules: fs.readFileSync('./../firestore.rules', 'utf8')
    })

    return db
}