export enum Collection {
    USERS = 'users',
    HOUSEHOLDS = 'households'
}

export interface Collections {
    get(id: string): Promise<any>
    set(id: string, data: object)
    add(data: object)
}

export default class CollectionsImpl implements Collections {
    private db: any
    name: string

    constructor(name: string, db: any)
    {
        this.name = name
        this.db = db
    }

    get(id: string)
    {
        return this.db.collection(this.name).doc(id).get() 
    }

    set(id: string, data: object)
    {
        this.db.collection(this.name).doc(id).set(data)
    }

    add(data: object)
    {
        this.db.collection(this.name).add(data)
    }
}

