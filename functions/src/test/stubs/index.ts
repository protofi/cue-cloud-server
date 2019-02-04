import * as admin from 'firebase-admin'
import { unflatten, flatten } from 'flat'
import * as _ from 'lodash'
import * as uniqid from 'uniqid'
import ModelImpl from "../lib/ORM/Models";
import { IActionableFieldCommand, IModelCommand } from '../lib/Command';
import { ModelImportStategy } from "../lib/ORM/Relation";

export enum Stubs {
    CAR         = 'cars',
    WHEEL       = 'wheels',
    DRIVER      = 'drivers',
    WIND_SHEILD = 'windshield'
}

export interface OfflineDocumentSnapshot {
    data?: any
    ref?: any
    get?: any
}

export class OfflineDocumentSnapshotStub {
    
    public ref: Object = {
            id : uniqid(), 
            delete : (): void => { return }
        }
    private docData: Object = new Object()

    constructor(docSnap?: OfflineDocumentSnapshot)
    {
        if(!docSnap) return
        if(docSnap.data) this.docData = docSnap.data
        if(docSnap.ref) this.ref = docSnap.ref
    }

    data(): Object
    {
        return this.docData
    }

    async get(field): Promise<Object>
    {
        return this.docData[field]
    }
}

export class ActionableFieldCommandStub implements IActionableFieldCommand {
    async execute(owner: ModelImpl, field: string): Promise<void> {
        return
    }
    async undo(): Promise<void> {
        return
    }
}

export class ModelCommandStub implements IModelCommand {
    async execute(owner: ModelImpl): Promise<void> {
        return
    }
    async undo(): Promise<void> {
        return
    }
}

export class ModelImportStrategyStub implements ModelImportStategy{
    private path: string
    
    constructor(modulePath: string)
    {
        this.path = modulePath
    }
    async import(db_: FirebaseFirestore.Firestore, name: string, id: string): Promise<ModelImpl> {
        const model = await import(this.path)
        const property = new model.default(db_, null, id)
        return property
    }
}

export class FirestoreStub {

    private mockData = {}

    reset(): void
    {
        this.mockData = {}
    }

    data(): {}
    {
        return this.mockData
    }

    get(): any
    {
        return {
            settings: () => { return null },
            collection: (col: string) => {
                return {
                    doc: (id: string) => {
                        return {
                            id: (id) ? id : uniqid(),
                            set: (data: any, { merge }) => {

                                if(merge)
                                {
                                    this.mockData = _.merge(this.mockData, {
                                        [`${col}/${id}`] : unflatten(data)
                                    })
                                }
                                else this.mockData[`${col}/${id}`] = unflatten(data)

                                return null
                            },
                            get: () => {
                                return {
                                    get: (data: any) => {
                                        try{
                                            if(data)
                                                return this.mockData[`${col}/${id}`][data]
                                            else
                                                return this.mockData[`${col}/${id}`]
                                        }
                                        catch(e)
                                        {
                                            console.error(`Mock data is missing: ${e.message} [${`${col}/${id}`}]`)
                                            return undefined
                                        }
                                    },
                                    exists : (!_.isUndefined(this.mockData[`${col}/${id}`]))
                                }
                            },
                            update: (data: any) => {
                                
                                if(!this.mockData[`${col}/${id}`]) throw Error(`Mock data is missing: [${col}/${id}]`)

                                //Handle field deletion
                                const flattenData = flatten(data)
                                
                                _.forOwn(flattenData, (value, key) => {
                                    if(value !== admin.firestore.FieldValue.delete()) return
                                    _.unset(this.mockData[`${col}/${id}`], key)
                                    _.unset(data, key)
                                })

                                this.mockData = _.merge(this.mockData, {
                                    [`${col}/${id}`] : unflatten(data)
                                })

                                return null
                            },

                            delete: () => {
                                _.unset(this.mockData, `${col}/${id}`)
                            }
                        }
                    },
                    where: (field: string, operator: string, value: string) => {
                        return {
                            get: () => {

                                const docs: Array<Object> = new Array<Object>()

                                _.forOwn(this.mockData, (collection, path) => {

                                    if(!path.includes(col)) return

                                    if(!_.has(collection, field)) return
                                    
                                    if(_.get(collection, field) !== value) return

                                    docs.push(_.merge(this.mockData[path], {
                                        ref: {
                                            delete: () => {
                                                _.unset(this.mockData, path)
                                            }
                                        }
                                    }))
                                })

                                return docs
                            }
                        }
                    }
                }
            }
        }
    }
} 