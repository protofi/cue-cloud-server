import RelationImpl, { Relation, ManyToMany } from "./Relations";

export enum Models {
    USER = 'users',
    HOUSEHOLD = 'households',
    ROOMS = 'rooms',
    SENSOR = 'sensors'
}

export interface Model{
    getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    getId(): Promise<string>
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete()

    hasMany(model: String): RelationImpl
    belongsToMany(owner: ModelImpl): RelationImpl
}
export default class ModelImpl implements Model {

    name: string
    ref: FirebaseFirestore.DocumentReference
    doc: FirebaseFirestore.DocumentSnapshot
    db: FirebaseFirestore.Firestore

    relations: Map<string, RelationImpl>
    
    constructor(name: string, db: FirebaseFirestore.Firestore)
    {
        this.name = name
        this.db = db
        this.relations = new Map()
    }

    protected getColRef(): FirebaseFirestore.CollectionReference
    {
        return this.db.collection(this.name)
    }

    async getDocRef(id?: string): Promise<FirebaseFirestore.DocumentReference>
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

    async create(data: object): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        await docRef.set(data)
        return this
    }

    async find(id: string): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef(id)
        this.doc = await docRef.get()
        return this
    }

    async getField(key: string): Promise<any>
    {
        if(this.doc) return this.doc.get(key)

        const id = await this.getId()
        if(!id) return null

        await this.find(id)
        return this.getField(key)
    }

    async update(data: object): Promise<ModelImpl>
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        
        await docRef.set(data, {
            merge: true
        })

        this.doc = null
        return this
    }

    async delete()
    {
        const docRef: FirebaseFirestore.DocumentReference = await this.getDocRef()
        await docRef.delete()
        this.doc = null
        this.ref = null
    }

    hasMany(model: string): RelationImpl
    {
        if(!this.relations.has(model))
        {
            const property: ModelImpl = new ModelImpl(model, this.db)
            const relation: RelationImpl = new ManyToMany(this, property, this.db)
            this.relations.set(model,relation)
        }
        
        return this.relations.get(model)
    }

    belongsToMany(owner: ModelImpl): RelationImpl
    {
        return new ManyToMany(owner, this, this.db)
    }
}

export class RelationModel extends ModelImpl{

    owner: ModelImpl
    property: ModelImpl

    constructor(owner: ModelImpl, property: ModelImpl, db: any)
    {
        const name = `${owner.name}_${property.name}`
        super(name, db)

        this.owner = owner
        this.property = property
    }

    async getDocRef(id?: string): Promise<FirebaseFirestore.DocumentReference>
    {
        const ownerId = await this.owner.getId()
        const propertyId = await this.property.getId()

        return super.getDocRef(`${ownerId}_${propertyId}`)
    }
}

export class User extends ModelImpl {

    constructor(db: any)
    {
        super(Models.USER, db)
    }

    households(): RelationImpl
    {
        return this.hasMany(Models.HOUSEHOLD)
    }
}

export class Household extends ModelImpl {

    constructor(db: any)
    {
        super(Models.HOUSEHOLD, db)
    }

    users(): RelationImpl
    { 
        const users: ModelImpl = new ModelImpl(Models.USER, this.db)
        return this.belongsToMany(users)
    }
}

export class Sensor extends ModelImpl {

    constructor(db: any)
    {
        super(Models.SENSOR, db)
    }
}