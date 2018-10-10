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
    attach(model: ModelImpl): Promise<RelationImpl>
}
export class N2ManyRelation extends RelationImpl implements N2ManyRelation {
    
    protected properties: Set<ModelImpl>

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        super(owner, propertyModelName, db)
        this.properties = new Set<ModelImpl>()
    }

    async attach(newPropModel: ModelImpl): Promise<RelationImpl>
    {
        this.properties.add(newPropModel)
        
        await this.owner.update({
            [this.propertyModelName] : {[await newPropModel.getId()] : true}
        })

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

    async attach(newPropModel: ModelImpl): Promise<RelationImpl>
    {
        await super.attach(newPropModel)
        
        const id: string = await this.generatePivotId(await newPropModel.getId())

        const pivotModel: ModelImpl = new ModelImpl(this.name, this.db, id)

        const pivotData = {
            [this.owner.name]           : { id : await this.owner.getId()},
            [this.propertyModelName]    : { id : await newPropModel.getId()}
        }

        await pivotModel.create(pivotData)

        await newPropModel.update({
            [this.owner.name] : {[await this.owner.getId()] : true}
        })

        return this
    }
}

export class One2ManyRelation extends N2ManyRelation {

    constructor(owner: ModelImpl, propertyModelName: string, db: any)
    {
        super(owner, propertyModelName, db)
    }

    async attach(newPropModel: ModelImpl): Promise<RelationImpl>
    {
        super.attach(newPropModel)

        await newPropModel.update({
            [this.owner.name] : {
                id : await this.owner.getId()
            }
        })

        return this
    }
}

export class One2OneRelation extends RelationImpl {
    
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
}