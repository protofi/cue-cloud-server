export enum Models {
    HOUSEHOLD = 'households',
    SENSOR = 'sensors',
    ROOMS = 'rooms',
    USER = 'users'
}

export interface Relation {
    attach(model: ModelImpl): Promise<RelationModel>
    pivot(data: any): Promise<RelationModel>
}

export interface Model{
    getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    getId(): Promise<string>
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete()

    haveMany(model: String): RelationModel
    belongToMany(owner: ModelImpl): RelationModel
}

export default class ModelImpl implements Model {

    name: string
    ref: FirebaseFirestore.DocumentReference
    doc: FirebaseFirestore.DocumentSnapshot
    db: FirebaseFirestore.Firestore

    relations: Map<string, RelationModel>
    
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

    haveMany(model: string): RelationModel
    {
        if(!this.relations.has(model))
        {
            const property: ModelImpl = new ModelImpl(model, this.db)
            const relation: RelationModel = new RelationModel(this, property, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model)
    }

    belongToMany(owner: ModelImpl): RelationModel
    {
        return new RelationModel(owner, this, this.db)
    }
}

export class RelationModel extends ModelImpl implements Relation{

    owner: ModelImpl
    property: ModelImpl

    constructor(owner: ModelImpl, property: ModelImpl, db: any)
    {
        const name = `${owner.name}_${property.name}`
        super(name, db)

        this.owner = owner
        this.property = property
    }

    private setPropertyModel(property: ModelImpl)
    {
        this.property = property
    }

    async getDocRef(id?: string): Promise<FirebaseFirestore.DocumentReference>
    {
        const ownerId = await this.owner.getId()
        const propertyId = await this.property.getId()

        return super.getDocRef(`${ownerId}_${propertyId}`)
    }

    async attach(model: ModelImpl): Promise<RelationModel>
    {
        this.setPropertyModel(model)

        const docRef = await this.getDocRef()

        const relData = {
            [this.owner.name]    : { id : await this.owner.getId()},
            [this.property.name] : { id : await this.property.getId()},
        }

        await docRef.set(relData, { merge: true })

        await this.owner.update({
            [this.property.name] : {[await this.property.getId()] : true}
        })

        await this.property.update({
            [this.owner.name] : {[await this.owner.getId()] : true}
        })

        return this
    }

    async pivot(pivotData: any): Promise<RelationModel>
    {
        const docRef = await this.getDocRef()
        await docRef.set({
            pivot : pivotData
        }, { merge: true })

        return this
    }
}