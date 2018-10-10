import ModelImpl from "../Models";

export interface Relation {
    attach(model: ModelImpl): Promise<RelationImpl>
    get(): Promise<Array<ModelImpl>>
    cache(id?: string): Promise<any>
    pivot(id: string): Promise<ModelImpl>
}

export default class RelationImpl implements Relation{

    name: string
    private db: any
    private owner: ModelImpl
    private propertyModelName: string
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

        const pivotData = {
            [this.owner.name]           : { id : await this.owner.getId()},
            [this.propertyModelName]    : { id : await newPropModel.getId()}
        }

        await pivotModel.create(pivotData)

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

    async cache(id?: string): Promise<any>
    {
        const cache: any = await this.owner.getField(this.propertyModelName)
        if(id) return cache[id]
        return cache
    }
}