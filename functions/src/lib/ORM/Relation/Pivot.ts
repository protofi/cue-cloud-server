import { plural } from 'pluralize'
import { Change } from 'firebase-functions'
import ModelImpl from "../Models";
import { Many2ManyRelation } from '.';

export class Pivot {

    private db: FirebaseFirestore.Firestore
    private ownerA: ModelImpl
    private ownerB: ModelImpl

    private model: ModelImpl

    constructor(db: FirebaseFirestore.Firestore, id: string, ownerA: ModelImpl, ownerB: ModelImpl)
    {
        this.db = db
        
        this.ownerA = ownerA
        this.ownerB = ownerB

        const pivotName = [ownerA.name, ownerB.name].sort().join('_')

        this.model = new ModelImpl(pivotName, db, null, id)
    }

    getId(): string
    {
        return this.model.getId()
    }

    getName(): string
    {
        return this.model.name
    }

    async exists(): Promise<boolean>
    {
        return this.model.exists()
    }

    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    {
        const relationA = this.ownerA[plural(this.ownerB.name)]() as Many2ManyRelation
        const relationB = this.ownerB[plural(this.ownerA.name)]() as Many2ManyRelation

        await relationA.updateCache(change)
        await relationB.updateCache(change)

        return
    }
}