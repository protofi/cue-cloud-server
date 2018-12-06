import RelationImpl, { Many2ManyRelation, One2ManyRelation, N2OneRelation } from "../Relation"
import { Change } from "firebase-functions";
import * as flatten from 'flat'
import { difference, asyncForEach } from "../../util";
import { IActionableFieldCommand } from "../../Command";

export enum Models {
    HOUSEHOLD = 'households',
    SENSOR = 'sensors',
    EVENT = 'events',
    ROOM = 'rooms',
    USER = 'users'
}

export interface Model{
    getDocRef(id?: string): FirebaseFirestore.DocumentReference
    getId(): string
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    defineActionableField(field: string, command: IActionableFieldCommand): void
    delete(): Promise<void>
}

export default class ModelImpl implements Model {

    private ref: FirebaseFirestore.DocumentReference
    private snap: FirebaseFirestore.DocumentSnapshot
    readonly name: string
    protected db: FirebaseFirestore.Firestore

    protected actionableFields: Map<string, IActionableFieldCommand> = new Map<string, IActionableFieldCommand>()
    protected relations: Map<string, RelationImpl>
    
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

    getId(): string
    {
        return this.getDocRef().id
    }

    async create(data: object, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = this.getDocRef()
    
        if(transaction)
        {
            transaction.set(docRef, data, {
                merge : false
            })
        }
        else await docRef.set(data, {
            merge : false
        })
    
        return this
    }

    async find(id: string): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = this.getDocRef(id)
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

        const id = this.getId()
        if(!id) return null

        await this.find(id)

        return this.getField(key)
    }

    async update(data: object, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = this.getDocRef()
        
        if(transaction)
        {
            transaction.update(docRef, flatten(data))
        }
        else 
        {
            await docRef.update(flatten(data))
        }

        this.snap = null
        return this
    }

    async updateOrCreate(data: object, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = this.getDocRef()
        
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
        const docRef: FirebaseFirestore.DocumentReference = this.getDocRef()
        await docRef.delete()
        
        this.snap = null
        this.ref = null
    }

    /**
     * Attach many models to many others
     */
    protected belongsToMany(property: string): Many2ManyRelation
    {
        if(!this.relations.has(property))
        {
            const relation: Many2ManyRelation = new Many2ManyRelation(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as Many2ManyRelation
    }

    /**
     * Attach one model to many others
     */
    protected hasMany(property: string): One2ManyRelation
    {
        if(!this.relations.has(property))
        {
            const relation: One2ManyRelation = new One2ManyRelation(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as One2ManyRelation
    }

    /**
     * Attach one or more models to one other
     */
    protected belongsTo(property: string): N2OneRelation
    {
        if(!this.relations.has(property))
        {
            const relation: N2OneRelation = new N2OneRelation(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as N2OneRelation
    }

    defineActionableField(field: string, command: IActionableFieldCommand): void
    {
        this.actionableFields.set(field, command)
    }

    async takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    {
        const beforeData = change.before.data()
        const afterData = change.after.data()
        
        const changes = (beforeData) ? difference(beforeData, afterData) : afterData

        await asyncForEach(Object.keys(changes),
            async (field) => {
                const command = this.actionableFields.get(field)
                if(command) await command.execute(this, changes[field] as string)

                return
        })
    }
}