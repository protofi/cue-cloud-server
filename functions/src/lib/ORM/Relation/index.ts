import ModelImpl from "../Models";

export interface Relation {
   
    cache(id?: string): Promise<any>
}

export default class RelationImpl implements Relation{

    protected db: any
    protected owner: ModelImpl
    protected propertyModelName: string

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        this.db = db

        this.owner = owner
        this.propertyModelName = propertyModelName
    }

    async cache(id?: string): Promise<any>
    {
        const cache: any = await this.owner.getField(this.propertyModelName)
        if(id) return cache[id]
        return cache
    }
}

export interface N2ManyRelation {
    
    get(): Promise<Array<ModelImpl>>
    attach(model: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<RelationImpl>
}
export class N2ManyRelation extends RelationImpl implements N2ManyRelation {
    
    protected properties: Set<ModelImpl>

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        super(owner, propertyModelName, db)
        this.properties = new Set<ModelImpl>()
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<RelationImpl>
    {
        this.properties.add(newPropModel)
        
        await this.owner.updateOrCreate({
            [this.propertyModelName] : {[await newPropModel.getId()] : true}
        }, transaction)

        return this
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
export class Many2ManyRelation extends N2ManyRelation {
    protected name: string

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        super(owner, propertyModelName, db)
        this.name = [owner.name, propertyModelName].sort().join('_')
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

    async pivot(id: string): Promise<ModelImpl>
    {
        const pivotId: string = await this.generatePivotId(id)
        return new ModelImpl(this.name, this.db, pivotId)
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<RelationImpl>
    {
        await super.attach(newPropModel, transaction)
        
        const id: string = await this.generatePivotId(await newPropModel.getId())

        const pivotModel: ModelImpl = new ModelImpl(this.name, this.db, id)

        const pivotData = {
            [this.owner.name]           : { id : await this.owner.getId()},
            [this.propertyModelName]    : { id : await newPropModel.getId()}
        }

        await pivotModel.updateOrCreate(pivotData)

        await newPropModel.updateOrCreate({
            [this.owner.name] : {[await this.owner.getId()] : true}
        }, transaction)

        return this
    }
}

export class One2ManyRelation extends N2ManyRelation {

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        super(owner, propertyModelName, db)
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<RelationImpl>
    {
        await super.attach(newPropModel, transaction)

        await newPropModel.updateOrCreate({
            [this.owner.name] : {
                id : await this.owner.getId()
            }
        }, transaction)

        return this
    }
}

export class N2OneRelation extends RelationImpl {
    
    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        super(owner, propertyModelName, db)
    }

    async get(): Promise<ModelImpl>
    {
        const property: any = await this.owner.getField(this.propertyModelName)
        return new ModelImpl(this.propertyModelName, this.db, property.id)
    }

    async cache(): Promise<any>
    {
        return super.cache()
    }

    async set(model: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {   
        //only works for one to many relations
        const reverseRelation = model[this.owner.name]()
        await reverseRelation.attach(this.owner, transaction)

        return this.owner
    }
}