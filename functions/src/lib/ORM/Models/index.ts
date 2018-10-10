import RelationImpl, { Many2ManyRelation, N2ManyRelation, One2ManyRelation, One2OneRelation } from "../Relation";

export enum Models {
    HOUSEHOLD = 'households',
    SENSOR = 'sensors',
    ROOM = 'rooms',
    USER = 'users'
}

export interface Model{
    getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    getId(): Promise<string>
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete()

    belongsToMany(model: String): RelationImpl
}

export default class ModelImpl implements Model {

    name: string
    private ref: FirebaseFirestore.DocumentReference
    private doc: FirebaseFirestore.DocumentSnapshot
    private db: FirebaseFirestore.Firestore

    private relations: Map<string, RelationImpl>
    
    constructor(name: string, db: FirebaseFirestore.Firestore, id?: string)
    {
        this.name = name
        this.db = db
        this.relations = new Map()
        if(id) this.getDocRef(id)
    }

    protected getColRef(): FirebaseFirestore.CollectionReference
    {
        return this.db.collection(this.name)
    }

    async getDocRef(id?: string): Promise<FirebaseFirestore.DocumentReference>
    {
        if(id) this.ref = this.getColRef().doc(id)
        if(!this.ref) this.ref = this.getColRef().doc()
        return this.ref
    }

    async getId(): Promise<string>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        return docRef.id
    }

    async create(data: object): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        await docRef.set(data)
        return this
    }

    async find(id: string): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef(id)
        this.doc = await docRef.get()
        return this
    }

    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    {
        return this.getColRef().where(fieldPath, operator, value)
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
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        
        await docRef.set(data, {
            merge: true
        })

        this.doc = null
        return this
    }

    async delete()
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        await docRef.delete()
        this.doc = null
        this.ref = null
    }

    belongsToMany(model: string): Many2ManyRelation
    {
        if(!this.relations.has(model))
        {
            const relation: Many2ManyRelation = new Many2ManyRelation(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model) as Many2ManyRelation
    }
    
    hasMany(model: string): One2ManyRelation
    {
        if(!this.relations.has(model))
        {
            const relation: One2ManyRelation = new One2ManyRelation(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model) as One2ManyRelation
    }

    belongsTo(model: string): One2OneRelation
    {
        if(!this.relations.has(model))
        {
            const relation: One2OneRelation = new One2OneRelation(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model) as One2OneRelation
    }
}