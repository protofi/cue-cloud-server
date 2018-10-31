import Household from "./Models/Household";
import Sensor from "./Models/Sensor";
import Event from "./Models/Event";
import Room from "./Models/Room";
import User from "./Models/User";

export interface DataORM {
    user(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): User
    household(): Household
    batch(): FirebaseFirestore.WriteBatch
}

export default class DataORMImpl implements DataORM{
    private db: FirebaseFirestore.Firestore

    constructor(db: FirebaseFirestore.Firestore)
    {
        this.db = db
    }

    batch(): FirebaseFirestore.WriteBatch
    {
        return this.db.batch()
    }

    user(snap?: FirebaseFirestore.DocumentSnapshot, id?: string): User
    {
        return new User(this.db, snap, id)
    }

    household(id?: string): Household
    {
        return new Household(this.db, null, id)
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