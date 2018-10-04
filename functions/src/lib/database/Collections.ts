
export enum Collection {
    USERS = 'users',
    HOUSEHOLDS = 'households'
}

export interface Collections {
    get(id: string): Promise<any>
    set(id: string, data: object): Promise<any>
    add(data: object): Promise<any>
    delete(id: string): Promise<any>
}

export default class CollectionsImpl implements Collections {
    private db: any
    name: string

    constructor(name: string, db: any)
    {
        this.name = name
        this.db = db
    }

    async get(id: string): Promise<any>
    {
        return this.db.collection(this.name).doc(id).get() 
    }

    async set(id: string, data: object): Promise<any>
    {
        return this.db.collection(this.name).doc(id).set(data)
    }

    async add(data: object): Promise<any>
    {
        return this.db.collection(this.name).add(data)
    }

    async delete(id: string): Promise<any>
    {
        return this.db.collection(this.name).doc(id).delete() 
    }
}

