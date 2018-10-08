import ModelImpl, { Model } from "./Model";

export interface Relation {
    getColRef(): FirebaseFirestore.CollectionReference
    getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    getId(): Promise<string>
    attach(model: ModelImpl): Promise<RelationImpl>
    update(data: any): Promise<RelationImpl>
    pivot(data: any): Promise<RelationImpl>
}

export default class RelationImpl implements Relation {

    owner: ModelImpl
    property: ModelImpl
    db: FirebaseFirestore.Firestore
    ref: FirebaseFirestore.DocumentReference

    constructor(owner: ModelImpl, property: ModelImpl, db: FirebaseFirestore.Firestore)
    {
        this.owner = owner
        this.property = property
        this.db = db
    }

    getColRef(): FirebaseFirestore.CollectionReference
    {
        return this.db.collection(`${this.owner.name}_${this.property.name}`)
    }

    private setPropertyModel(property: ModelImpl)
    {
        this.property = property
    }

    async getId(): Promise<string>
    {
        const ownerId = await this.owner.getId()
        const propertyId = await this.property.getId()
        return `${ownerId}_${propertyId}`
    }

    async getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    {
        const id: string = await this.getId()
        if(!this.ref) this.ref = this.getColRef().doc(id)
        return this.ref
    }
    
    async attach(model: ModelImpl): Promise<RelationImpl>
    {
        this.setPropertyModel(model)

        const docRef = await this.getDocRef()

        const relData = {
            [this.owner.name]    : { id : await this.owner.getId()},
            [this.property.name] : { id : await this.property.getId()},
        }

        await docRef.set(relData, { merge: true })

        await this.owner.update({
            [this.property.name] : { id : await this.property.getId()}
        })

        await this.property.update({
            [this.owner.name] : { id : await this.owner.getId()}
        })

        return this
    }

    async update(data: any): Promise<RelationImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        
        await docRef.set(data, {
            merge: true
        })

        return this
    }

    async pivot(pivotData: any): Promise<RelationImpl>
    {
        const docRef = await this.getDocRef()
        await docRef.set({
            pivot : pivotData
        }, { merge: true })

        return this
    }
}

export class ManyToMany extends RelationImpl {

   
}