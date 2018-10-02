import CollectionsImpl, { Collection } from "./Collections";

export default class UsersCollection extends CollectionsImpl {
    name: string
    
    constructor(db: any)
    {
        super(Collection.USERS, db)
    }
}