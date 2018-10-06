import CollectionsImpl, { Collection } from "./Collections";

export default class SensersCollection extends CollectionsImpl {
    name: string
    
    constructor(db: any)
    {
        super(Collection.SENSORS, db)
    }
}