import * as _ from 'lodash'
import * as uniqid from 'uniqid'
import ModelImpl from "../lib/ORM/Models";
import IActionableFieldCommand from '../lib/Command/Command';
import { ModelImportStategy } from "../lib/ORM/Relation";

export enum Stubs {
    CAR         = 'cars',
    WHEEL       = 'wheels',
    DRIVER      = 'drivers',
    WIND_SHEILD = 'wind_sheild'
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