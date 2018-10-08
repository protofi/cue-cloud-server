import RelationImpl, { Relation, ManyToMany } from "./Relations";

export enum Models {
    USER = 'users',
    HOUSEHOLD = 'households'
}

export interface Model{
    getDocRef(): FirebaseFirestore.DocumentReference
    getId(): Promise<string>
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete()

    hasMany(property: ModelImpl): RelationImpl
    belongsToMany(owner: ModelImpl): RelationImpl
}
export default class ModelImpl implements Model {

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

    async getId(): Promise<string>
    {
        return await this.getDocRef().id
    }

    async create(data: object): Promise<ModelImpl>
    {
        await this.getDocRef().set(data)
        return this
    }

    async find(id: string): Promise<ModelImpl>
    {
        this.doc = await this.getDocRef(id).get()
        return this
    }

    async getField(key: string): Promise<any>
    {
        if(this.doc) return this.doc.get(key)

        const id = await this.getId()
        if(!id) return null

        await this.find(id)
        return this.getField(key)
    }

    async update(data: object): Promise<ModelImpl>
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

    hasMany(property: ModelImpl): RelationImpl
    {
        return new ManyToMany(this, property, this.db)
    }

    belongsToMany(owner: ModelImpl): RelationImpl
    {
        return new ManyToMany(owner, this, this.db)
    }
}

export class User extends ModelImpl {

    constructor(db: any)
    {
        super(Models.USER, db)
    }

    households(): RelationImpl
    {
        const households: ModelImpl = new ModelImpl(Models.HOUSEHOLD, this.db)
        return this.hasMany(households)
    }
}

export class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): RelationImpl
    { 
        const users: ModelImpl = new ModelImpl(Models.USER, this.db)
        return this.belongsToMany(users)
    }
}