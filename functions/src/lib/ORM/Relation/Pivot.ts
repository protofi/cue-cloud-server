import { pluralize } from 'pluralize'
import ModelImpl from "../Models";
import { Many2ManyRelation } from '.';

export class Pivot {

    private db: FirebaseFirestore.Firestore
    private owner: ModelImpl
    private property: ModelImpl

    private model: ModelImpl

    constructor(db: FirebaseFirestore.Firestore, id: string, owner: ModelImpl, property: ModelImpl, resourceName?: string)
    {
        this.db = db
        
        if(resourceName)
        {
            const srcParts = resourceName.split('/')
            const pivotName = srcParts[0]
            const pivotId = srcParts[1]

            const modelNames = pivotName.split('_')
            const modelIds = pivotId.split('_')
        
            this.owner = new ModelImpl(modelNames[0], db, null, modelIds[0])
            this.property = new ModelImpl(modelNames[1], db, null, modelIds[1])

            this.model = new ModelImpl(pivotName, db, null, pivotId)
        }
        else
        {
            this.owner = owner
            this.property = property

            const pivotName = [owner.name, property.name].sort().join('_')

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

    async updateCache(): Promise<void>
    {
        // const r = this.owner[pluralize(this.property.name)]() as Many2ManyRelation
        return
    }
}