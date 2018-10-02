import CollectionsImpl, { Collection } from './Collections'

export default class HouseholdsCollection extends CollectionsImpl {
    name: string
    
    constructor(db: any)
    {
        super(Collection.HOUSEHOLDS, db)
    }
}