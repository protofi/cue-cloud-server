import { Change } from "firebase-functions"
import { asyncForEach, difference } from "../../util"
import { Relations } from "../../const"
import { singular } from "pluralize"
import ModelImpl from "../Models"
import { Pivot } from "./Pivot"
import { get, capitalize, isEmpty } from "lodash"
import { IActionableFieldCommand } from "../../Command";

export interface ModelImportStategy {
    import(db: FirebaseFirestore.Firestore, name: string, id: string): Promise<ModelImpl>
}

export class StandardModelImport implements ModelImportStategy{
    async import(db: FirebaseFirestore.Firestore, name: string, id: string): Promise<ModelImpl>
    {
        const model = await import(`./../Models/${capitalize(singular(name))}`)
        const property = new model.default(db, null, id)
        return property
    }
}

interface AttachedData {
    owner?: any
    property?: any
}

interface AttachedDataBulk {
    owner?: any
    properties?: Array<any>
}

interface SimpleRelation {
    id: string
}

export interface Relation {
    cache(id?: string): Promise<any>
}

export default class RelationImpl implements Relation{

    protected db: FirebaseFirestore.Firestore
    protected owner: ModelImpl
    protected propertyModelName: string

    protected cacheOnToProperty: Array<string>
    protected actionableFields: Map<string, IActionableFieldCommand> = new Map<string, IActionableFieldCommand>()
    protected importStrategy: ModelImportStategy = new StandardModelImport()

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
    {
        this.db = db

        this.owner = owner 
        this.propertyModelName = propertyModelName
    }

    async cache(id?: string): Promise<Array<any> | any>
    {
        const cache: any = await this.owner.getField(this.propertyModelName)
        if(id) return cache[id]
        return cache
    }

    protected async getCacheFieldsToUpdateOnProperty(beforeData: FirebaseFirestore.DocumentData, afterData: FirebaseFirestore.DocumentData): Promise<any>
    {
        const newCacheData = {}
        const ownerId = await this.owner.getId()

        this.cacheOnToProperty.forEach((field) => {
                
            const fieldPath = field.replace(Relations.PIVOT, `${this.propertyModelName}.${Relations.PIVOT}`) // prepend relevant model name to pivot field path

            const cachableFieldBefore = get(beforeData, fieldPath, null) // retrieve data associated with the cached field before update
            const cachableFieldAfter  = get(afterData, fieldPath, null) // retrieve data associated with the cached field after update
            if(cachableFieldBefore === cachableFieldAfter) return //if the field have not been updated continue to next iteration and do not include it in the data to be cached

            newCacheData[`${this.owner.name}.${ownerId}.${field}`] = cachableFieldAfter
        })

        return newCacheData
    }
}

export interface IN2ManyRelation {

    get(): Promise<Array<ModelImpl>>
    attach(model: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedData): Promise<N2ManyRelation>
    updatePivot(propertyId: string, data: object): Promise<ModelImpl>
    attachBulk(propertyModels: Array<ModelImpl>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedData): Promise<void>
    attachById(propertyId: string, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedData): Promise<void>
    attachByIdBulk(propertyModelIds: Array<string>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedData): Promise<void>
    takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
}

export abstract class N2ManyRelation extends RelationImpl implements IN2ManyRelation {
    
    protected properties: Set<ModelImpl>

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
    {
        super(owner, propertyModelName, db)
        this.properties = new Set<ModelImpl>()
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedData): Promise<N2ManyRelation>
    {
        this.properties.add(newPropModel)
        
        const propertyId: string = await newPropModel.getId()

        const attachedPropertyData = (data && data.property) ? data.property : true

        await this.owner.updateOrCreate({
            [this.propertyModelName] : {
                [propertyId] : attachedPropertyData
            }
        }, transaction)

        return this
    }

    async attachBulk(propertyModels: Array<ModelImpl>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedDataBulk): Promise<void>
    {
        if(propertyModels.length < 1) return
        
        const propertyRelations: Object = {}

        propertyModels.forEach((propertyModel: ModelImpl, index: number) => {
            const propertyId: string = propertyModel.getId()

            const attachedPropertyData = (data && data.properties && data.properties[index]) ? data.properties[index] : true

            propertyRelations[propertyId] = attachedPropertyData
        })

        await this.owner.updateOrCreate({
            [this.propertyModelName] : propertyRelations
        }, transaction)

        return
    }

