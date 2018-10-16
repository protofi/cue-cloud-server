import Household from "./Models/Household";
import Sensor from "./Models/Sensor";
import Event from "./Models/Event";
import Room from "./Models/Room";
import User from "./Models/User";

export interface DataORM {
    user(): User
    household(): Household
    batch(): FirebaseFirestore.WriteBatch
}

export default class DataORMImpl implements DataORM{
    private db: any

    constructor(db: any)
    {
        this.db = db
    }

    batch(): FirebaseFirestore.WriteBatch
    {
        return this.db.batch()
    }

    user(): User
    {
        return new User(this.db) as User
    }

    household(): Household
    {
        return new Household(this.db) as Household
    }

    sensor(): Sensor
    {
        return new Sensor(this.db)
    }

    room(): Room
    {
        return new Room(this.db)
    }

    event(): Event
    {
        return new Event(this.db)
    }
}