
export enum Collection {
    USERS = 'users',
    HOUSEHOLDS = 'households'
}

export interface Collections {
    get(id: string): Promise<any>
    getDocRef()
    set(id: string, data: object): Promise<any>
    add(data: object): Promise<any>
    delete(id: string): Promise<any>
}

export default class CollectionsImpl implements Collections {
    protected db: any
    name: string

    constructor(name: string, db: any)
    {
        this.name = name
        this.db = db
    }

    get(id?: string): Promise<any>
    {
        if(id) return this.getDocRef(id).get()
        else return this.getDocRef().get() 
    }

    getDocRef(id?: string)
    {
        if(id) return this.db.collection(this.name).doc(id)
        else return this.db.collection(this.name).doc()
    }

    set(id: string, data: object): Promise<any>
    {
        return this.db.collection(this.name).doc(id).set(data)
    }

    add(data: object): Promise<any>
    {
        return this.db.collection(this.name).add(data)
    }

    delete(id: string): Promise<any>
    {
        return this.db.collection(this.name).doc(id).delete() 
    }
}