    async attachById(propertyId: string, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<void>
    {
        const property = await this.importStrategy.import(this.db, this.propertyModelName, propertyId)
        await this.attach(property, transaction)

        return
    }

    async attachByIdBulk(propertyModelIds: Array<string>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedDataBulk): Promise<void>
    {
        const models = Array<ModelImpl>()
        
        await asyncForEach(propertyModelIds, async (id) => {
            const model = await this.importStrategy.import(this.db, this.propertyModelName, id)
            models.push(model)
        })

        await this.attachBulk(models, transaction, data)

        return
    }

     /**
     * Returns the attached property Models
     */
    async get(): Promise<Array<ModelImpl>>
    {
        const propertyIds: Array<string> = await this.getIds()
        const models: Array<ModelImpl> = []

        await asyncForEach(propertyIds, async (id: string) => {
            models.push(await this.importStrategy.import(this.db, this.propertyModelName, id))
        })

        return models
    }

    async getIds(): Promise<Array<string>>
    {
        const properties: Object = await this.owner.getField(this.propertyModelName)

        if(!properties) return new Array()
        return Object.keys(properties)
    }

    abstract updatePivot(propertyId: string, data: object): Promise<ModelImpl>
    abstract takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
}

/**
 * Constitudes a Many-to-Many relationship between two models
 */
export class Many2ManyRelation extends N2ManyRelation {
    
    protected name: string

    protected cachedOnToPivot : Array<string>
    protected cacheFromPivot : Array<string>

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
    {
        super(owner, propertyModelName, db)
        this.name = [owner.name, propertyModelName].sort().join('_')
    }

    private async generatePivotId(id: string): Promise<string>
    {
        return  [{
                    name: this.propertyModelName,
                    id: id
                },{
                    name: this.owner.name,
                    id: await this.owner.getId()
                }].sort((A, B) => {
                    if (A.name < B.name) return -1
                    if (A.name > B.name) return 1
                    return 0 
                }).map((part) => {
                    return part.id
                }).join('_')
    }

    async pivot(propertyId: string): Promise<Pivot>
    {
        const property = await this.importStrategy.import(this.db, this.propertyModelName, propertyId)

        const pivotId: string = await this.generatePivotId(propertyId)

        return new Pivot(this.db, pivotId, this.owner, property)
    }

    async updatePivot(propertyId: string, data: object): Promise<ModelImpl>
    {
        const pivotId: string = await this.generatePivotId(propertyId)

        return new ModelImpl(this.name, this.db, null, pivotId).update({
            [Relations.PIVOT] : data
        })
    }

    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<void>
    {
        const beforeData: FirebaseFirestore.DocumentData = change.before.data()
        const afterData: FirebaseFirestore.DocumentData = change.after.data()

        if(this.cacheOnToProperty)
        {
            const newCacheData = await this.getCacheFieldsToUpdateOnProperty(beforeData, afterData)
            
            if(Object.keys(newCacheData).length > 0)
            {
                const properties: Array<ModelImpl> = await this.get()

                await asyncForEach(properties,
                    async (property: ModelImpl) => {
                        await property.update(newCacheData, transaction)
                    }
                )
            }
        }
        
        if(this.cacheFromPivot)
        {
            const newCacheData = {}

            const propertyIds: Array<string> = await this.getIds()

            this.cacheFromPivot.forEach((field) => {

                const fieldPath = `${Relations.PIVOT}.${field}`

                const cachableFieldBefore = get(beforeData, fieldPath, null) // retrieve data associated with the cached field before update
                const cachableFieldAfter  = get(afterData, fieldPath, null) // retrieve data associated with the cached field after update

                if(!cachableFieldAfter && !cachableFieldBefore) return // if the field havn't been updated return and do not include it in the data to be cached
                
                propertyIds.forEach((id) => {
                    newCacheData[`${this.propertyModelName}.${id}.${Relations.PIVOT}.${field}`] = cachableFieldAfter
                })
            })

            if(Object.keys(newCacheData).length > 0)
            {
                await this.owner.update(newCacheData)
            }
        }
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedData): Promise<Many2ManyRelation>
    {
        await super.attach(newPropModel, transaction, data)
        
        const id: string = await this.generatePivotId(await newPropModel.getId())

        const pivotModel: ModelImpl = new ModelImpl(this.name, this.db, null, id)

        const pivotData = {
            [this.owner.name]           : { id : await this.owner.getId() },
            [this.propertyModelName]    : { id : await newPropModel.getId() }
        }

        await pivotModel.updateOrCreate(pivotData, transaction)

        const attachedOwnerData = (data && data.owner) ? data.owner : true

        await newPropModel.updateOrCreate({
            [this.owner.name] : {
                [await this.owner.getId()] : attachedOwnerData
            }
        }, transaction)

        return this
    }

    async attachBulk(newPropertyModels: Array<ModelImpl>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction, data?: AttachedDataBulk): Promise<void>
    {
        await super.attachBulk(newPropertyModels, transaction, data)

        await asyncForEach(newPropertyModels, async (newPropModel) => {

            const id: string = await this.generatePivotId(await newPropModel.getId())

            const pivotModel: ModelImpl = new ModelImpl(this.name, this.db, null, id)
            
            const pivotData = {
                [this.owner.name]           : { id : await this.owner.getId() },
                [this.propertyModelName]    : { id : await newPropModel.getId() }
            }

            await pivotModel.updateOrCreate(pivotData, transaction)

            const attachedOwnerData = (data && data.owner) ? data.owner : true

            await newPropModel.updateOrCreate({
                [this.owner.name] : { [await this.owner.getId()] : attachedOwnerData }
            }, transaction)
        })
        
        return
    }

