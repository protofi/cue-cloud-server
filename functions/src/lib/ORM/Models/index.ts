import RelationImpl, { Many2ManyRelation, One2ManyRelation, Many2OneRelation } from "../Relation"
import { Change } from "firebase-functions";
import * as flatten from 'flat'
import { difference, asyncForEach } from "../../util";
import { IActionableFieldCommand } from "../../Command";
import { Errors } from "../../const";

export enum Models {
    BASE_STATION = 'base_stations',
    HOUSEHOLD = 'households',
    SENSOR = 'sensors',
    EVENT = 'events',
    ROOM = 'rooms',
    USER = 'users',

    SECURE_SURFIX = '_secure'
}

export interface Model{
    exists(): Promise<boolean>
    getDocRef(id?: string): FirebaseFirestore.DocumentReference
    getId(): string
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete(): Promise<void>
    defineActionableField(field: string, command: IActionableFieldCommand): void
    takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    onCreate(): Promise<void>
    onDelete(): Promise<void>
}

export default class ModelImpl implements Model {

    protected hasSecureData: Boolean = false
    private ref: FirebaseFirestore.DocumentReference
    private docSnap: FirebaseFirestore.DocumentSnapshot
    readonly name: string
    protected db: FirebaseFirestore.Firestore

    protected actionableFields: Map<string, IActionableFieldCommand> = new Map<string, IActionableFieldCommand>()
    protected relations: Map<string, RelationImpl>
    
    constructor(name: string, db: FirebaseFirestore.Firestore, docSnap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        this.name = name
        this.db = db
        this.relations = new Map()
        
        if(docSnap)
        {
            this.ref = docSnap.ref
            this.docSnap = docSnap
        }
        else if(id) this.getDocRef(id)
    }

    async exists(): Promise<boolean>
    {
        await this.getDocSnap()
        return this.docSnap.exists
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

    private async getDocSnap(): Promise<FirebaseFirestore.DocumentSnapshot>
    {
        if(this.docSnap) return this.docSnap

        this.docSnap = await this.getDocRef(this.getId()).get()
        return this.docSnap
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
        this.docSnap = await docRef.get()

        return this
    }

    async findOrFail(id: string): Promise<ModelImpl>
    {
        await this.find(id)
        if(!this.docSnap.exists) throw Error(Errors.MODEL_NOT_FOUND)
        return this
    }

    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    {
        return this.getColRef().where(fieldPath, operator, value)
    }

    async getField(key: string): Promise<any>
    {
        //if Document Snapshot exist fetch field from that
        if(this.docSnap) return this.docSnap.get(key)

        //If not get Id and return null, if Id does not exist (model)
        const id = this.getId()
        if(!id) return null

        //If Id exists fetch model
        await this.find(id)

        //Recursive call
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

        this.docSnap = null
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

        this.docSnap = null
        return this
    }

    async delete(): Promise<void>
    {
        const docRef: FirebaseFirestore.DocumentReference = this.getDocRef()
        await docRef.delete()
        
        this.docSnap = null
        this.ref = null
    }

    /**
     * Attach many models to many others
     */
    protected haveMany(property: string): Many2ManyRelation
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
    protected hasMany(property: string, isWeak?: boolean): One2ManyRelation
    {
        if(!this.relations.has(property))
        {
            const relation: One2ManyRelation = new One2ManyRelation(this, property, this.db, isWeak)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as One2ManyRelation
    }

    /**
     * Attach one or more models to one other
     */
    protected haveOne(property: string): Many2OneRelation
    {
        if(!this.relations.has(property))
        {
            const relation: Many2OneRelation = new Many2OneRelation(this, property, this.db)
            this.relations.set(property, relation)
        }

        return this.relations.get(property) as Many2OneRelation
    }

    defineActionableField(field: string, command: IActionableFieldCommand): void
    {
        this.actionableFields.set(field, command)
    }

    async takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    {
        const beforeData = (change.before.data()) ? change.before.data() : {}
        const afterData = (change.after.data()) ? change.after.data() : {}
        
        const changes = (beforeData) ? difference(beforeData, afterData) : afterData

        await asyncForEach(Object.keys(changes),
            async (field) => {
                const command = this.actionableFields.get(field)

                if(command) await command.execute(this, changes[field], afterData[field], beforeData[field])

                return
        })
    }

    secure() : ModelImpl
    {
        return new ModelImpl(`${this.name}${Models.SECURE_SURFIX}`, this.db, null, this.getId())
    }

    async onCreate(): Promise<void>
    {
        if(this.hasSecureData)
            await this.secure().create({})

        return
    }

    async onDelete(): Promise<void>
    {
        if(this.hasSecureData)
            return this.secure().delete()

        return
    }
}