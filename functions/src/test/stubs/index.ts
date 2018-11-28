import * as uniqid from 'uniqid'
import ModelImpl from "../lib/ORM/Models";
import { Many2ManyRelation, N2OneRelation, One2ManyRelation } from "../lib/ORM/Relation";

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