import ModelImpl from "../Models";
import { Change } from 'firebase-functions'
import { get } from 'lodash';
import { singular } from 'pluralize'
import { Pivot } from "./Pivot";
import { asyncForEach } from "../../util";

export interface Relation {
   
    cache(id?: string): Promise<any>
}

export default class RelationImpl implements Relation{

    protected db: FirebaseFirestore.Firestore
    protected owner: ModelImpl
    protected propertyModelName: string

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
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
    attach(model: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<N2ManyRelation>
    updatePivot(propertyId: string, data: object): Promise<ModelImpl>
}

export class N2ManyRelation extends RelationImpl implements N2ManyRelation {
    
    protected properties: Set<ModelImpl>

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
    {
        super(owner, propertyModelName, db)
        this.properties = new Set<ModelImpl>()
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<N2ManyRelation>
    {
        this.properties.add(newPropModel)
        
        await this.owner.updateOrCreate({
            [this.propertyModelName] : {[await newPropModel.getId()] : true}
        }, transaction)

        return this
    }

     /**
     * Returns the attached property Models
     */
    async get(): Promise<Array<ModelImpl>>
    {
        const propertyIds: Array<string> = await this.getIds()

        const models = propertyIds.map((propertyId) => {
            return new ModelImpl(this.propertyModelName, this.db, null, propertyId)
        })

        return models
    }

    async getIds(): Promise<Array<string>>
    {
        const properties: Object = await this.owner.getField(this.propertyModelName)

        return Object.keys(properties)
    }
}

export class Many2ManyRelation extends N2ManyRelation {

    protected name: string

    protected cachedOnToPivot : Array<string>
    protected cacheFromPivot : Array<string>
    protected cacheOnToProperty : Array<string>

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
        const model = await import(`./../Models/${singular(this.propertyModelName)}`)
        const property = new model.default(this.propertyModelName, this.db, null, propertyId)

        const pivotId: string = await this.generatePivotId(propertyId)

        return new Pivot(this.db, pivotId, this.owner, property)
    }

    async updatePivot(propertyId: string, data: object): Promise<ModelImpl>
    {
        const pivotId: string = await this.generatePivotId(propertyId)

        return new ModelImpl(this.name, this.db, null, pivotId).update({
            pivot: data
        })
    }

    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<void>
    {
        const newCacheData = {}

        const beforeData = change.before.data()
        const afterData = change.after.data()

        const ownerId = await this.owner.getId()

        let changed = false

        if(this.cacheOnToProperty)
        {
            this.cacheOnToProperty.forEach((field) => {
                
                const fieldPath = field.replace('pivot', `${this.propertyModelName}.pivot`) // prepend relevant model name to pivot field path

                const cachableFieldBefore = get(beforeData, fieldPath) // retrieve data associated with the cached field before update
                const cachableFieldAfter  = get(afterData, fieldPath) // retrieve data associated with the cached field after update

                changed = (!(cachableFieldBefore === cachableFieldAfter) || changed) // check to see if changes have been made

                if(!cachableFieldAfter && !cachableFieldBefore) return //if the field havn't been updated return and do not include it in the data to be cached

                newCacheData[`${this.owner.name}.${ownerId}.${field}`] = cachableFieldAfter
            })

            const properties: Array<ModelImpl> = await this.get()

            if(!changed) return

            asyncForEach(properties,
                async (property: ModelImpl) => {
                    await property.update(newCacheData)
                }
            )
        }
        else if(this.cacheFromPivot)
        {
            const propertyIds: Array<string> = await this.getIds()

            this.cacheFromPivot.forEach((field) => {

                const fieldPath = `pivot.${field}`

                const cachableFieldBefore = get(beforeData, fieldPath) // retrieve data associated with the cached field before update
                const cachableFieldAfter  = get(afterData, fieldPath) // retrieve data associated with the cached field after update

                changed = (!(cachableFieldBefore === cachableFieldAfter) || changed) // check to see if changes have been made
                
                if(!cachableFieldAfter && !cachableFieldBefore) return //if the field havn't been updated return and do not include it in the data to be cached
                
                propertyIds.forEach((id) => {
                    newCacheData[`${this.propertyModelName}.${id}.pivot.${field}`] = cachableFieldAfter
                })
            })

            if(!changed) return

            await this.owner.update(newCacheData)
        }  
    }

    async attach(newPropModel: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<Many2ManyRelation>
    {
        await super.attach(newPropModel, transaction)
        
        const id: string = await this.generatePivotId(await newPropModel.getId())

        const pivotModel: ModelImpl = new ModelImpl(this.name, this.db, null, id)

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

    defineCachableFields(cachedToProperty: Array<string>, cachedFromPivot?: Array<string>, cachedToPivot?: Array<string>): Many2ManyRelation
    {
        this.cacheOnToProperty = cachedToProperty
        this.cacheFromPivot    = cachedFromPivot
        this.cachedOnToPivot    = cachedToPivot

        return this
    }
}

export class One2ManyRelation extends N2ManyRelation {

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
    {
        super(owner, propertyModelName, db)
    }

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

    async updatePivot(id: string, data: object)
    {
        const model: ModelImpl = new ModelImpl(this.propertyModelName, this.db, null, id)

        return model.update({
            [this.owner.name] : {
                pivot : data
            }
        })
    }
}

interface SimpleRelation {
    id: string
}

export class N2OneRelation extends RelationImpl {
    
    protected cacheFields: Array<string> = []

    constructor(owner: ModelImpl, propertyModelName: string, db: FirebaseFirestore.Firestore)
    {
        super(owner, propertyModelName, db)
    }

    defineCachableFields(cacheFields: Array<string>): void
    {
        this.cacheFields = cacheFields;
    }

     /**
     * Returns the attached property Model
     */
    async get(): Promise<ModelImpl>
    {
        const property: SimpleRelation = await this.owner.getField(this.propertyModelName) as SimpleRelation
        return new ModelImpl(this.propertyModelName, this.db, null, property.id)
    }

    async cache(): Promise<any>
    {
        return super.cache()
    }

    async updateCache(change: Change<FirebaseFirestore.DocumentSnapshot>): Promise<ModelImpl>
    {
        const newCacheData = {}

        const beforeData = change.before.data()
        const afterData = change.after.data()

        const ownerId = await this.owner.getId()

        let changed = false

        if(this.cacheFields)
        {
            this.cacheFields.forEach((field) => {
                
                const fieldPath = field.replace('pivot', `${this.propertyModelName}.pivot`) // prepend relevant model name to pivot field path

                const cachableFieldBefore = get(beforeData, fieldPath) // retrieve data associated with the cached field before update
                const cachableFieldAfter  = get(afterData, fieldPath) // retrieve data associated with the cached field after update

                changed = (!(cachableFieldBefore === cachableFieldAfter) || changed) // check to see if changes have been made

                if(!cachableFieldAfter && !cachableFieldBefore) return //if the field havn't been updated return and do not include it in the data to be cached

                newCacheData[`${this.owner.name}.${ownerId}.${field}`] = cachableFieldAfter
            })
        }

        const property: ModelImpl = await this.get()

        if(!changed) return property

        return property.update(newCacheData)
    }

    async set(model: ModelImpl, transaction?: FirebaseFirestore.WriteBatch | FirebaseFirestore.Transaction): Promise<ModelImpl>
    {   
        //only works for one to many relations
        const reverseRelation = model[this.owner.name]()
        await reverseRelation.attach(this.owner, transaction)

        return this.owner
    }

    async updatePivot(data: any)
    {
        return this.owner.update({
            [this.propertyModelName] : {
                pivot : data
            }
        })
    }
}