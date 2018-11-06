import RelationImpl, { Many2ManyRelation, One2ManyRelation, N2OneRelation } from "../Relation";
import * as flattern from 'flat'

export enum Models {
    HOUSEHOLD = 'households',
    SENSOR = 'sensors',
    EVENT = 'events',
    ROOM = 'rooms',
    USER = 'users'
}

export interface Model{
    getDocRef(id?: string): FirebaseFirestore.DocumentReference
    getId(): Promise<string>
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete(): Promise<void>
}

export default class ModelImpl implements Model {

    readonly name: string
    private ref: FirebaseFirestore.DocumentReference
    private snap: FirebaseFirestore.DocumentSnapshot
    private db: FirebaseFirestore.Firestore

    private relations: Map<string, RelationImpl>
    
    constructor(name: string, db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        this.name = name
        this.db = db
        this.relations = new Map()
        
        if(snap)
        {
            this.ref = snap.ref
            this.snap = snap
        }
        else if(id) this.getDocRef(id)
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
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        return docRef.id
    }

    async create(data: object, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
    
        if(transaction)
        {
            transaction.set(docRef, data)
        }
        else await docRef.set(data)
    
        return this
    }

    async find(id: string): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef(id)
        this.snap = await docRef.get()

        return this
    }

    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    {
        return this.getColRef().where(fieldPath, operator, value)
    }

    async getField(key: string): Promise<any>
    {
        if(this.snap) return this.snap.get(key)

        const id = await this.getId()
        if(!id) return null

        await this.find(id)
        return this.getField(key)
    }

    async update(data: object, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        
        if(transaction)
        {
            transaction.update(docRef, flattern(data))
        }
        else 
        {
            await docRef.update(flattern(data))
        }

        this.snap = null
        return this
    }

    async updateOrCreate(data: object, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        
        if(transaction)
        {
            transaction.set(docRef, data,
                {
                    merge: true
                })
        }
        else 
        {
            await docRef.set(data,
                {
                    merge: true
                })
        }

        this.snap = null
        return this
    }

    async delete(): Promise<void>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        await docRef.delete()
        this.snap = null
        this.ref = null
    }

    /**
     * Attach many models to many others
     */
    protected belongsToMany(model: string): Many2ManyRelation
    {
        if(!this.relations.has(model))
        {
            const relation: Many2ManyRelation = new Many2ManyRelation(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model) as Many2ManyRelation
    }

    /**
     * Attach one model to many others
     */
    protected hasMany(model: string): One2ManyRelation
    {
        if(!this.relations.has(model))
        {
            const relation: One2ManyRelation = new One2ManyRelation(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model) as One2ManyRelation
    }

    /**
     * Attach one or more models to one other
     */
    protected belongsTo(model: string): N2OneRelation
    {
        if(!this.relations.has(model))
        {
            const relation: N2OneRelation = new N2OneRelation(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model) as N2OneRelation
    }
}