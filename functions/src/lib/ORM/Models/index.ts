export enum Models {
    HOUSEHOLD = 'households',
    SENSOR = 'sensors',
    ROOMS = 'rooms',
    USER = 'users'
}

export interface Model{
    getDocRef(): Promise<FirebaseFirestore.DocumentReference>
    getId(): Promise<string>
    create(data: object): Promise<ModelImpl>
    find(id: string): Promise<ModelImpl>
    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    getField(key: string): any
    update(data: object): Promise<ModelImpl>
    delete()

    hasMany(model: String): RelationImpl
}

export default class ModelImpl implements Model {

    name: string
    ref: FirebaseFirestore.DocumentReference
    doc: FirebaseFirestore.DocumentSnapshot
    db: FirebaseFirestore.Firestore

    private relations: Map<string, RelationImpl>
    
    constructor(name: string, db: FirebaseFirestore.Firestore, id?: string)
    {
        this.name = name
        this.db = db
        this.relations = new Map()
        if(id) this.getDocRef(id)
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

    where(fieldPath: string, operator: FirebaseFirestore.WhereFilterOp, value: string): FirebaseFirestore.Query
    {
        return this.getColRef().where(fieldPath, operator, value)
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
            const relation: RelationImpl = new RelationImpl(this, model, this.db)
            this.relations.set(model, relation)
        }

        return this.relations.get(model)
    }
}

export interface Relation {
    attach(model: ModelImpl): Promise<RelationImpl>
    get(): Promise<Array<ModelImpl>>
    pivot(id: string): Promise<ModelImpl>
}

export class RelationImpl implements Relation{

    db: any
    name: string
    owner: ModelImpl
    propertyModelName: string
    private properties: Set<ModelImpl>

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        this.name = [owner.name, propertyModelName].sort().join('_')
        
        this.db = db

        this.properties = new Set<ModelImpl>()
        this.owner = owner
        this.propertyModelName = propertyModelName
    }

    private async generatePivotId(id: string): Promise<string>
    {
        return [{
                    name: this.propertyModelName,
                    id: id
                },{
                    name: this.owner.name,
                    id: await this.owner.getId()
                }
            ].sort((A, B) => {
                if (A.name < B.name) return -1
                if (A.name > B.name) return 1
                return 0 
            }).map((part) => {
                return part.id
            }).join('_')
    }

    async attach(newPropModel: ModelImpl): Promise<RelationImpl>
    {
        this.properties.add(newPropModel)

        const id: string = await this.generatePivotId(await newPropModel.getId())

        const pivotModel: ModelImpl = new ModelImpl(this.name, this.db, id)

        const relData = {
            [this.owner.name]           : { id : await this.owner.getId()},
            [this.propertyModelName]    : { id : await newPropModel.getId()}
        }

        await pivotModel.create(relData)

        await this.owner.update({
            [this.propertyModelName] : {[await newPropModel.getId()] : true}
        })

        await newPropModel.update({
            [this.owner.name] : {[await this.owner.getId()] : true}
        })

        return this
    }

    async pivot(id: string): Promise<ModelImpl>
    {
        const pivotId: string = await this.generatePivotId(id)
        return new ModelImpl(this.name, this.db, pivotId)
    }

    async get(): Promise<Array<ModelImpl>>
    {
        const properties: Object = await this.owner.getField(this.propertyModelName)

        const models = Object.keys(properties).map((propertyId) => {
            return new ModelImpl(this.propertyModelName, this.db, propertyId)
        })

        return models
    }
}