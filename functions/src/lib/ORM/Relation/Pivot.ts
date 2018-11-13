import { plural } from 'pluralize'
import { Change } from 'firebase-functions'
import ModelImpl from "../Models";
import { Many2ManyRelation } from '.';

export class Pivot {

    private db: FirebaseFirestore.Firestore
    private ownerA: ModelImpl
    private ownerB: ModelImpl

    private model: ModelImpl

    constructor(db: FirebaseFirestore.Firestore, id: string, ownerA: ModelImpl, ownerB: ModelImpl, resourceName?: string)
    {
        this.db = db
        
        if(resourceName)
        {
            const srcParts = resourceName.split('/')
            const identifier = srcParts.slice(srcParts.length-2, srcParts.length)
            const pivotName = identifier[0]
            const pivotId = identifier[1]

            const modelNames = pivotName.split('_')
            const modelIds = pivotId.split('_')
        
            this.ownerA = new ModelImpl(modelNames[0], db, null, modelIds[0])
            this.ownerB = new ModelImpl(modelNames[1], db, null, modelIds[1])

            this.model = new ModelImpl(pivotName, db, null, pivotId)
        }
        else
        {
            this.ownerA = ownerA
            this.ownerB = ownerB

            const pivotName = [ownerA.name, ownerB.name].sort().join('_')

            this.model = new ModelImpl(pivotName, db, null, id)
        }
    }

    async getId(): Promise<string>
    {
        return this.model.getId()
    }

    getName(): string
    {
        return this.model.name
    }

    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<ModelImpl>
    {
        const relationA = this.ownerA[plural(this.ownerB.name)]() as Many2ManyRelation
        // const relationB = this.ownerA[pluralize(this.ownerB.name)]() as Many2ManyRelation

        // relationA.updateCache()

        return new ModelImpl('make', this.db)
    }
}