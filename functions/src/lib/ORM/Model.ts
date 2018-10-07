import { throws } from "assert";

export enum Models {
    USER = 'Users'
}

export interface Model{
    getDocRef(): FirebaseFirestore.DocumentReference
    getId(): string
    create(data: object): Promise<ModelImp>
    find(id: string): Promise<ModelImp>
    getField(key: string): any
    update(data: object): Promise<ModelImp>
    delete()
}

export default class ModelImp implements Model {

    name: string
    ref: FirebaseFirestore.DocumentReference
    doc: FirebaseFirestore.DocumentSnapshot
    db: FirebaseFirestore.Firestore
    
    constructor(name: string, db: FirebaseFirestore.Firestore)
    {
        this.name = name
        this.db = db
    }

    protected getColRef(): FirebaseFirestore.CollectionReference
    {
        return this.db.collection(this.name)
    }

    getDocRef(id?: string): FirebaseFirestore.DocumentReference
    {
        if(id) this.ref = this.getColRef().doc(id)
        if(!this.ref) this.ref = this.getColRef().doc()
        return this.ref
    }

    getId(): string
    {
        if(this.ref) return this.ref.id
        return null
    }

    async create(data: object): Promise<ModelImp>
    {
        await this.getDocRef().set(data)
        return this
    }

    async find(id: string): Promise<ModelImp>
    {
        this.doc = await this.getDocRef(id).get()
        return this
    }

    async getField(key: string): Promise<any>
    {
        if(this.doc) return this.doc.get(key)

        if(!this.getId()) return null

        await this.find(this.getId())
        return this.getField(key)
    }

    async update(data: object): Promise<ModelImp>
    {
        await this.getDocRef().set(data, {
            merge: true
        })

        this.doc = null
        return this
    }

    async delete()
    {
        await this.getDocRef().delete()
        this.doc = null
        this.ref = null
    }
}

export class User extends ModelImp {

    constructor(name: string,  db: any)
    {
        super(name, db)
    }
}