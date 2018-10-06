import Users from "./UsersCollection";
import Households from "./HouseholdsCollection";

export interface Datastore {
    users: Users
    households: Households
    batch(): FirebaseFirestore.WriteBatch
}

export default class Database implements Datastore {
    private db: any
    users: Users
    households: Households

    constructor(db: any)
    {
        this.db = db
        this.users = new Users(db);
        this.households = new Households(db)
    }
    
    batch(): FirebaseFirestore.WriteBatch
    {
        return this.db.batch()
    }
}