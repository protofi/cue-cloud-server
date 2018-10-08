import ModelImpl, { Model } from "./Model";

export interface Relation {
    getColRef(): FirebaseFirestore.CollectionReference
    getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    getId(): Promise<string>
    attach(model: ModelImpl): Promise<RelationImpl>
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
        const docRef = await this.getDocRef()
        const pivotData = {
            [this.owner.name] : { id : await this.owner.getId()},
            [this.property.name] : { id : await this.property.getId()},
        }
        await docRef.set(pivotData, { merge: true })

        return this
    }

    async pivot(pivotData: any): Promise<RelationImpl>
    {
        const docRef = await this.getDocRef()
        await docRef.set(pivotData, { merge: true })

        return this
    }

    // async create(data: any): Promise<Relation>
    // {
    //     const docRef = await this.getDocRef()
    //     await docRef.set(data)
    //     return this
    // }
}

export class ManyToMany extends RelationImpl {

   
}