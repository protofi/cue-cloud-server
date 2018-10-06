import Users from "./UsersCollection";
import Households from "./HouseholdsCollection";
import Sensors from "./SensersCollection";

export interface Datastore {
    users: Users
    households: Households
    sensors: Sensors
    batch(): FirebaseFirestore.WriteBatch
}

export default class Database implements Datastore {
    private db: any
    users: Users
    households: Households
    sensors: Sensors

    constructor(db: any)
    {
        this.db = db
        this.users = new Users(db);
        this.households = new Households(db)
        this.sensors = new Sensors(db)
    }
    
    batch(): FirebaseFirestore.WriteBatch
    {
        return this.db.batch()
    }
}