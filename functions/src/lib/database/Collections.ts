import { DocumentSnapshot } from "@google-cloud/firestore";

export enum Collection {
    USERS = 'users',
    HOUSEHOLDS = 'households'
}

export interface Collections {
    get(id: string): Promise<DocumentSnapshot>
    set(id: string, data: object): Promise<DocumentSnapshot>
    add(data: object): Promise<DocumentSnapshot>
    delete(id: string): Promise<DocumentSnapshot>
}

export default class CollectionsImpl implements Collections {
    private db: any
    name: string

    constructor(name: string, db: any)
    {
        this.name = name
        this.db = db
    }

    async get(id: string): Promise<DocumentSnapshot>
    {
        return this.db.collection(this.name).doc(id).get() 
    }

    async set(id: string, data: object): Promise<DocumentSnapshot>
    {
        return this.db.collection(this.name).doc(id).set(data)
    }

    async add(data: object): Promise<DocumentSnapshot>
    {
        return this.db.collection(this.name).add(data)
    }

    async delete(id: string): Promise<DocumentSnapshot>
    {
        return this.db.collection(this.name).doc(id).delete() 
    }
}