    defineCachableFields(cachedOnToProperty: Array<string>, cachedFromPivot?: Array<string>): Many2ManyRelation
    {
        this.cacheOnToProperty = cachedOnToProperty
        this.cacheFromPivot    = cachedFromPivot

        return this
    }

    defineActionableField(field: string, command: IActionableFieldCommand): Many2ManyRelation
    {
        this.actionableFields.set(field, command)
        return this
    }

    async takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

/**
 * Constitudes a One-to-Many relationship between two models
 */
export class One2ManyRelation extends N2ManyRelation {

    protected onUpdateAction: IActionableFieldCommand

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<One2ManyRelation>
    {
        await super.attach(newPropModel, transaction)

        await newPropModel.updateOrCreate({
            [this.owner.name] : {
                id : await this.owner.getId()
            }
        }, transaction)

        return this
    }

    async attachBulk(propertyModels: Array<ModelImpl>, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<void>
    {
        await super.attachBulk(propertyModels, transaction)

        await asyncForEach(propertyModels, async (propertyModel: ModelImpl) => {
            await propertyModel.updateOrCreate({
                [this.owner.name] : {
                    id : this.owner.getId()
                }
            }, transaction)
        })
    }

    async updatePivot(id: string, data: object)
    {
        const model: ModelImpl = new ModelImpl(this.propertyModelName, this.db, null, id)

        return model.update({
            [this.owner.name] : {
                [Relations.PIVOT] : data
            }
        })
    }

    defineActionOnUpdate(command: IActionableFieldCommand): One2ManyRelation
    {
        this.onUpdateAction = command
        return this
    }

    async takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void> {
        
        if(!this.onUpdateAction) return

        const beforeRelLinkData = change.before.get(this.propertyModelName)
        const afterRelLinkData = change.after.get(this.propertyModelName)

        if(!afterRelLinkData) return

        const relLinkChanges = (beforeRelLinkData) ? difference(beforeRelLinkData, afterRelLinkData) : afterRelLinkData

        if(isEmpty(relLinkChanges)) return

        return this.onUpdateAction.execute(this.owner, relLinkChanges)
    }
}

/**
 * Constidues a reverse One-to-Many relationship between to models 
 */
export class N2OneRelation extends RelationImpl {
    
    protected cacheOnToProperty: Array<string> = new Array<string>()

    defineCachableFields(cacheOnToProperty: Array<string>): N2OneRelation
    {
        this.cacheOnToProperty = cacheOnToProperty
        return this
    }

    defineActionableField(field: string, command: IActionableFieldCommand): N2OneRelation
    {
        this.actionableFields.set(field, command)
        return this
    }

    async takeActionOn(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    {
        const pivotPath = `${this.propertyModelName}.${Relations.PIVOT}`

        const beforePivotData = change.before.get(pivotPath)
        const afterPivotData = change.after.get(pivotPath)
        
        if(!afterPivotData) return
        
        const pivotDataChanges = (beforePivotData) ? difference(beforePivotData, afterPivotData) : afterPivotData

        await asyncForEach(Object.keys(pivotDataChanges),
            async (field) => {

                const action: IActionableFieldCommand = this.actionableFields.get(field)
                if(action) await action.execute(this.owner, pivotDataChanges[field])

                return
        })
    }

     /**
     * Returns the attached property Model
     */
    async get(): Promise<ModelImpl>
    {
        const property = await this.owner.getField(this.propertyModelName) as SimpleRelation
        if(!property) return null
        return new ModelImpl(this.propertyModelName, this.db, null, property.id)
    }

    async getPivotField(field: string): Promise<any> 
    {
        const pivotFields = await this.owner.getField(this.propertyModelName)

        if(!pivotFields) return null

        return get(pivotFields, `${Relations.PIVOT}.${field}`, null)
    }

    async cache(): Promise<any>
    {
        return super.cache()
    }

    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<ModelImpl>
    {
        const beforeData: FirebaseFirestore.DocumentData = change.before.data()
        const afterData: FirebaseFirestore.DocumentData = change.after.data()

        const newCacheData = await this.getCacheFieldsToUpdateOnProperty(beforeData, afterData)

        const property: ModelImpl = await this.get()

        if(!property) return null

        if(!(Object.keys(newCacheData).length > 0)) return property

        return property.update(newCacheData)
    }

    async set(model: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {   
        //only works for one to many relations
        const reverseRelation = model[this.owner.name]()
        await reverseRelation.attach(this.owner, transaction)

        return this.owner
    }

    async updatePivot(data: any): Promise<ModelImpl>
    {
        return this.owner.update({
            [this.propertyModelName] : {
                [Relations.PIVOT] : data
            }
        })
    }
}

export class One2OneRelation extends One2ManyRelation {

    async updatePivot(data: any): Promise<ModelImpl>
    {
        throw new Error("Method not implemented.");
        // return this.owner.update({
        //     [this.propertyModelName] : {
        //         [Relations.PIVOT] : data
        //     }
        // })
    }
}