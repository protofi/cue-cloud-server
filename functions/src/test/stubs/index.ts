import * as uniqid from 'uniqid'
import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, N2OneRelation, One2ManyRelation, ModelImportStategy } from "../lib/ORM/Relation";
import IActionableFieldCommand from '../lib/Command/Command';

export class Driver extends ModelImpl {
    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('drivers', db, snap, id)
    }

    cars(): Many2ManyRelation
    {
        return this.belongsToMany('cars')
    }
}
export class Car extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('cars', db, snap, id)
    }

    drivers(): Many2ManyRelation
    {
        return this.belongsToMany('drivers')
    }

    windShield(): N2OneRelation
    {
        return this.belongsTo('wind_sheild')
    }

    wheels(): One2ManyRelation
    {
        return this.hasMany('wheels')
    }
}
export class WindSheild extends ModelImpl {

    constructor(db: FirebaseFirestore.Firestore, snap?: FirebaseFirestore.DocumentSnapshot, id?: string)
    {
        super('wind_sheild', db, snap, id)
    }

    car(): N2OneRelation
    {
        return this.belongsTo('cars')
    }
}

export interface OfflineDocumentSnapshot {
    data?: any
    ref?: any
    get?: any
}

export class OfflineDocumentSnapshotStub {
    public ref: Object = { id : uniqid() }
    private docData: Object = new Object()

    constructor(docSnap?: OfflineDocumentSnapshot)
    {
        if(!docSnap) return
        if(docSnap.data) this.docData = docSnap.data
        if(docSnap.ref) this.ref = docSnap.ref
    }

    data(): Object
    {
        return this.docData
    }

    async get(field): Promise<Object>
    {
        return this.docData[field]
    }
}

export class ActionableFieldCommandStub implements IActionableFieldCommand {
    async execute(owner: ModelImpl, field: string): Promise<void> {
        return
    }
    async undo(): Promise<void> {
        return
    }
}

export class ModelImportStrategyStub implements ModelImportStategy{
    private path: string
    
    constructor(modulePath: string)
    {
        this.path = modulePath
    }
    async import(db_: FirebaseFirestore.Firestore, name: string, id: string): Promise<ModelImpl> {
        const model = await import(this.path)
        const property = new model.default(db_, null, id)
        return property
    }
} 